import { findNextElWhere, htmlDocument, initPageDocument, prepareDocument, wikiURL, arcaeaCNClient } from "./wiki-util";
import characters from "../data/characters.json";
import { CharacterData, CharacterFactors, ItemData } from "../models/world-mode";
import { concurrently } from "../utils/concurrent";

const wikiCharacterTable = wikiURL("搭档");

interface CharacterTableData {
  link: string;
  imgs: string[];
  name: string;
  variant: string | undefined;
  ref: (typeof characters)[number];
}

async function getWikiCharacterTable(): Promise<CharacterTableData[]> {
  await initPageDocument(wikiCharacterTable, arcaeaCNClient);
  const characterAnchor = htmlDocument.querySelector("#搭档列表")!;
  const tableDiv = findNextElWhere(characterAnchor.parentElement!, (node) => node.matches("div.ddtable"));
  if (!tableDiv) {
    throw new Error("搭档表格未找到");
  }
  const characterGrids = Array.from(tableDiv.querySelectorAll(".content > div > div"));
  if (characterGrids.length !== characters.length) {
    throw new Error("角色总数不一致");
  }
  const result: CharacterTableData[] = [];
  for (const grid of characterGrids) {
    const cell1 = grid.children[0]!;
    const link = cell1.querySelector("a")!;
    const imgs = Array.from(cell1.querySelectorAll("img"), (img) => img.src);
    const fullName = link.title;
    let [, name, , variant] = /([^（）]+)(（([^（）]+)）)?/.exec(fullName)!;
    if (!name) {
      throw new Error("名称格式未匹配");
    }
    if (name === "咲弥 & 伊丽莎白") {
      // wiki上的音译是“丽”，修正为和官方一致用于匹配
      name = "咲弥 & 伊莉莎白";
    }
    const ref = characters.find(
      (c) => c.display_name["zh-Hans"] === name && (!variant || variant === c.variant?.["zh-Hans"])
    );
    if (!ref) {
      console.log({
        fullName,
        name,
        variant,
      });
      throw new Error(`${fullName} 未匹配`);
    }
    result.push({
      variant,
      name,
      imgs,
      link: link.href,
      ref,
    });
  }
  return result;
}

const defaultFactors: CharacterFactors = {
  frag: 0,
  over: 0,
  step: 0,
};
const factorCount = Object.keys(defaultFactors).length;
const groupRowCount = factorCount + 1;
function isFactor(key: string): key is keyof CharacterFactors {
  return key in defaultFactors;
}

export async function fetchWikiCharacterAndCharacterCoreItemData(): Promise<{
  characters: CharacterData[];
  cores: ItemData[];
}> {
  const tableData = await getWikiCharacterTable();
  const itemTable = htmlDocument.querySelector(`#mw-content-text > div.mw-parser-output > table:nth-child(46)`)!;
  const itemImgs = Array.from(itemTable.querySelectorAll("img"));
  const items = itemImgs.map<ItemData>((img) => {
    return {
      name: img.parentElement!.parentElement!.parentElement!.textContent!.trim(),
      img: img.src,
    };
  });

  const getOneCharacter = async (item: CharacterTableData) => {
    const { ref, imgs, link } = item;
    const html = await arcaeaCNClient.fetch(link).then((res) => res.text());
    prepareDocument(html, link);
    const characterDataSpan = htmlDocument.getElementById(".E6.90.AD.E6.A1.A3.E5.88.86.E7.BA.A7.E6.95.B0.E6.8D.AE");
    const table =
      characterDataSpan instanceof HTMLSpanElement
        ? findNextElWhere(characterDataSpan.parentElement!, (node) => node.matches("table.wikitable"))
        : htmlDocument.querySelector("table.wikitable");
    if (!(table instanceof HTMLTableElement)) {
      throw new Error("表格元素未找到");
    }
    const levels: CharacterFactors[] = [];
    const sections = Array.from(table.tBodies);

    for (const section of sections) {
      const rows = section.rows;
      if (rows.length % groupRowCount) {
        throw new Error(`行数应当是${groupRowCount}的倍数`);
      }
      for (let i = 0, groups = rows.length / groupRowCount; i < groups; i++) {
        const levelRow = rows[i * groupRowCount]!;
        for (let groupOffset = 1; groupOffset < groupRowCount; groupOffset++) {
          const dataRow = rows[i * groupRowCount + groupOffset]!;
          const dataCells = dataRow.cells;
          const factor = [...dataCells[0]!.textContent!]
            .filter((c) => /[a-z]/i.test(c))
            .join("")
            .toLowerCase();
          if (!isFactor(factor)) {
            throw new Error(`未知能力值因子 ${factor}`);
          }
          for (let col = 1, maxCol = levelRow.cells.length; col < maxCol; col++) {
            const level = +levelRow.cells[col]!.textContent!;
            if (!level) {
              throw new Error("角色等级错误");
            }
            const factors = (levels[level] ??= { ...defaultFactors });
            const value = dataCells[col]!.textContent!.trim();
            if (!value) {
              throw new Error(`等级 ${level} 的 ${factor} 无数据`);
            }
            factors[factor] = +value;
          }
        }
      }
    }
    const variantEn = ref.variant?.en.trim();
    const variantZh = ref.variant?.["zh-Hans"].trim();
    return {
      id: ref.character_id,
      image: imgs.at(0)!,
      awakenImage: imgs.at(1) || null,
      name: {
        en: ref.display_name.en + (variantEn ? ` (${variantEn})` : ""),
        zh: ref.display_name["zh-Hans"] + (variantZh ? `（${variantZh}）` : ""),
      },
      levels,
    };
  };
  const charactersData: CharacterData[] = await concurrently(tableData, getOneCharacter, 6);
  return {
    characters: charactersData.sort((a, b) => a.id - b.id),
    cores: items,
  };
}

function getOtherItemsData(): ItemData[] {
  return [
    {
      name: "以太之滴",
      img: "https://wiki.arcaea.cn/images/thumb/0/00/Ether_Drop.png/40px-Ether_Drop.png",
    },
    {
      name: "次元结晶",
      img: "https://static.wikia.nocookie.net/iowiro/images/1/16/Core_bypass.png/revision/latest",
    },
  ];
}

export async function getCharacterData() {
  const { characters, cores } = await fetchWikiCharacterAndCharacterCoreItemData();
  const items = [...cores, ...getOtherItemsData()];
  return {
    characters,
    items,
  };
}
