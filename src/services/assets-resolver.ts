import { Injectable } from "classic-di";
import { $AssetsResolver, AssetsResolver } from "./declarations";
import { Chart, Song, ClearRank, Grade, difficultyIndexes } from "../models/music-play";
import { CharacterImage, CharacterImageKind, CharacterStatus } from "../models/character";
import { toolbelt } from "../models/data";
import { Banner, BannerType } from "../models/assets";

@Injectable({
  implements: $AssetsResolver,
})
export class AssetsResolverImpl implements AssetsResolver {
  resolve(path: string): URL {
    return toolbelt.assets(path);
  }

  resoveCharacterImage({ id, status, kind }: CharacterImage): URL {
    if (id === -1) {
      switch (kind) {
        case CharacterImageKind.Icon:
          return this.resolve(`char/unknown_icon.png`);
        case CharacterImageKind.Full:
        default:
          return this.resolve(`char/-1_mp.png`);
      }
    }
    // 光 & 对立觉醒前后完全一致
    if (id === 5) status = CharacterStatus.Initial;
    switch (kind) {
      case CharacterImageKind.Icon: {
        return this.resolve(`char/${id}${status}_icon.png`);
      }
      case CharacterImageKind.Full:
      default: {
        return this.resolve(`char/1080/${id}${status}.png`);
      }
    }
  }

  resolvePotentialBadge(level: number): URL {
    return this.resolve(`img/rating_${level >= 0 ? level : "off"}.png`);
  }

  resolveCover(chart: Chart, song: Song, hd: boolean): URL {
    const folder = !song.dl ? song.id : `dl_${song.id}`;
    const base = `songs/${folder}`;
    const suffix = hd ? ".jpg" : "_256.jpg";
    const version = chart.override?.cover ? `${difficultyIndexes[chart.difficulty]}` : "base";
    const possible = ["", "1080_"].map((prefix) => `${prefix}${version}${suffix}`);
    const file = song.covers.find((cover) => possible.includes(cover));
    const path = `${base}/${file}`;
    return this.resolve(path);
  }
  resolveUnknownCover(): URL {
    return this.resolve("img/song_jacket_back_colorless.png");
  }
  resolveClearImg(clearType: ClearRank): URL {
    return this.resolve(`img/clear_type/${this.#getClearAssetsImgName(clearType)}.png`);
  }
  resolveGradeImg(scoreRank: Grade): URL {
    return this.resolve(`img/grade/mini/${this.#getGradeAssetsImgName(scoreRank)}.png`);
  }
  resolveBanner(banner: Banner): URL {
    switch (banner.type) {
      case BannerType.ArcaeaOnline:
        return this.resolve(`img/course/banner/${banner.file}`);
      default:
        const file = banner.file ?? `course_banner_${banner.level}.png`;
        return this.resolve(`img/course/banner/${file}`);
    }
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
