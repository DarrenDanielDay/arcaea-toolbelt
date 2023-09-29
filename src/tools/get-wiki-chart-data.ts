import { Chart, ChartOverride, Difficulty, SongData } from "../models/music-play";
import { groupBy, indexBy } from "../utils/collections";
import { concurrently } from "../utils/concurrent";
import { Pack, PackList, Song, SongList } from "./packed-data";
import { wikiURL, initPageDocument, htmlDocument, prepareDocument, arcaeaCNClient } from "./wiki-util";

const wikiConstantTable = wikiURL("定数详表");

interface ConstantChartData {
  name: string;
  pst: number;
  prs: number;
  ftr: number;
  byd: number | null;
  link: string;
}
/**
 * 从wiki爬数据的主要出于使用wiki上曲绘的考虑
 */
async function getWikiChartTable() {
  await initPageDocument(wikiConstantTable, arcaeaCNClient);
  const constantTableEl = htmlDocument.querySelector("table")!;
  type TD = HTMLTableCellElement;
  function checkCells(cells: TD[]): asserts cells is [TD, TD, TD, TD, TD] {
    if (cells.length !== 5) {
      throw new Error("wiki定数详表格式改变");
    }
  }

  const songs: ConstantChartData[] = [];
  for (let i = 1, rows = constantTableEl.rows, l = rows.length; i < l; i++) {
    const row = rows[i]!;
    const cells = Array.from(row.cells);
    checkCells(cells);
    const [name, past, present, future, beyond] = cells;
    const songName = name.textContent!.trim();
    // Last一系列比较特殊，跳过
    if (songName === "Last" || songName === "Last | Eternity") {
      continue;
    }
    songs.push({
      name: songName,
      pst: +past.textContent!,
      prs: +present.textContent!,
      ftr: +future.textContent!,
      byd: beyond.textContent!.trim() ? +beyond.textContent! : null,
      link: new URL(name.querySelector("a")!.href).pathname,
    });
  }
  return songs;
}

async function getArcInfData() {
  const res = await fetch(
    "https://ghproxy.com/raw.githubusercontent.com/Arcaea-Infinity/ArcaeaSongDatabase/main/arcsong.json"
  );
  type ArcInfChartData = {
    name_en: string;
    /**
     * 曲包名
     */
    set_friendly: string;
    /**
     * 定数的十倍
     */
    rating: number;
  };

  type ArcInfSongData = {
    song_id: string;
    alias: string[];
    difficulties: ArcInfChartData[];
  };

  const arcInfinityData: ArcInfSongData[] = (await res.json()).songs;
  const indexed = arcInfinityData.reduce<{ [name: string]: ArcInfSongData[] }>((map, song) => {
    const chart = song.difficulties[0]!;
    const songName = chart.name_en;
    if (map[songName]) {
      console.log(`重名歌曲：${songName}`);
    }
    const songs: ArcInfSongData[] = (map[songName] ??= []);
    songs.push(song);
    return map;
  }, {});
  return {
    getSong(name: string, { pst, prs, ftr, byd }: ConstantChartData): ArcInfSongData | null {
      const songs = indexed[name];
      if (!songs) {
        console.error(`曲目 ${name} 在Arcaea Infinity内未找到`);
        return null;
      }
      if (songs.length === 1) {
        return songs[0]!;
      }
      // 重名曲目，看谱面定数区分
      const song = songs.filter((song) =>
        [pst, prs, ftr, byd].every((c, i) => {
          if (c == null) {
            return true;
          }
          const difficulty = song.difficulties[i];
          if (!difficulty) {
            console.error(`${name} ${[pst, prs, ftr, byd]} 没有难度 ${i}`);
            return null;
          }
          // 浮点误差
          return Math.abs(difficulty.rating / 10 - c) < 0.01;
        })
      );

      if (song.length !== 1) {
        console.error(`这都能重复，没救了`);
        return null;
      }
      return song[0]!;
    },
    raw: arcInfinityData,
  };
}

function getWikiTableItemsByLabel(label: Element) {
  const nodes: Element[] = [];
  for (let node = label.nextElementSibling; node && !node.matches(".label"); node = node.nextElementSibling) {
    nodes.push(node);
  }
  return nodes;
}

export async function getSongData(songList: SongList, packList: PackList): Promise<SongData[]> {
  const songs = await getWikiChartTable();
  const songGroup = groupBy(songList.songs, (s) => s.title_localized.en.trim());
  const packIndex = indexBy(packList.packs, (p) => p.id);
  const getPackName = (song: Song) => {
    const pack = packIndex[song.set];
    if (pack) {
      const segments: string[] = [];
      for (let p: Pack | undefined = pack; p; p = p.pack_parent ? packIndex[p.pack_parent] : undefined) {
        segments.push(p.name_localized.en);
      }
      return segments.reverse().join(" - ");
    }
    return "Memory Archive";
  };
  const arcInf = await getArcInfData();
  const difficulties = [Difficulty.Past, Difficulty.Present, Difficulty.Future];
  const withByd = difficulties.concat([Difficulty.Beyond]);
  const getOneSong = async (song: ConstantChartData) => {
    const { name, link, byd } = song;
    const arcInfSong = arcInf.getSong(name, song);
    const detailPageURL = wikiURL(link);
    const content = await arcaeaCNClient.fetch(detailPageURL).then((res) => res.text());
    prepareDocument(content, detailPageURL);
    const tabs = Array.from(htmlDocument.querySelectorAll("#right-image #tab-b .img-tab-part"));
    const imgs = Array.from(htmlDocument.querySelectorAll("#right-image img"));
    const normal = tabs.length
      ? imgs[tabs.findIndex((tab) => tab.classList.contains("ftr") || tab.classList.contains("normal"))]
      : imgs[0];
    if (tabs.length) {
      console.log(`特殊曲绘列表： ${name} ${tabs.map((tab) => tab.textContent).join(" ")}`);
    }
    if (!normal) {
      console.error(`${name} 曲绘未找到`);
    }
    const cover = normal ? wikiURL(normal.src).toString() : "";
    const labels = Array.from(htmlDocument.querySelectorAll("div#mw-content-text div.label"));
    const noteLabel = labels.find((label) => label.textContent!.match(/^note/i));
    const noteItems = noteLabel ? getWikiTableItemsByLabel(noteLabel) : [];
    const notes: number[] = noteItems.map((el) => {
      const note = +el.textContent!;
      if (isNaN(note) && el.textContent?.trim() !== "空") {
        return -1;
      }
      return note;
    });
    const group = songGroup[name];
    if (!group) {
      throw new Error(`song list内曲目${name}不存在`);
    }
    const songListSong =
      group.length === 1
        ? group[0]!
        : group.find((s) =>
            difficulties.every((d, i) => {
              const chart = s.difficulties[i];
              const constant = song[d] || 0;
              const level = Math.floor(constant);
              const isPlus = level >= 9 && Math.round(constant * 10) - level * 10 >= 7;
              const match = (chart?.rating ?? 0) === level && !!chart?.ratingPlus === isPlus;
              return match;
            })
          );
    if (!songListSong) {
      throw new Error(`song list内未找到${name}`);
    }
    const { id: songId, bpm } = songListSong;
    const charts = (byd ? withByd : difficulties).map<Chart>((difficulty, i) => {
      const constant = song[difficulty];
      if (!constant) {
        throw new Error(`${name} byd 定数缺失`);
      }
      const songListChart = songListSong.difficulties[i]!;
      const chart: Chart = {
        constant,
        difficulty,
        id: `${songId}@${difficulty}`,
        level: songListChart.rating,
        note: notes[i] || -1,
        songId,
      };
      if (songListChart.ratingPlus) {
        chart.plus = true;
      }
      const override: ChartOverride = {};
      if (songListChart.jacketOverride) {
        override.cover = true;
      }
      if (songListChart.title_localized) {
        override.name = songListChart.title_localized.en;
      }
      if (difficulty !== Difficulty.Future && override.cover) {
        const notFTRCover = imgs[tabs.findIndex((tab) => tab.classList.contains(difficulty))];
        if (notFTRCover) {
          override.url = wikiURL(notFTRCover.src).toString();
        } else {
          console.error(`特殊封面 ${name} ${difficulty} 未匹配`);
          override.url = "";
        }
      }
      if (Object.keys(override).length) {
        chart.override = override;
      }
      return chart;
    });
    /*
    if (byd) {
      const addon: BeyondAddon = {};
      if (beyond) {
        addon.cover = wikiURL(beyond.src).toString();
      }
      const bydDifficulty = songListSong.difficulties[3];
      if (!bydDifficulty) {
        throw new Error(`song list的数据不包含 ${name} 的byd谱`);
      }
      const name_en = bydDifficulty.title_localized?.en;
      if (name_en && name_en !== name) {
        addon.song = name_en;
      }
      const bydChart: Chart = {
        constant: byd,
        difficulty: Difficulty.Beyond,
        id: `${songId}@${Difficulty.Beyond}`,
        level: levels[3]!,
        note: notes[3]!,
        songId,
        byd: addon,
      };
      charts.push(bydChart);
    }
    */
    const songData: SongData = {
      bpm,
      cover,
      id: songId,
      name,
      pack: getPackName(songListSong),
      dl: !!songListSong.remote_dl,
      alias: arcInfSong?.alias ?? [],
      charts,
    };
    return songData;
  };
  const songsData = await concurrently(
    songs,
    async (song) => {
      try {
        return await getOneSong(song);
      } catch (error) {
        console.error(`获取${song.name}信息失败`, error);
        throw error;
      }
    },
    6
  );
  (() => {
    // Last比较特殊，有五个谱面，两个byd难度和三个曲绘，直接作为固定内容处理
    const song: Partial<Record<Difficulty, number>> = {
      pst: 4.0,
      prs: 7.0,
      ftr: 9.0,
    };
    const notes = [680, 781, 831];
    const levels = [4, 7, 9];
    const last = "last";
    const lasteternity = "lasteternity";
    const pack = "Silent Answer";
    songsData.push({
      bpm: "175",
      cover: wikiURL("/images/thumb/a/a2/Songs_last.jpg/256px-Songs_last.jpg").toString(),
      id: last,
      name: "Last",
      pack,
      dl: true,
      alias: arcInf.raw.find((s) => s.song_id === last)!.alias,
      charts: difficulties
        .map<Chart>((difficulty, i) => ({
          constant: song[difficulty]!,
          difficulty,
          id: `${last}@${difficulty}`,
          level: levels[i]!,
          note: notes[i]!,
          songId: last,
        }))
        .concat([
          {
            id: `${last}@${Difficulty.Beyond}`,
            constant: 9.6,
            difficulty: Difficulty.Beyond,
            level: 9,
            note: 888,
            songId: last,
            override: {
              cover: true,
              name: `Last | Moment`,
              url: wikiURL("/images/thumb/1/1e/Songs_last_byd.jpg/256px-Songs_last_byd.jpg").toString(),
            },
          },
        ]),
    });
    songsData.push({
      bpm: "175",
      cover: wikiURL("/images/thumb/9/92/Songs_lasteternity.jpg/256px-Songs_lasteternity.jpg").toString(),
      id: lasteternity,
      name: "Last | Eternity",
      pack,
      dl: true,
      alias: arcInf.raw.find((s) => s.song_id === lasteternity)!.alias,
      charts: [
        {
          id: `${lasteternity}@${Difficulty.Beyond}`,
          constant: 9.7,
          difficulty: Difficulty.Beyond,
          level: 9,
          plus: true,
          note: 790,
          songId: lasteternity,
        },
      ],
    });
  })();
  return songsData;
}
