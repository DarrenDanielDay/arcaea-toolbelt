import { Chart, ClearRank, NoteResult, PlayResult, ScoreResult, Song } from "./music-play";
import { CharacterInstanceData } from "./world-mode";

export interface ProfileV1 {
  version: 1;
  username: string;
  potential: string;
  best: {
    [chartId: string]: PlayResult;
  };
  characters?: CharacterInstanceData[];
}
export interface ProfileV2 {
  version: 2;
  username: string;
  potential: string;
  best: {
    [chartId: string]: PlayResult;
  };
  characters?: CharacterInstanceData[];
}

export { type ProfileV2 as Profile };

export interface BestResultItem {
  no: number;
  song: Song;
  chart: Chart;
  note: NoteResult | null;
  score: ScoreResult;
  clear: ClearRank | null;
  date?: number | null;
}

export interface B30Response {
  queryTime: number;
  username: string;
  potential: string;
  maxPotential: number;
  minPotential: number;
  b30: BestResultItem[];
  b31_39: BestResultItem[];
  b30Average: number;
  r10Average: number;
}
