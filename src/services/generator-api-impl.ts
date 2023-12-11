import { Injectable } from "classic-di";
import { CharacterData, CharacterImage } from "../models/character";
import { FileExportOptions, HostAPI, ImageFile, PickImageOptions } from "./generator-api";
import {
  $AssetsCacheService,
  $AssetsResolver,
  $CharacterService,
  $ChartService,
  $CoreDataService,
  $Gateway,
  $PreferenceService,
  AssetsCacheService,
  AssetsResolver,
  CharacterService,
  ChartService,
  CoreDataService,
  Gateway,
  PreferenceService,
} from "./declarations";
import { Grade, difficulties } from "../models/music-play";

@Injectable({
  requires: [
    $CoreDataService,
    $AssetsResolver,
    $CharacterService,
    $ChartService,
    $AssetsCacheService,
    $PreferenceService,
    $Gateway,
  ] as const,
})
export class HostAPIImpl implements HostAPI {
  site = "";

  constructor(
    private readonly core: CoreDataService,
    private readonly resolver: AssetsResolver,
    private readonly character: CharacterService,
    private readonly chart: ChartService,
    private readonly cache: AssetsCacheService,
    private readonly preference: PreferenceService,
    private readonly gateway: Gateway
  ) {}

  getSongList(): Promise<any> {
    return this.core.getSongList();
  }
  getPackList(): Promise<any> {
    return this.core.getPackList();
  }
  getAllCharacters(): Promise<CharacterData[]> {
    return this.character.getAllCharacters();
  }
  async getPreference(): Promise<any> {
    const preference = await this.preference.get();
    return Reflect.get(preference, this.site);
  }
  async savePreference(preference: any): Promise<void> {
    await this.preference.update({
      [this.site]: preference,
    });
  }
  async resolveAssets(paths: string[]): Promise<URL[]> {
    return paths.map((path) => this.resolver.resolve(path));
  }

  async resolveCovers(
    query: { songId: string; difficulty: number; highQuality?: boolean | undefined }[]
  ): Promise<URL[]> {
    const data = await this.chart.getSongIndex();
    return query.map((q) => {
      const { songId, difficulty, highQuality } = q;
      const song = data[songId];
      const chart = song?.charts.find((chart) => chart.difficulty === difficulties[difficulty]);
      if (!song || !chart) throw new Error(`Unknown song or difficulty: songId=${songId}, difficulty=${difficulty}`);
      return this.resolver.resolveCover(chart, song, !!highQuality);
    });
  }
  async resolveCharacterImages(query: CharacterImage[]): Promise<URL[]> {
    return query.map((q) => this.resolver.resoveCharacterImage(q));
  }
  async resolvePotentialBadge(rating: number): Promise<URL> {
    return this.resolver.resolvePotentialBadge(rating);
  }
  async resolveGradeImgs(grades: Grade[]): Promise<URL[]> {
    return grades.map(grade => this.resolver.resolveGradeImg(grade));
  }
  async resolveBackgrounds(): Promise<URL[]> {
    return [
      this.resolver.resolve("img/bg_light.jpg"),
      ...Array.from({ length: 9 }, (_, i) => this.resolver.resolve(`img/world/1080/${i}.jpg`)),
      this.resolver.resolve("img/world/1080/1001.jpg"),
    ];
  }
  async getImages(resources: URL[]): Promise<ImageFile[]> {
    return Promise.all(
      resources.map(async (resourceURL): Promise<ImageFile> => {
        const filename = resourceURL.pathname.split("/").findLast((fragment) => !!fragment)!;
        const dist = await this.gateway.dynamicProxy(resourceURL);
        const imageCache = await this.cache.cachedGet(dist);
        return {
          filename,
          resourceURL,
          distURL: dist.href,
          blob: imageCache.blob,
          blobURL: imageCache.blobURL,
        };
      })
    );
  }
  pickImage(resources: URL[], options: PickImageOptions): Promise<URL | null> {
    throw new Error("Method not implemented.");
  }
  exportAsImage(file: Blob, options: FileExportOptions): Promise<void> {
    throw new Error("Method not implemented.");
  }
}
