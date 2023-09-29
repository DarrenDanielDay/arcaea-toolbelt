import { Injectable } from "classic-di";
import { clearImages, gradeImages } from "../assets/play-result";
import { Chart, Song, ClearRank, Grade } from "../models/music-play";
import { $AssetsService, AssetsService } from "./declarations";

/**
 * @deprecated
 */
@Injectable({ implements: $AssetsService })
export class WikiAssetsService implements AssetsService {
  async getCover(chart: Chart, song: Song, hd?: boolean | undefined): Promise<string> {
    // @ts-ignore
    return (chart.override?.cover && chart.override.url) || song.cover;
  }
  async getClearImg(clearType: ClearRank): Promise<string> {
    return clearImages[clearType];
  }
  async getGradeImg(scoreRank: Grade): Promise<string> {
    return gradeImages[scoreRank];
  }
}
