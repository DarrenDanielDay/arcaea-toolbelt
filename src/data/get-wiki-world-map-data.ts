import { ChapterData, MapPlatform, NormalWorldMap, PlatformType, RewardType } from "../models/world-mode";
import { downloadJSON } from "../utils/download";
import characters from "./character-data.json";
import songs from "./chart-data.json";
import { findNextElWhere, htmlDocument, initPageDocument, wikiURL } from "./wiki-util";

const wikiWordMapTable = wikiURL("世界模式地图详表_(移动版)");

interface WikiChapterData {
  name: string;
  maps: {
    id: string;
    title: string;
  }[];
}

async function getWikiWorldMapTable() {
  await initPageDocument(wikiWordMapTable);
  const table = htmlDocument.querySelector("table.wikitable")!;
  // 排除byd章节
  const headers = Array.from(table.querySelectorAll("th")).slice(2, -1);
  if (headers.length !== 8) {
    throw new Error(`应当是7主线+1活动章节`);
  }
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
        chapter.maps.push({
          id: link.getAttribute("href")!.slice(1),
          title: link.textContent!,
        });
      }
    }
  }
  return chapters;
}

function getWorldMap(doc: Document, map: WikiChapterData["maps"][number]): NormalWorldMap {
  const anchor = doc.getElementById(map.id)!;
  const table = findNextElWhere(anchor.parentElement!, (el) => el.matches("table"));
  if (!(table instanceof HTMLTableElement)) {
    throw new Error(`表格 ${map.title} 未找到`);
  }
  const platforms: MapPlatform[] = [];
  const result: NormalWorldMap = {
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
      const platform: MapPlatform = {
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
      if (rewardText !== "-") {
        const links = reward.querySelectorAll("a");
        if (links.length > 1) {
          throw new Error(`超过一个链接`);
        }
        if (links.length) {
          const link = links[0]!;
          const linkPath = new URL(link.href).pathname.slice(1);
          let linkText = link.textContent!.trim();
          if (linkText === "咲弥 & 伊丽莎白") {
            // wiki上的音译是“丽”，修正为和官方一致用于匹配
            linkText = "咲弥 & 伊莉莎白";
          }
          const song = songs.find((s) => s.id === linkPath);
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
            console.log(`剩下的链接应当是背景图: ${linkText}`);
            platform.reward = {
              type: RewardType.Background,
              text: linkText,
            };
          }
        } else {
          platform.reward = {
            type: RewardType.Item,
            text: rewardText,
          };
        }
      }
      platforms.push(platform);
    }
  }
  return result;
}

export async function fetchWikiWorldMapData(): Promise<ChapterData[]> {
  const mainTableData = await getWikiWorldMapTable();
  return mainTableData.map((d) => ({
    chapter: d.name,
    maps: d.maps.map((map) => getWorldMap(htmlDocument, map)),
  }));
}

export async function generateWorldMapDataFile() {
  const data = await fetchWikiWorldMapData();
  downloadJSON(data, "world-maps.json");
}
