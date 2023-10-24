import { SongData } from "../models/music-play";
import {
  ChapterData,
  MapPlatformData,
  NormalWorldMapData,
  PlatformType,
  RewardType,
} from "../models/world-mode";
import { CharacterData } from "../models/character";
import { arcaeaCNClient, findNextElWhere, findParentWhere, htmlDocument, initPageDocument, wikiURL } from "./wiki-util";

const wikiLongtermWorldMapTable = wikiURL("世界模式地图详表 (移动版常驻)");
const wikiEventWorldMapTable = wikiURL("世界模式地图详表_(移动版限时活动)");

interface WikiWorldMapTableItem {
  id: string;
  title: string;
}

interface WikiChapterData {
  name: string;
  maps: WikiWorldMapTableItem[];
}

function getMapTableItem(link: HTMLAnchorElement): WikiWorldMapTableItem {
  return {
    id: link.getAttribute("href")!.slice(1),
    title: link.textContent!,
  };
}

async function getWikiLontermWorldMapTable() {
  await initPageDocument(wikiLongtermWorldMapTable, arcaeaCNClient);
  const table = htmlDocument.querySelector("table.wikitable")!;
  // 排除byd章节
  const headers = Array.from(table.querySelectorAll("th")).slice(2, -1);
  const chapters: WikiChapterData[] = [];
  for (const th of headers) {
    const firstRow = th.parentElement;
    if (!(firstRow instanceof HTMLTableRowElement)) {
      throw new Error("父节点不是tr元素");
    }
    const chapter: WikiChapterData = {
      maps: [],
      name: th.textContent!.trim(),
    };
    chapters.push(chapter);
    for (
      let i = 0, rows = th.rowSpan, row = firstRow;
      i < rows;
      i++, row.nextElementSibling instanceof HTMLTableRowElement && (row = row.nextElementSibling)
    ) {
      for (const cell of Array.from(row.cells)) {
        if (cell.tagName.toLowerCase() === "th") {
          continue;
        }
        const link = cell.querySelector("a");
        if (!link) {
          continue;
        }
        chapter.maps.push(getMapTableItem(link));
      }
    }
  }
  return chapters;
}

async function getWikiEventWorldMapTable(): Promise<WikiWorldMapTableItem[]> {
  await initPageDocument(wikiEventWorldMapTable, arcaeaCNClient);
  const table = htmlDocument.querySelector("table.wikitable")!;
  return Array.from(table.querySelectorAll("td a"), (a) => getMapTableItem(a));
}

interface MainTableInfo {
  currentEvents: { id: string; expire: number }[];
}

async function getMainTableInfo(): Promise<MainTableInfo> {
  await initPageDocument(wikiURL("世界模式"), arcaeaCNClient);
  const extra = htmlDocument.querySelector("#extra");
  if (!extra) throw new Error("事件章节未找到");
  const h3 = findParentWhere(extra, (el): el is HTMLHeadingElement => el instanceof HTMLHeadingElement);
  if (!h3) throw new Error("事件章节h3标题未找到");
  const table = findNextElWhere(
    h3,
    (el): el is HTMLTableElement => el instanceof HTMLTableElement && el.tBodies[0]?.rows[0]?.cells.length === 5
  );
  if (!table) throw new Error("当前事件表格未找到");
  const currentEvents = Array.from(table.rows)
    .slice(1)
    .map<MainTableInfo["currentEvents"][number]>((row) => {
      const [name, , , , time] = Array.from(row.cells);
      if (!name || !time) throw new Error("表格格式改变");
      const rawId = decodeURI(new URL(name.querySelector("a")!.href).hash.slice(1));
      const id = rawId.includes('限时') ? rawId : `限时：${rawId}`;
      const match = /(\d+)\/(\d+)\/(\d+)[^0-9\/]((\d+)\/)?(\d+)\/(\d+)/.exec(time.textContent!.trim());
      if (!match) throw new Error("时间格式未匹配");
      let [, startYear, , , , endYear, endMonth, endDay] = match;
      endYear ??= startYear;
      if (!endYear || !endMonth || !endDay) throw new Error("时间格式未匹配");
      const expireDate = new Date();
      expireDate.setFullYear(+endYear);
      expireDate.setMonth(+endMonth - 1);
      expireDate.setDate(+endDay);
      expireDate.setHours(23);
      expireDate.setMinutes(0);
      expireDate.setSeconds(0);
      expireDate.setMilliseconds(0);
      return {
        id,
        expire: +expireDate,
      };
    });
  return {
    currentEvents,
  };
}

function getWorldMap(
  doc: Document,
  map: WikiWorldMapTableItem,
  backgrounds: Backgrounds,
  songs: SongData[],
  characters: CharacterData[]
): NormalWorldMapData {
  const anchor = doc.getElementById(map.id)!;
  const table = findNextElWhere(anchor.parentElement!, (el) => el.matches("table"));
  if (!(table instanceof HTMLTableElement)) {
    throw new Error(`表格 ${map.title} 未找到`);
  }
  const platforms: MapPlatformData[] = [];
  const result: NormalWorldMapData = {
    id: map.id,
    platforms,
  };
  for (const tbody of Array.from(table.tBodies)) {
    for (const row of Array.from(tbody.rows)) {
      const level = +row.cells[0]!.textContent!;
      if (!level) {
        continue;
      }
      const step = row.cells[1]!;
      const special = row.cells[2]!;
      const reward = row.cells[3]!;
      const platform: MapPlatformData = {
        length: parseFloat(step.textContent!),
      };
      const specialText = special.textContent!.trim();
      if (specialText && specialText !== "-") {
        switch (true) {
          case specialText.startsWith("限制"):
            {
              const links = Array.from(special.querySelectorAll("a"));
              platform.special = {
                type: PlatformType.Restriction,
                range: links.length === 1 ? links[0]!.textContent! : links.map((link) => link.textContent!),
              };
            }
            break;
          case specialText.startsWith("随机"):
            {
              const links = Array.from(special.querySelectorAll("a"));
              platform.special = {
                type: PlatformType.Random,
                range: links.length === 1 ? links[0]!.textContent! : links.map((link) => link.textContent!),
              };
            }
            break;
          case specialText.includes("限速"):
            {
              platform.special = {
                type: PlatformType.FixedSpeed,
                max: parseFloat(specialText.slice(specialText.indexOf("≤") + 1)),
              };
            }
            break;
          case specialText.includes("体力"):
            {
              platform.special = {
                type: PlatformType.Stamina,
                count: parseInt(specialText),
              };
            }
            break;
          default:
            throw new Error(`未知特殊格： ${specialText}`);
        }
      }
      const rewardText = reward.textContent!.trim();
      if (rewardText && rewardText !== "-") {
        const links = reward.querySelectorAll("a");
        if (links.length > 1) {
          throw new Error(`超过一个链接`);
        }
        if (links.length) {
          const link = links[0]!;
          let linkText = link.textContent!.trim();
          if (linkText === "咲弥 & 伊丽莎白") {
            // wiki上的音译是“丽”，修正为和官方一致用于匹配
            linkText = "咲弥 & 伊莉莎白";
          }
          if (linkText === "依莉丝 & Ivy") {
            // wiki上的奖励名称有重定向，修正为和官方一致用于匹配
            linkText = "Ilith & Ivy";
          }
          const song = songs.find((s) => s.name === linkText);
          const character = characters.find((c) => c.name.zh === linkText);
          if (song) {
            platform.reward = {
              type: RewardType.Song,
              id: song.id,
            };
          } else if (character) {
            platform.reward = {
              type: RewardType.Character,
              id: character.id,
            };
          } else {
            const img = backgrounds[linkText];
            if (!img) {
              throw new Error(`背景图 ${linkText} 未找到`);
            }
            platform.reward = {
              type: RewardType.Background,
              name: linkText,
              img,
            };
          }
        } else {
          if (rewardText.includes("×")) {
            const [nameText, countText] = rewardText.split("×");
            platform.reward = {
              type: RewardType.Item,
              name: [...nameText!].filter((t) => !/\s/.test(t)).join(""),
              count: +countText!,
            };
          } else {
            const match = /(\d+) 残片/.exec(rewardText);
            if (match) {
              const [, fragmentCount] = match!;
              platform.reward = {
                type: RewardType.Item,
                name: "残片",
                count: +fragmentCount!,
              };
            } else {
              console.log(`特殊道具 ${rewardText}`);
              platform.reward = {
                type: RewardType.Item,
                count: 1,
                name: rewardText,
              };
            }
          }
        }
      }
      platforms.push(platform);
    }
  }
  return result;
}

type Backgrounds = {
  [name: string]: string;
};

async function getBackgounds(): Promise<Backgrounds> {
  const map: Backgrounds = {};
  await initPageDocument(wikiURL("背景列表"), arcaeaCNClient);
  const anchor = htmlDocument.querySelector("#场景")!;
  const table = findNextElWhere(anchor.parentElement!, (el): el is HTMLTableElement =>
    el.matches("table")
  ) as HTMLTableElement;
  for (const tbody of Array.from(table.tBodies)) {
    for (const row of Array.from(tbody.rows).slice(1)) {
      const name = row.cells[2]!.textContent!;
      map[name] = row.cells[1]!.querySelector("img")!.src;
    }
  }
  return map;
}

export async function fetchWikiWorldMapData(songs: SongData[], characters: CharacterData[]) {
  const backgrounds = await getBackgounds();
  const longtermTableItems = await getWikiLontermWorldMapTable();
  const longterm = longtermTableItems.map<ChapterData>((d) => ({
    chapter: d.name,
    maps: d.maps.map((map) => getWorldMap(htmlDocument, map, backgrounds, songs, characters)),
  }));
  const legacyMaps = new Set([
    // chapter 1
    "1-1",
    "1-2",
    "1-3",
    "1-4",
    "1-5",
    "1-6",
    "1-7",
    // chapter 2
    "2-1",
    // chapter 3
    "3-1",
    "3-2",
    "3-5",
    "3-6",
    "3-7",
    // chapter 4
    "4-2",
    "4-3",
    "4-7",
    // chapter 5
    "5-4",
    "5-7",
  ]);
  for (const chapter of longterm) {
    for (const map of chapter.maps) {
      if (legacyMaps.has(map.id)) {
        map.legacy = true;
      }
    }
  }
  const eventTableItems = await getWikiEventWorldMapTable();
  const events = eventTableItems.map((map) => getWorldMap(htmlDocument, map, backgrounds, songs, characters));
  const { currentEvents } = await getMainTableInfo();
  for (const event of currentEvents) {
    const map = events.find(e =>e.id === event.id);
    if (!map) throw new Error(`活动地图 ${event.id} 未找到`);
    map.expire = event.expire;
  }
  return { longterm, events };
}
