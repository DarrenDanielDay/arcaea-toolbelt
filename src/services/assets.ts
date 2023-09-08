import { Injectable } from "classic-di";
import { Song, Difficulty, ClearRank, Grade, Chart } from "../models/music-play";
import { $AssetsService, AssetsService } from "./declarations";
import { clearImages, gradeImages } from "../assets/play-result";
import { CachedHttpGetClient } from "./cache";
const assetsRoot = "https://ghproxy.com/raw.githubusercontent.com/MoYoez/ArcaeaResource-ActionUpdater/main/arcaea/";
@Injectable({
  implements: $AssetsService,
})
export class AssetsServiceImpl implements AssetsService {
  /** Memory cache: raw URL -> blob URL */
  #cache: { [url: string]: string } = {};
  #difficulty: Record<Difficulty, number> = {
    [Difficulty.Past]: 0,
    [Difficulty.Present]: 1,
    [Difficulty.Future]: 2,
    [Difficulty.Beyond]: 3,
  };
  #client = new CachedHttpGetClient("assets-image-cache", 1);

  async getCover(chart: Chart, song: Song, hd?: boolean | undefined): Promise<string> {
    const folder = !song.dl ? song.id : `dl_${song.id}`;
    const base = `assets/songs/${folder}`;
    const suffix = hd ? ".jpg" : "_256.jpg";
    const path = chart.override?.cover
      ? `${base}/${this.#difficulty[chart.difficulty]}${suffix}`
      : `${base}/base${suffix}`;
    return this.#cachedFetch(new URL(path, assetsRoot));
  }

  async getClearImg(clearType: ClearRank): Promise<string> {
    return this.#cachedFetch(
      new URL(`assets/img/clear_type/${this.#getClearAssetsImgName(clearType)}.png`, assetsRoot)
    );
  }

  async getGradeImg(scoreRank: Grade): Promise<string> {
    return this.#cachedFetch(
      new URL(`assets/img/grade/mini/${this.#getGradeAssetsImgName(scoreRank)}.png`, assetsRoot)
    );
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

  #getClearAssetsImgName(clearType: ClearRank) {
    switch (clearType) {
      case ClearRank.EasyClear:
        return "easy";
      case ClearRank.TrackLost:
        return "fail";
      case ClearRank.FullRecall:
        return "full";
      case ClearRank.HardClear:
        return "hard";
      case ClearRank.PureMemory:
      case ClearRank.Maximum:
        return "pure";
      case ClearRank.NormalClear:
      default:
        return "normal";
    }
  }

  #getGradeAssetsImgName(grade: Grade) {
    return grade.replace("+", "plus").toLowerCase();
  }
}
