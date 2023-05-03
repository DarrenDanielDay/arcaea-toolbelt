import { Chart, ClearRank, Grade, NoteResult, PartnerClearRank, ScoreResult } from "../models/music-play";
import { MusicPlayService } from "./declarations";

const MAX_BASE_SCORE = 1000_0000;
const EX_PLUS_SCORE = 990_0000;
const EX_SCORE = 980_0000;
const AA_SCORE = 950_0000;
const A_SCORE = 920_0000;
const B_SCORE = 890_0000;
const C_SCORE = 860_0000;

export class MusicPlayServiceImpl implements MusicPlayService {
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
        return ClearRank.FullRecall
      }
    }
    return clear;
  }
  computePotential(score: number, chart: Chart): number {
    const { constant } = chart;
    if (score >= MAX_BASE_SCORE) {
      // 不考虑非PM的超过1000W分，目前没有这样的谱
      return constant + 2;
    }
    if (score >= EX_SCORE) {
      return (score - EX_SCORE) / 20_0000 + constant + 1;
    }
    return Math.max(0, (score - EX_SCORE) / 30_0000 + constant + 1);
  }
  computeScoreResult(score: number, chart: Chart): ScoreResult {
    return {
      grade: this.computeGrade(score),
      chartId: chart.id,
      score,
      potential: this.computePotential(score, chart),
    };
  }
}
