import { sheet } from "./style.css.js";
import { bootstrap } from "../../styles";
import { Inject } from "../../../services/di";
import { $WorldModeService, WorldModeService } from "../../../services/declarations";
import { Chapter, NormalWorldMap, RewardType } from "../../../models/world-mode";
import { Component, For, HyplateElement, computed, noop, signal, watch } from "hyplate";
import type { Mountable } from "hyplate/types";

export
@Component({
  tag: "world-map-select",
  styles: [bootstrap, sheet],
})
class WorldMapSelect extends HyplateElement {
  @Inject($WorldModeService)
  accessor worldmode!: WorldModeService;

  longtermMaps = signal<Chapter[]>([]);
  eventMaps = signal<NormalWorldMap[]>([]);
  selected = signal<NormalWorldMap | null>(null);
  longtermSelected = signal("");
  eventSelected = signal("");
  showObsolete = signal(false);

  #dataFetched = false;
  #initMapId: string | null = null;

  override render(): Mountable<any> {
    this.fetchMapData();
    this.effect(() =>
      watch(this.longtermSelected, (value) => {
        if (value) {
          this.eventSelected.set("");
          this.selected.set(
            this.longtermMaps()
              .flatMap((c) => c.maps)
              .find((m) => m.id === value) ?? null
          );
        }
      })
    );
    this.effect(() =>
      watch(this.eventSelected, (value) => {
        if (value) {
          this.longtermSelected.set("");
          this.selected.set(this.eventMaps().find((m) => m.id === value) ?? null);
        }
      })
    );
    const eventMaps = computed(() => {
      const showObsolete = this.showObsolete();
      const now = Date.now();
      return this.eventMaps().filter((e) => {
        if (showObsolete) return true;
        const expire = e.expire;
        if (!expire) return false;
        return expire > now;
      });
    });
    return (
      <>
        <div class="row">
          <div class="col-auto">
            <div class="form-check">
              <input
                type="checkbox"
                h-model:boolean={this.showObsolete}
                name="show-obsolete"
                id="show-obsolete"
                class="form-check-input"
              ></input>
              <label for="show-obsolete" class="form-check-label">
                显示已关闭的活动地图
              </label>
            </div>
          </div>
        </div>
        <div class="row">
          <div class="col">
            <select class="form-select" name="longterm" h-model={this.longtermSelected}>
              <option value="">--常驻地图--</option>
              <For of={this.longtermMaps}>
                {(item) => (
                  <optgroup label={item.chapter}>{item.maps.map((map) => this.renderMapOption(map))}</optgroup>
                )}
              </For>
            </select>
          </div>
          <div class="col">
            <select class="form-select" name="event" h-model={this.eventSelected}>
              <option value="">--活动地图--</option>
              <For of={eventMaps}>{(item) => this.renderMapOption(item)}</For>
            </select>
          </div>
        </div>
      </>
    );
  }

  async fetchMapData(): Promise<void> {
    const [chapterData, maps] = await Promise.all([this.worldmode.getLongtermMaps(), this.worldmode.getEventMaps()]);
    this.longtermMaps.set(chapterData);
    this.eventMaps.set(maps);
    this.#dataFetched = true;
    const mapId = this.#initMapId;
    if (mapId) {
      this.updateSelectValue(chapterData, maps, mapId);
    }
  }

  setMapId(mapId: string | null) {
    if (this.#dataFetched) {
      queueMicrotask(() => {
        this.updateSelectValue(this.longtermMaps(), this.eventMaps(), mapId);
      });
    } else {
      this.#initMapId = mapId;
    }
  }

  private renderMapOption(map: NormalWorldMap) {
    const rewards = this.worldmode.getMapRewards(map);
    const buf: string[] = [];
    if (RewardType.Character in rewards) {
      buf.push(`搭档：${Object.keys(rewards[RewardType.Character]!).join("，")}`);
    }
    if (RewardType.Song in rewards) {
      buf.push(`曲目：${Object.keys(rewards[RewardType.Song]!).join("，")}`);
    }
    if (RewardType.Background in rewards) {
      buf.push(`背景：${Object.keys(rewards[RewardType.Background]!).join("，")}`);
    }
    const items = Object.entries(rewards[RewardType.Item] ?? {}).filter(([, value]) => value.show);
    if (items.length) {
      buf.push(`材料：${items.map(([key, value]) => `${key} × ${value.count}`).join("，")}`);
    }
    return (
      <option value={map.id} title={map.id}>
        {map.id}
        {buf.length ? ` (奖励：${buf.join(" ")})` : ""}
      </option>
    );
  }

  private updateSelectValue(longtermMaps: Chapter[], eventMaps: NormalWorldMap[], id: string | null) {
    if (!id) {
      this.clearSelectValues();
      return;
    }
    const longtermMap = longtermMaps.flatMap((c) => c.maps).find((map) => map.id === id);
    if (longtermMap) {
      this.longtermSelected.set(id);
      return;
    }
    const eventMap = eventMaps.find((map) => map.id === id);
    if (eventMap) {
      this.eventSelected.set(id);
      return;
    }
    this.clearSelectValues();
  }

  private clearSelectValues() {
    this.longtermSelected.set("");
    this.eventSelected.set("");
  }
}
