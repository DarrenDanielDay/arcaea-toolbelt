import { Chart, ClearRank, NoteResult, PlayResult, ScoreResult, Song } from "./music-play";

export interface Profile {
  version: number;
  username: string;
  potential: string;
  best: {
    [chartId: string]: PlayResult;
  };
}

export interface BestResultItem {
  no: number;
  song: Song;
  chart: Chart;
  note: NoteResult | null;
  score: ScoreResult;
  clear: ClearRank | null;
}

export interface B30Response {
  username: string;
  potential: string;
  maxPotential: number;
  minPotential: number;
  b30: BestResultItem[];
  b31_39: BestResultItem[];
  b30Average: number;
  r10Average: number;
}
