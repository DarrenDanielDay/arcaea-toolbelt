import { Injectable } from "classic-di";
import { Song, Difficulty, ClearRank, Grade, Chart } from "../models/music-play";
import { $AssetsResolver, $AssetsService, AssetsResolver, AssetsService } from "./declarations";
import { CachedHttpGetClient } from "./cache";

@Injectable({
  requires: [$AssetsResolver] as const,
  implements: $AssetsService,
})
export class AssetsServiceImpl implements AssetsService {
  /** Memory cache: raw URL -> blob URL */
  #cache: { [url: string]: string } = {};

  #client = new CachedHttpGetClient("assets-image-cache", 1);

  constructor(private resolver: AssetsResolver) {}

  async getCover(chart: Chart, song: Song, hd: boolean): Promise<string> {
    return this.#cachedFetch(this.resolver.resolveCover(chart, song, hd));
  }

  async getClearImg(clearType: ClearRank): Promise<string> {
    return this.#cachedFetch(this.resolver.resolveClearImg(clearType));
  }

  async getGradeImg(scoreRank: Grade): Promise<string> {
    return this.#cachedFetch(this.resolver.resolveGradeImg(scoreRank));
  }

  async #cachedFetch(url: string | URL) {
    const cache = this.#cache;
    const key = url.toString();
    const cached = cache[key];
    if (cached) return cached;
    const req = await this.#client.fetch(url);
    const blob = await req.blob();
    return (cache[key] = URL.createObjectURL(blob));
  }
}
