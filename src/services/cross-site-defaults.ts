import { Injectable } from "classic-di";
import {
  $CoreDataService,
  $PreferenceService,
  CoreDataService,
  Preference,
  PreferenceKey,
  PreferenceService,
} from "./declarations";
import { Signal } from "hyplate/types";
import { signal } from "hyplate";
import { AssetsResolverImpl } from "./assets-resolver";
import { DirectGateway } from "./gateway";
import { CharacterData } from "../models/character";
import { SongData } from "../models/music-play";
import { ChapterData, ItemData, NormalWorldMapData } from "../models/world-mode";
import { assetsInfo, characterData, chartData, itemsData } from "../data/file-list";
import { ArcaeaToolbeltMeta, ChartExpress } from "../models/misc";
import { AssetsInfo } from "../models/file";
import { clone } from "../utils/misc";

const defaultPreference: Preference = {
  ghproxy: false,
  theme: "light",
  showMaxMinus: false,
  template: {},
  aolWorldBoost: 1,
};

@Injectable({
  implements: $PreferenceService,
})
export class DefaultPreferenceService implements PreferenceService {
  #memoryPreference: Preference = clone(defaultPreference);
  #preference = signal<Preference>(clone(defaultPreference));
  #computed: { [K in PreferenceKey]?: Signal<Preference[K]> } = {};
  async get(): Promise<Preference> {
    return this.#memoryPreference;
  }

  signal<K extends PreferenceKey>(name: K): Signal<Preference[K]> {
    // @ts-expect-error key access does not match value
    const signal = (this.#computed[name] ??= computed(() => this.#preference()[name]));
    return signal;
  }

  async update(patch: Partial<Preference>): Promise<void> {
    this.#preference.mutate((old) => {
      Object.assign(old, patch);
    });
  }
}

export class PluginAssetsResolverImpl extends AssetsResolverImpl {
  override resolve(path: string): URL {
    const url = new DirectGateway().proxy(super.resolve(path));
    if (!(url instanceof URL)) throw new Error("Direct gateway should always be synchronous.");
    return url;
  }
}

@Injectable({
  implements: $CoreDataService,
})
export class PluginCoreData implements CoreDataService {
  async import(file: string) {
    const site = new URL(process.env.ARCAEA_TOOLBELT_DATA, process.env.BASE_URI);
    const url = new URL(file, site);
    const response = await fetch(url);
    const data = await response.json();
    return data;
  }
  getAssetsInfo(): Promise<AssetsInfo> {
    return this.import(assetsInfo);
  }
  getSongList(): Promise<any> {
    throw new Error("Method not implemented.");
  }
  getPackList(): Promise<any> {
    throw new Error("Method not implemented.");
  }
  getMetaData(): Promise<ArcaeaToolbeltMeta> {
    throw new Error("Method not implemented.");
  }
  getChartExpress(): Promise<ChartExpress[]> {
    throw new Error("Method not implemented.");
  }
  getChartData(): Promise<SongData[]> {
    return this.import(chartData);
  }
  getCharacterData(): Promise<CharacterData[]> {
    return this.import(characterData);
  }
  getItemsData(): Promise<ItemData[]> {
    return this.import(itemsData);
  }
  getWorldMapLongTerm(): Promise<ChapterData[]> {
    throw new Error("Method not implemented.");
  }
  getWorldMapEvents(): Promise<NormalWorldMapData[]> {
    throw new Error("Method not implemented.");
  }
}
