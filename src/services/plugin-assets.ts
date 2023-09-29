import { Injectable } from "classic-di";
import { Chart, Song, ClearRank, Grade } from "../models/music-play";
import { $AssetsResolver, $AssetsService, AssetsResolver, AssetsService } from "./declarations";

@Injectable({
  requires: [$AssetsResolver] as const,
  implements: $AssetsService,
})
export class PluginAssetsServiceImpl implements AssetsService {
  constructor(public resolver: AssetsResolver) {}
  async getCover(chart: Chart, song: Song, hd: boolean): Promise<string> {
    return this.resolver.resolveCover(chart, song, hd).toString();
  }
  async getClearImg(clearType: ClearRank): Promise<string> {
    return this.resolver.resolveClearImg(clearType).toString();
  }
  async getGradeImg(scoreRank: Grade): Promise<string> {
    return this.resolver.resolveGradeImg(scoreRank).toString();
  }
}
