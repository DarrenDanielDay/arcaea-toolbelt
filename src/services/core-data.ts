import { Injectable } from "classic-di";
import { $CoreDataProvider, $CoreDataService, CoreDataProvider, CoreDataService } from "./declarations";
import { SongData } from "../models/music-play";
import { CharacterData } from "../models/character";
import {
  characterData,
  chartData,
  itemsData,
  meta,
  packList,
  songList,
  worldMapsEvents,
  worldMapsLongterm,
} from "../data/file-list";
import { ChapterData, ItemData, NormalWorldMapData } from "../models/world-mode";
import { ArcaeaToolbeltMeta } from "../models/misc";

@Injectable({
  requires: [$CoreDataProvider] as const,
  implements: $CoreDataService,
})
export class CoreDataServiceImpl implements CoreDataService {
  constructor(private readonly provider: CoreDataProvider) {}

  protected fetch<T>(path: string): Promise<T> {
    return this.provider.get(path);
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
