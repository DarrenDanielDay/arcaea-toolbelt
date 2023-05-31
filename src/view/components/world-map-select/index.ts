import html from "bundle-text:./template.html";
import { sheet } from "./style.css.js";
import { Component, OnConnected, element, fragment, query } from "../../../utils/component";
import { bootstrap } from "../../styles";
import { Inject } from "../../../services/di";
import { $WorldModeService, WorldModeService } from "../../../services/declarations";
import { NormalWorldMap, NormalWorldMapData, RewardType } from "../../../models/world-mode";

const templates = query({
  panel: "template#panel",
  eventOption: "template#event-map-option",
} as const)(fragment(html));

export
@Component({
  selector: "world-map-select",
  html: templates.panel,
  css: [bootstrap, sheet],
})
class WorldMapSelect extends HTMLElement implements OnConnected {
  @Inject($WorldModeService)
  accessor worldmode!: WorldModeService;

  onSelect: ((map: NormalWorldMap) => void) | null = null;

  connectedCallback(): void {
    const shadow = this.shadowRoot!;
    const longtermSelect = shadow.querySelector(`select[name="longterm"]`)!;
    const eventSelect = shadow.querySelector(`select[name="event"]`)!;
    this.worldmode.getLongtermMaps().then((chapterData) => {
      for (const item of chapterData) {
        const group = element("optgroup");
        group.label = item.chapter;
        for (const map of item.maps) {
          const option = this.renderMapOption(map);
          group.appendChild(option);
        }
        longtermSelect.appendChild(group);
      }
      longtermSelect.onchange = () => {
        eventSelect.value = "";
        if (longtermSelect.value) {
          this.onSelect?.(chapterData.flatMap((c) => c.maps).find((m) => m.id === longtermSelect.value)!);
        }
      };
    });
    this.worldmode.getEventMaps().then((maps) => {
      const options = maps.map((map) => this.renderMapOption(map));
      eventSelect.append(...options);
      eventSelect.onchange = () => {
        longtermSelect.value = "";
        if (eventSelect.value) {
          this.onSelect?.(maps.find((m) => m.id === eventSelect.value)!);
        }
      };
    });
  }

  private renderMapOption(map: NormalWorldMap) {
    const option = element("option");
    option.value = map.id;
    const rewards = this.worldmode.getMapRewards(map);
    const buf: string[] = [];
    if (RewardType.Character in rewards) {
      buf.push(`搭档 ${rewards[RewardType.Character]!}`);
    }
    if (RewardType.Song in rewards) {
      buf.push(`曲目 ${rewards[RewardType.Song]!}`);
    }
    if (RewardType.Background in rewards) {
      buf.push(`背景 ${rewards[RewardType.Background]!}`);
    }
    option.textContent = `${map.id}${buf.length ? ` (奖励：${buf.join(" ")})` : ""}`;
    return option;
  }
}
