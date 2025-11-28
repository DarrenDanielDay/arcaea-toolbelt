import { Injectable } from "classic-di";
import {
  Chart,
  ClearRank,
  Grade,
  NoteResult,
  PartnerClearRank,
  ScoreResult,
  difficultyIndexes,
} from "../models/music-play";
import {
  $ChartService,
  $Logger,
  $MusicPlayService,
  ChartService,
  Logger,
  MusicPlayService,
  MusicPlayStatistics,
} from "./declarations";
import { Difficulty } from "arcaea-toolbelt-core/constants";

const MAX_BASE_SCORE = 1000_0000;
const EX_PLUS_SCORE = 990_0000;
const EX_SCORE = 980_0000;
const AA_SCORE = 950_0000;
const A_SCORE = 920_0000;
const B_SCORE = 890_0000;
const C_SCORE = 860_0000;

const EX_RATIO = 20_0000;
const AA_RATIO = 30_0000;

// @ts-expect-error object entries type
const GRADE_INDEX: Record<Grade, number> = Object.fromEntries(
  Object.values(Grade).map((grade, i) => [grade, i] as const)
);

@Injectable({
  requires: [$Logger, $ChartService] as const,
  implements: $MusicPlayService,
})
export class MusicPlayServiceImpl implements MusicPlayService {
  ex = EX_SCORE;
  grades = Object.values(Grade);
  maxBase = MAX_BASE_SCORE;

  constructor(public readonly logger: Logger, private readonly chart: ChartService) {}

  async getStatistics(): Promise<MusicPlayStatistics> {
    const songs = await this.chart.getSongData();
    const stats = await this.chart.getStatistics();
    const constants = songs.filter((s) => !s.version.deleted).flatMap((s) => s.charts.map((c) => c.constant));
    const maxs = [...constants].sort((a, b) => b - a).slice(0, 30);
    const maxptt = maxs.concat(maxs.slice(0, 10)).reduce((sum, curr) => sum + curr + 2, 0) / 40;
    return {
      maximumPotential: maxptt,
      maximumSinglePotential: stats.maximumConstant + 2,
    };
  }

  inferNoteResult(
    chart: Chart,
    perfect: number | null,
    far: number | null,
    lost: number | null,
    score: number | null
  ): NoteResult | null {
    const { note } = chart;
    if (perfect != null && far != null && lost != null) {
      return {
        pure: note - far - lost,
        perfect,
        far,
        lost,
      };
    }
    if (score != null && far != null && lost != null) {
      const pure = note - far - lost;
      const noPerfectScore = this.computeScore(chart, {
        pure,
        perfect: 0,
        far,
        lost,
      });
      return {
        pure,
        perfect: score - noPerfectScore,
        far,
        lost,
      };
    }
    if (score != null) {
      if (score >= MAX_BASE_SCORE) {
        // 认为是PM
        return {
          pure: note,
          perfect: score - MAX_BASE_SCORE,
          far: 0,
          lost: 0,
        };
      }
      // 不考虑1far得分低于大P数，性1far也可以推断
      const oneFarScore = this.computeScore(chart, {
        pure: note - 1,
        perfect: 0,
        far: 1,
        lost: 0,
      });
      if (score >= oneFarScore) {
        return {
          pure: note - 1,
          perfect: score - oneFarScore,
          far: 1,
          lost: 0,
        };
      }
    }
    // 全连根据分数算far数量懒得写了，得多加参数
    return null;
  }
  computeScore(chart: Chart, playResult: NoteResult): number {
    const { perfect, far, lost } = playResult;
    return Math.floor(MAX_BASE_SCORE * (1 - (far / 2 + lost) / chart.note)) + perfect;
  }

  computeGrade(score: number): Grade {
    switch (true) {
      case score >= EX_PLUS_SCORE:
        return Grade.EXPlus;
      case score >= EX_SCORE:
        return Grade.EX;
      case score >= AA_SCORE:
        return Grade.AA;
      case score >= A_SCORE:
        return Grade.A;
      case score >= B_SCORE:
        return Grade.B;
      case score >= C_SCORE:
        return Grade.C;
      default:
        return Grade.D;
    }
  }
  computeClearRank(noteResult: NoteResult, chart: Chart, clear: PartnerClearRank | null): ClearRank | null {
    const { far, lost, perfect } = noteResult;
    const { note } = chart;
    if (!lost) {
      if (!far) {
        if (perfect === note) {
          // 您
          return ClearRank.Maximum;
        }
        return ClearRank.PureMemory;
      }
      // 即使全连也可能因为far太多被特殊角色在最后一个note给TL……
      // 不知道用啥角色的情况不考虑了，但是选了Track Lost就算他TL
      if (clear !== ClearRank.TrackLost) {
        return ClearRank.FullRecall;
      }
    }
    return clear;
  }

  private computePotentialModifier(score: number): number {
    if (score >= MAX_BASE_SCORE) {
      // 不考虑非PM的超过1000W分，目前没有这样的谱
      return 2;
    }
    if (score >= EX_SCORE) {
      return (score - EX_SCORE) / EX_RATIO + 1;
    }
    return (score - EX_SCORE) / AA_RATIO + 1;
  }

  computePotential(score: number, chart: Chart): number {
    const { constant } = chart;
    const modifier = this.computePotentialModifier(score);
    return Math.max(0, constant + modifier);
  }

  computeScoreResult(score: number, chart: Chart): ScoreResult {
    return {
      grade: this.computeGrade(score),
      chartId: chart.id,
      score,
      potential: this.computePotential(score, chart),
    };
  }

  computeRankingLoseScore(play: NoteResult, chart: Chart): number {
    if (![Difficulty.Future, Difficulty.Beyond, Difficulty.Eternal].includes(chart.difficulty)) {
      return 0;
    }
    const score = this.computeScore(chart, play);
    const perfectLosePoint = Math.max(0, Math.min(0.995 - play.perfect / chart.note, 0.095));
    const scoreLosePoint = 28.5 * Math.max(0, Math.min(1 - score / MAX_BASE_SCORE, 0.01));
    return -100 * (chart.constant * (perfectLosePoint + scoreLosePoint));
  }

  computePMConstant(potential: number, overflow: boolean): number {
    const target = potential - 2;
    const gapFactor = target >= 8 ? 10 : 2;
    return (overflow ? Math.ceil : Math.floor)(target * gapFactor) / gapFactor;
  }

  inverseScore(potential: number, constant: number): number {
    const modifier = potential - constant;
    const rawScore = modifier < 1 ? modifier * AA_RATIO + AA_SCORE : (modifier - 1) * EX_RATIO + EX_SCORE;
    return Math.round(rawScore);
  }

  inverseConstant(potential: number, score: number, raw?: boolean): number {
    const modifier = this.computePotentialModifier(score);
    this.logger.info(`分数 => 修正值（单曲潜力值-定数）`, score, modifier);
    const rawConstant = potential - modifier;
    this.logger.info(`公式推算定数`, rawConstant);
    if (raw) return rawConstant;
    return Math.round(rawConstant * 10) / 10;
  }

  computeFar(score: number, note: number, overflow: boolean): number {
    const count = ((MAX_BASE_SCORE - score) * note * 2) / MAX_BASE_SCORE;
    return (overflow ? Math.floor : Math.ceil)(count);
  }

  compareGrade(a: Grade, b: Grade): number {
    return GRADE_INDEX[a] - GRADE_INDEX[b];
  }

  getPotentialRating(potential: number): number {
    if (potential < 0) {
      return -1;
    }
    return [3.5, 7.0, 10.0, 11.0, 12.0, 12.5, 13.0, Infinity].findIndex((bound) => potential < bound);
  }

  mapClearType(clearType: number, shinyPerfectCount: number, chart: Chart): ClearRank {
    if (shinyPerfectCount === chart.note) {
      return ClearRank.Maximum;
    }
    switch (clearType) {
      case 0:
        return ClearRank.TrackLost;
      case 1:
        return ClearRank.NormalClear;
      case 2:
        return ClearRank.FullRecall;
      case 3:
        return ClearRank.PureMemory;
      case 4:
        return ClearRank.EasyClear;
      case 5:
        return ClearRank.HardClear;
    }
    throw new Error(`未知clear_type: ${clearType}`);
  }
  mapDifficulty(d: Difficulty): number {
    return difficultyIndexes[d];
  }
}
