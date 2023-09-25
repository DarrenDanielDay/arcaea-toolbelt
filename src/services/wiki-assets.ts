import { Injectable } from "classic-di";
import { clearImages, gradeImages } from "../assets/play-result";
import { Chart, Song, ClearRank, Grade } from "../models/music-play";
import { $AssetsService, AssetsService } from "./declarations";

@Injectable({ implements: $AssetsService })
export class WikiAssetsService implements AssetsService {
  resolve(path: string): URL {
    throw new Error("Method not implemented.");
  }
  async getCover(chart: Chart, song: Song, hd?: boolean | undefined): Promise<string> {
    return (chart.override?.cover && chart.override.url) || song.cover;
  }
  async getClearImg(clearType: ClearRank): Promise<string> {
    return clearImages[clearType];
  }
  async getGradeImg(scoreRank: Grade): Promise<string> {
    return gradeImages[scoreRank];
  }
}
