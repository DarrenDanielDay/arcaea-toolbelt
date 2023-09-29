import { Difficulty } from "../../models/music-play";
import { CachedHttpGetClient } from "../../services/cache";
import { groupBy } from "../../utils/collections";
import { concurrently } from "../../utils/concurrent";
import { SongList } from "../packed-data";
import { findParentWhere, htmlDocument, initPageDocument } from "../wiki-util";
import { ChartNotesAndConstant, ExtraSongData, getLastNotesAndConstantsData, matchDuplicatedName } from "./shared";

const fandomClient = new CachedHttpGetClient("fandom-wiki-cache", 1);

function fatal(msg: string, ...data: any[]): never {
  const error = new Error(`Fandom Wiki spider: ${msg}`);
  if (data?.length) {
    console.error(data, error);
  } else {
    console.error(error);
  }
  throw error;
}

function omitQuery(input: string | URL) {
  const url = new URL(input);
  for (const [key, value] of [...url.searchParams.entries()]) {
    url.searchParams.delete(key, value);
  }
  return url.href;
}

const SPECIAL_CHARS: { [char: string]: string } = {
  έ: "e",
  ó: "o",
  µ: "μ",
  κ: "k",
  "～": "~",
};

function normalizeTitle(text: string) {
  return [...text]
    .map((c) => SPECIAL_CHARS[c] ?? c)
    .filter((x) => !/\s/.test(x))
    .join("");
}

async function getWikiSongsTable() {
  await initPageDocument("https://arcaea.fandom.com/wiki/Songs_by_Date", fandomClient);
  const table = htmlDocument.querySelector("table.songbydate-table");
  if (!(table instanceof HTMLTableElement)) {
    return fatal("总表未找到");
  }
  function processRow(tr: HTMLTableRowElement) {
    const [covers, name, , pst, prs, ftr, byd] = Array.from(tr.cells);
    function processLevel(cell: HTMLTableCellElement) {
      const textContent = cell.textContent;
      return textContent ? textContent.trim() : null;
    }
    const nameLink = name!.querySelector("a")!;
    return {
      covers: Array.from(covers!.querySelectorAll("img"), (img) => omitQuery(img.src)),
      name: normalizeTitle(nameLink.textContent!.trim()),
      link: omitQuery(nameLink.href),
      difficulties: [pst, prs, ftr, byd].map((cell) => processLevel(cell!)),
    };
  }
  return Array.from(table.tBodies[0]!.rows)
    .slice(1) // 去掉表头
    .map((tr, i) => {
      try {
        return processRow(tr);
      } catch (error) {
        return fatal(`曲目列表处理行${i}时出错`, error);
      }
    })
    .filter((d) => d.name !== "Last"); // 排除特殊曲目Last
}

export async function getChartDataFromFandomWiki(songList: SongList): Promise<ExtraSongData[]> {
  const enNameGroup = groupBy(songList.songs, (s) => normalizeTitle(s.title_localized.en));
  const zhNameGroup = groupBy(songList.songs, (s) => normalizeTitle(s.title_localized["zh-Hans"] ?? "no special char"));
  Object.assign(window, { enNameGroup, zhNameGroup });
  const songs = await getWikiSongsTable();
  type SongsTableItem = (typeof songs)[number];
  async function getOneSongData(item: SongsTableItem) {
    await initPageDocument(item.link, fandomClient);
    return processPage(item, htmlDocument);
  }
  function getMobileData(text: string): number {
    const num = +text;
    if (isNaN(num)) {
      const pattern = /Touch:\s*(\d+)\s*\|\s*Joycon:\s*(\d+)/g;
      const match = pattern.exec(text);
      if (match) {
        const [, touch] = match;
        return +touch!;
      } else {
        return fatal(`无法匹配移动端数据`, text);
      }
    }
    return num;
  }
  const difficulties = Object.values(Difficulty);
  function processPage(item: SongsTableItem, document: Document): ExtraSongData {
    const songListSong =
      matchDuplicatedName(enNameGroup[item.name] ?? [], item.difficulties) ||
      matchDuplicatedName(zhNameGroup[item.name] ?? [], item.difficulties);
    if (!songListSong) return fatal("未匹配song list项目", item);
    const songData: ExtraSongData = {
      id: songListSong.id,
      charts: [],
    };
    const ths = Array.from(document.querySelectorAll("th"));
    const constantHeaders = ths.filter((th) => th.textContent?.trim() === "Chart Constant");
    const notesHeaders = ths.filter((th) => th.textContent?.trim() === "Notes");
    function findData(difficulty: Difficulty, th: HTMLTableCellElement) {
      const table = findParentWhere(th, (el): el is HTMLTableElement => el instanceof HTMLTableElement);
      if (!table) return null;
      const index = Array.from(th.parentElement!.children).indexOf(th);
      if (!(index >= 0)) {
        return null;
      }
      return (
        Array.from(table.querySelectorAll(`td:nth-child(${index + 1}) span`))
          .find((el) => el.matches(`span.${difficulty}`))
          ?.textContent?.trim() || null
      );
    }
    for (const [i, difficulty] of difficulties.entries()) {
      let constant = -1,
        notes = -1;
      const chartInfo = songListSong.difficulties[i];
      for (const constantHeader of constantHeaders) {
        const data = findData(difficulty, constantHeader);
        if (data) {
          constant = getMobileData(data);
        }
      }
      for (const notesHeader of notesHeaders) {
        const data = findData(difficulty, notesHeader);
        if (data) {
          notes = getMobileData(data);
        }
      }
      const chart: ChartNotesAndConstant = {
        notes,
        constant,
      };
      songData.charts[i] = chartInfo ? chart : null;
    }
    return songData;
  }
  const result = await concurrently(songs, (item) => getOneSongData(item), 6);
  return result.concat(getLastNotesAndConstantsData());
}
