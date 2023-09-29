import { Injectable } from "classic-di";
import { $AssetsResolver, AssetsResolver } from "./declarations";
import { Chart, Song, ClearRank, Grade, Difficulty } from "../models/music-play";
const assetsRoot =
  "https://ghproxy.com/raw.githubusercontent.com/MoYoez/ArcaeaResource-ActionUpdater/main/arcaea/assets/";

@Injectable({
  implements: $AssetsResolver,
})
export class AssetsResolverImpl implements AssetsResolver {
  #difficulty: Record<Difficulty, number> = {
    [Difficulty.Past]: 0,
    [Difficulty.Present]: 1,
    [Difficulty.Future]: 2,
    [Difficulty.Beyond]: 3,
  };
  resolve(path: string): URL {
    return new URL(path, assetsRoot);
  }
  resolveCover(chart: Chart, song: Song, hd: boolean): URL {
    const folder = !song.dl ? song.id : `dl_${song.id}`;
    const base = `songs/${folder}`;
    const suffix = hd ? ".jpg" : "_256.jpg";
    const path = chart.override?.cover
      ? `${base}/${this.#difficulty[chart.difficulty]}${suffix}`
      : `${base}/1080_base${suffix}`;
    return this.resolve(path);
  }
  resolveClearImg(clearType: ClearRank): URL {
    return this.resolve(`img/clear_type/${this.#getClearAssetsImgName(clearType)}.png`);
  }
  resolveGradeImg(scoreRank: Grade): URL {
    return this.resolve(`img/grade/mini/${this.#getGradeAssetsImgName(scoreRank)}.png`);
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
