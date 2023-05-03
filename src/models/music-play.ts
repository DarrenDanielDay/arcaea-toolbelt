export interface Song {
  id: string;
  name: string;
  cover: string;
  /**
   * bpm不是数字，因为有会变节奏的曲子
   */
  bpm: string;
}

export enum Difficulty {
  Past = "pst",
  Present = "prs",
  Future = "ftr",
  Beyond = "byd",
}

export interface Chart {
  id: string;
  songId: string;
  byd?: BeyondAddon;
  difficulty: Difficulty;
  constant: number;
  level: string;
  note: number;
}

/**
 * 部分byd谱曲名和曲绘不一样，附加内容
 */
export interface BeyondAddon {
  song?: string;
  cover?: string;
}

export interface SongData extends Song {
  charts: Chart[];
}

export enum Grade {
  EXPlus = "EX+",
  EX = "EX",
  AA = "AA",
  A = "A",
  B = "B",
  C = "C",
  D = "D",
}

export enum ClearRank {
  Maximum = "Max",
  PureMemory = "PM",
  FullRecall = "FR",
  EasyClear = "EC",
  NormalClear = "NC",
  HardClear = "HC",
  TrackLost = "TL",
}

export interface ScoreResult {
  chartId: string;
  score: number;
  grade: Grade;
  potential: number;
}

export type PartnerClearRank = ClearRank.EasyClear | ClearRank.NormalClear | ClearRank.HardClear | ClearRank.TrackLost;

export type PlayerInputType = "score-only" | "screenshot" | "detailed";

export interface NoteResult {
  pure: number;
  perfect: number;
  far: number;
  lost: number;
}

export type PlayResult =
  | {
      type: "score";
      chartId: string;
      score: number;
      clear: ClearRank | null;
    }
  | {
      type: "note";
      chartId: string;
      result: NoteResult;
      clear: ClearRank | null;
    };
