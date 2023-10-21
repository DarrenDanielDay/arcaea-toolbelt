import { Injectable } from "classic-di";
import { Song, ClearRank, Grade, Chart } from "../models/music-play";
import {
  $AssetsResolver,
  $AssetsService,
  $Database,
  AppDatabaseContext,
  AssetsResolver,
  AssetsService,
} from "./declarations";
import { CachedHttpGetClient, migrateOldCaches } from "./cache";
import { future } from "../utils/future";

@Injectable({
  requires: [$AssetsResolver, $Database] as const,
  implements: $AssetsService,
})
export class AssetsServiceImpl implements AssetsService {
  /** Memory cache: raw URL -> blob URL */
  #cache: { [url: string]: string } = {};

  #client;

  #migrated = future();

  constructor(private resolver: AssetsResolver, private database: AppDatabaseContext) {
    this.#client = new CachedHttpGetClient(database);
    this.#migrate();
  }

  async getCover(chart: Chart, song: Song, hd: boolean): Promise<string> {
    return this.#cachedFetch(this.resolver.resolveCover(chart, song, hd));
  }

  async getUnknownCover(): Promise<string> {
    return this.#cachedFetch(this.resolver.resolveUnknownCover());
  }

  async getClearImg(clearType: ClearRank): Promise<string> {
    return this.#cachedFetch(this.resolver.resolveClearImg(clearType));
  }

  async getGradeImg(scoreRank: Grade): Promise<string> {
    return this.#cachedFetch(this.resolver.resolveGradeImg(scoreRank));
  }

  cacheUsage(): Promise<number> {
    return this.#client.cacheUsage();
  }

  async clearCache(): Promise<void> {
    await this.#client.clear();
  }

  async #cachedFetch(url: string | URL) {
    await this.#migrated.promise;
    const cache = this.#cache;
    const key = url.toString();
    const cached = cache[key];
    if (cached) return cached;
    const req = await this.#client.fetch(url);
    const blob = await req.blob();
    return (cache[key] = URL.createObjectURL(blob));
  }

  async #migrate() {
    await migrateOldCaches("assets-image-cache", this.database);
    this.#migrated.done();
  }
}
