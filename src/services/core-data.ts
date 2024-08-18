import { Injectable } from "classic-di";
import { $CoreDataProvider, $CoreDataService, CoreDataProvider, CoreDataService } from "./declarations";
import { SongData } from "../models/music-play";
import { CharacterData } from "../models/character";
import {
  assetsInfo,
  characterData,
  chartData,
  chartExpress,
  itemsData,
  meta,
  packList,
  songList,
  worldMapsEvents,
  worldMapsLongterm,
} from "../data/file-list";
import { ChapterData, ItemData, NormalWorldMapData } from "../models/world-mode";
import { ArcaeaToolbeltMeta, ChartExpress } from "../models/misc";
import { AssetsInfo } from "../models/file";

@Injectable({
  requires: [$CoreDataProvider] as const,
  implements: $CoreDataService,
})
export class CoreDataServiceImpl implements CoreDataService {
  constructor(private readonly provider: CoreDataProvider) {}

  protected fetch<T>(path: string): Promise<T> {
    return this.provider.get(path);
  }

  getAssetsInfo(): Promise<AssetsInfo> {
    return this.fetch(assetsInfo);
  }

  getSongList(): Promise<any> {
    return this.fetch(songList);
  }

  getPackList(): Promise<any> {
    return this.fetch(packList);
  }

  getMetaData(): Promise<ArcaeaToolbeltMeta> {
    return this.fetch(meta);
  }

  getChartExpress(): Promise<ChartExpress[]> {
    return this.fetch(chartExpress);
  }

  getChartData(): Promise<SongData[]> {
    return this.fetch(chartData);
  }

  getCharacterData(): Promise<CharacterData[]> {
    return this.fetch(characterData);
  }

  getItemsData(): Promise<ItemData[]> {
    return this.fetch(itemsData);
  }

  getWorldMapLongTerm(): Promise<ChapterData[]> {
    return this.fetch(worldMapsLongterm);
  }

  getWorldMapEvents(): Promise<NormalWorldMapData[]> {
    return this.fetch(worldMapsEvents);
  }
}
