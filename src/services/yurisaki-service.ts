import { Injectable } from "classic-di";
import { difficulties, RatingClass } from "arcaea-toolbelt-core/constants";
import { formatJSON } from "pragmatism/core";

import {
  $ChartService,
  $Logger,
  $ProfileService,
  ChartService,
  ImportResult,
  Logger,
  ProfileService,
} from "./declarations";
import { Profile } from "../models/profile";
import { groupBy, mapProps } from "../utils/collections";
import { Chart } from "../models/music-play";
import { esModule } from "../utils/misc";

namespace Yurisaki {
  export interface Score {
    SongId: string;
    Difficulty: RatingClass;
    Score: number;
    Constant: number;
    Potential: number;
    LS: number;
    MaxPure: number;
    Pure: number;
    Far: number;
    Lost: number;
    Timestamp: number;
    DateTime: string;
  }
}

@Injectable({
  requires: [$ProfileService, $ChartService, $Logger] as const,
})
export class YurisakiService {
  constructor(
    private readonly profile: ProfileService,
    private readonly chart: ChartService,
    private readonly logger: Logger
  ) {}

  async importCSV(text: string): Promise<ImportResult> {
    const records = await this.#loadCSVAsTable(text);
    const songIndex = await this.chart.getSongIndex();
    const chartIndex: Record<string, Chart> = {};
    const best: Profile["best"] = {};
    const result: ImportResult = {
      count: 0,
      difficulties: mapProps(
        groupBy(difficulties, (d) => d),
        () => 0
      ),
      skipped: [],
    };
    const { skipped } = result;
    for (const record of records) {
      const song = songIndex[record.SongId];
      if (!song) {
        skipped.push(`未知曲目Id: ${record.SongId}`);
        continue;
      }
      const chart = song.charts.find((c) => c.difficulty === difficulties[record.Difficulty]);
      if (!chart) {
        skipped.push(`曲目${song.name}的${difficulties[record.Difficulty]}难度谱面未知`);
        continue;
      }
      const chartId = chart.id;
      if (record.MaxPure > record.Pure) {
        skipped.push(`曲目${song.name}的${difficulties[record.Difficulty]}难度成绩大P判定多于Pure`);
        continue;
      }
      const notes = record.Pure + record.Far + record.Lost;
      if (notes !== chart.note) {
        skipped.push(
          `曲目${song.name}的${difficulties[record.Difficulty]}难度成绩总物量错误，应为${chart.note}，实际${notes}`
        );
        continue;
      }
      chartIndex[chartId] = chart;
      best[chartId] = {
        type: "note",
        chartId,
        clear: null,
        result: {
          perfect: record.MaxPure,
          pure: record.Pure,
          far: record.Far,
          lost: record.Lost,
        },
        date: record.Timestamp,
      };
    }
    await this.profile.importBest(best);
    this.logger.info(
      `已忽略未知或非法谱面成绩 ${skipped.length} 个（如忽略个数太多最多显示5条）:${formatJSON(skipped.slice(0, 5))}`
    );
    for (const chartId in best) {
      const chart = chartIndex[chartId];
      if (!chart) continue;
      result.count++;
      result.difficulties[chart.difficulty]++;
    }
    result.count = Object.keys(best).length;
    return result;
  }

  async importZip(file: File): Promise<ImportResult> {
    const JSZip = await esModule(import("jszip"));
    const zip = await JSZip.loadAsync(file);
    const target = "best_scores.csv";
    const bestcsv = zip.files[target];
    if (!bestcsv) throw new Error(`未在zip文件中找到文件${bestcsv}`);
    return this.importCSV(await bestcsv.async("text"));
  }

  async #loadCSVAsTable(text: string) {
    const { parse } = await import("csv-parse/sync");
    const records = parse(text, { columns: true, skip_empty_lines: true });
    function assertNumber(value: string) {
      const num = +value;
      if (isNaN(num)) throw new Error("文件格式错误");
      return num;
    }
    return (records as Record<keyof Yurisaki.Score, string>[]).map<
      Pick<Yurisaki.Score, "SongId" | "Difficulty" | "MaxPure" | "Pure" | "Far" | "Lost" | "Timestamp">
    >((score) => ({
      SongId: score.SongId,
      Difficulty: assertNumber(score.Difficulty),
      MaxPure: assertNumber(score.MaxPure),
      Pure: assertNumber(score.Pure),
      Far: assertNumber(score.Far),
      Lost: assertNumber(score.Lost),
      Timestamp: assertNumber(score.Timestamp),
    }));
  }
}
