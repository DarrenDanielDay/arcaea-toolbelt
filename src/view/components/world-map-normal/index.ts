import html from "bundle-text:./template.html";
import { sheet } from "./style.css.js";
import { Component, RefsOf, clone, element, fragment, query } from "../../../utils/component";
import { bootstrap } from "../../styles";
import { MapPlatform, NormalWorldMap, PlatformType, RewardType } from "../../../models/world-mode";
import { alert } from "../global-message";

const templates = query({
  panel: "template#panel",
  platform: "template#platform",
} as const)(fragment(html));

const getPanelRefs = query({
  platforms: "div.platforms",
} as const);

const getPlatformRefs = query({
  cell: "div.cell",
  img: "img.platform-img",
  length: "span.length",
} as const);

const specialPlatformImages: Record<
  PlatformType,
  {
    banner: string;
    main: string;
  }
> = {
  [PlatformType.FixedSpeed]: {
    banner:
      "https://wiki.arcaea.cn/images/thumb/a/ad/Step_banner_speedrestrict.png/125px-Step_banner_speedrestrict.png",
    main: "https://wiki.arcaea.cn/images/thumb/8/8b/Step_tile_speedrestrict.png/81px-Step_tile_speedrestrict.png",
  },
  [PlatformType.Random]: {
    banner: "https://wiki.arcaea.cn/images/thumb/d/d2/Step_banner_random.png/125px-Step_banner_random.png",
    main: "https://wiki.arcaea.cn/images/thumb/0/01/Step_tile_random.png/81px-Step_tile_random.png",
  },
  [PlatformType.Restriction]: {
    banner: "https://wiki.arcaea.cn/images/thumb/2/27/Step_banner_restrict.png/125px-Step_banner_restrict.png",
    main: "https://wiki.arcaea.cn/images/thumb/4/41/Step_tile_restrict.png/81px-Step_tile_restrict.png",
  },
  [PlatformType.Stamina]: {
    banner: "https://wiki.arcaea.cn/images/thumb/8/8e/Step_banner_plusstamina.png/125px-Step_banner_plusstamina.png",
    main: "https://wiki.arcaea.cn/images/thumb/b/bf/Step_tile_plusstamina.png/81px-Step_tile_plusstamina.png",
  },
};

const defaultPlatformImage = "https://wiki.arcaea.cn/images/thumb/0/01/Step_tile.png/81px-Step_tile.png";
const currentPlatformImage =
  "https://wiki.arcaea.cn/images/thumb/f/f7/Step_tile_current.png/81px-Step_tile_current.png";

type PlatformRefs = RefsOf<typeof getPlatformRefs>;

export
@Component({
  selector: "world-map-normal",
  html: templates.panel,
  css: [bootstrap, sheet],
})
class WorldMapNormal extends HTMLElement {
  currentMap: NormalWorldMap | null = null;
  platformRefs: PlatformRefs[] = [];
  currentLevel: number | null = null;
  setMap(map: NormalWorldMap) {
    this.currentMap = map;
    const refs = getPanelRefs(this.shadowRoot!);
    const platforms = map.platforms;
    this.platformRefs = [];
    refs.platforms.innerHTML = "";
    for (const key of Object.keys(platforms).sort((a, b) => +b - +a)) {
      const platform = platforms[+key];
      const level = +key + 1;
      if (!platform) {
        continue;
      }
      const { node, refs: platformRefs } = this.renderPlatform(platform, level);
      this.platformRefs[level] = platformRefs;
      refs.platforms.appendChild(node);
    }
    refs.platforms.lastElementChild!.scrollIntoView({ behavior: "smooth" });
  }

  setCurrentPlatform(current: { level: number; progress: number } | null) {
    const currentMap = this.currentMap;
    if (!currentMap) {
      return;
    }
    if (this.currentLevel) {
      const ref = this.platformRefs[this.currentLevel]!;
      const level = ref.cell.dataset["level"]!;
      const platform = currentMap.platforms[+level - 1]!;
      ref.length.textContent = `${platform.length}`;
      const special = platform.special;
      ref.img.src = special ? specialPlatformImages[special.type].main : defaultPlatformImage;
    }
    if (current) {
      const ref = this.platformRefs[current.level];
      if (!ref) {
        throw new Error(`${current.level}级阶梯未找到`);
      }
      ref.img.src = currentPlatformImage;
      const platform = currentMap.platforms[current.level - 1]!;
      ref.length.textContent = `${current.progress.toFixed(1)}/${platform.length}`;
      ref.cell.scrollIntoView({ behavior: "smooth" });
    }
    this.currentLevel = current ? current.level : null;
  }

  focusLevel(level: number) {
    const targetRef = this.findPlatform(level);
    if (targetRef) {
      targetRef.cell.scrollIntoView({ behavior: "smooth" });
      this.highlightLevel(level);
    }
  }

  highlightLevel(level: number) {
    const targetRef = this.findPlatform(level);
    if (targetRef) {
      targetRef.cell.classList.add("highlighted");
    }
  }

  private renderPlatform(platform: MapPlatform, level: number): { node: Node; refs: PlatformRefs } {
    const row = clone(templates.platform.content)!;
    const refs = getPlatformRefs(row);
    const { cell, img } = refs;
    const offset = 5 - Math.abs(((level - 1) % 10) - 5);
    cell.style.left = `${((offset * 100) / 6).toFixed(6)}%`;
    const { special, length, reward } = platform;
    cell.dataset["level"] = `${level}`;
    refs.length.textContent = `${length}`;
    if (!special) {
      img.src = defaultPlatformImage;
    } else {
      const type = special.type;
      const imgs = specialPlatformImages[type];
      img.src = imgs.main;
      const banner = element("img");
      banner.className = `banner`;
      banner.src = imgs.banner;
      cell.appendChild(banner);
      switch (special.type) {
        case PlatformType.FixedSpeed:
          {
            const max = special.max;
            banner.onclick = () => {
              alert(`限速 ≤ ${max}`);
            };
          }
          break;
        case PlatformType.Random:
          {
            const range = typeof special.range === "string" ? [special.range] : special.range;
            banner.onclick = () => {
              alert(fragment(`随机范围：<br>${range.map((it) => `${it}<br>`).join("")}`));
            };
          }
          break;
        case PlatformType.Restriction:
          {
            const range = typeof special.range === "string" ? [special.range] : special.range;
            banner.onclick = () => {
              alert(fragment(`限制范围：<br>${range.map((it) => `${it}<br>`).join("")}`));
            };
          }
          break;
        case PlatformType.Stamina:
          const count = element("span");
          count.className = `stamina-count`;
          count.textContent = `+${special.count}`;
          cell.appendChild(count);

          break;
        default:
          throw new Error(`未知台阶类型： ${type}`);
      }
    }
    if (reward) {
      switch (reward.type) {
        case RewardType.Character:
        case RewardType.Background:
        case RewardType.Song:
          {
            const rewardImg = element("img");
            rewardImg.src = reward.img;
            rewardImg.className = `reward`;
            cell.appendChild(rewardImg);
          }
          break;
        case RewardType.Item: {
          const rewardImg = element("img");
          rewardImg.src = reward.img;
          rewardImg.className = `reward item`;
          const rewardCount = element("span");
          rewardCount.textContent = `${reward.name} × ${reward.count}`;
          rewardCount.className = `item-info`;
          cell.appendChild(rewardImg);
          cell.appendChild(rewardCount);
        }
      }
    }
    return {
      node: row,
      refs,
    };
  }

  private findPlatform(level: number) {
    return this.platformRefs[level];
  }
}
