export interface Song {
  id: string;
  alias: string[];
  /**
   * 直接使用游戏内id作为id，不再需要两个id
   */
  // sid: string;
  name: string;
  /*
  不再使用
  cover: string;
  */
  pack: string;
  dl: boolean;
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

export interface ChartOverride {
  url?: string;
  name?: string;
  cover?: boolean;
}

export interface Chart {
  // 原来的基于wiki链接的id改为游戏内id
  id: string;
  songId: string;
  difficulty: Difficulty;
  constant: number;
  level: number;
  plus?: boolean;
  note: number;
  override?: ChartOverride;
}

export interface SongData extends Song {
  charts: Chart[];
}

export interface SongIndex {
  [songId: string]: SongData;
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
      date?: number | null;
    }
  | {
      type: "note";
      chartId: string;
      result: NoteResult;
      clear: ClearRank | null;
      date?: number | null;
    };
