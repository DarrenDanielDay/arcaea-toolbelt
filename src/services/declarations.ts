import * as lowiro from "./web-api";
import {
  Chart,
  ClearRank,
  Difficulty,
  Grade,
  NoteResult,
  PartnerClearRank,
  PlayResult,
  ScoreResult,
  Song,
  SongData,
} from "../models/music-play";
import { B30Response, Profile } from "../models/profile";
import { token } from "./di";
import { Chapter, NormalWorldMap, RewardType } from "../models/world-mode";

export interface SearchResult {
  chart: Chart;
  song: Song;
  sort: number;
  title: string;
  cover: string;
  constant: number;
  difficulty: Difficulty;
}

export interface ChartService {
  readonly maximumConstant: number;
  getSongData(): Promise<SongData[]>;
  searchChart(searchText: string): Promise<SearchResult[]>;
  queryChartsByConstant(min: number, max: number): Promise<SearchResult[]>;
  roll(min: number, max: number): Promise<SearchResult | null>;
}

export interface MusicPlayService {
  inferNoteResult(
    chart: Chart,
    perfect: number | null,
    far: number | null,
    lost: number | null,
    score: number | null
  ): NoteResult | null;
  computeScore(chart: Chart, noteResult: NoteResult): number;
  computePotential(score: number, constant: Chart): number;
  computeGrade(score: number): Grade;
  computeClearRank(play: NoteResult, chart: Chart, clear: PartnerClearRank | null): ClearRank | null;
  computeScoreResult(score: number, chart: Chart): ScoreResult;
  computePMConstant(potential: number, overflow: boolean): number;
}

export interface ProfileService {
  readonly profile: Profile | null;
  createOrUpdateProfile(username: string, potential: number): Promise<void>;
  getProfileList(): Promise<string[]>;
  syncProfiles(data: Partial<Profile>[]): Promise<void>;
  importProfile(file: File): Promise<void>;
  exportProfile(): Promise<void>;
  useProfile(username: string): Promise<void>;
  addResult(playResult: PlayResult, replace?: boolean): Promise<void>;
  removeResult(chartId: string): Promise<void>;
  b30(): Promise<B30Response>;
}

export interface InverseProgressSolution {
  invalidMessage: string | null;
  world:
    | {
        type: "legacy";
        fragment: number;
        stamina: number;
      }
    | {
        type: "new";
        x4: boolean;
      }
    | null;
  lowPtt: number;
  highPtt: number;
  pmRange: [number, number] | false;
}

export interface WorldModeService {
  getLongtermMaps(): Promise<Chapter[]>;
  getEventMaps(): Promise<NormalWorldMap[]>;
  getMapRewards(map: NormalWorldMap): Partial<Record<RewardType, string[]>>;
  computeBasicProgress(step: number, potential: number): number;
  computeProgress(step: number, potential: number, fragment?: number, x4?: boolean): number;
  inverseProgress(step: number, progressRange: [low: number, high: number]): InverseProgressSolution[];
}

export interface CrossSiteScriptPluginService {
  getProfile(): Promise<lowiro.UserProfile>;
  startQueryBests(
    profile: lowiro.UserProfile,
    targetPlayers: string[],
    onProgress: (message: string) => void,
    onResult: (profiles: Profile[]) => void,
    onError?: (message: string) => void
  ): AbortController;
  syncProfiles(profiles: Profile[]): Promise<void>;
  syncMe(profile: lowiro.UserProfile): Promise<void>;
}

export const $ChartService = token<ChartService>("chart");
export const $MusicPlayService = token<MusicPlayService>("music-play");
export const $ProfileService = token<ProfileService>("profile");
export const $WorldModeService = token<WorldModeService>("world-mode");
export const $CrossSiteScriptPluginService = token<CrossSiteScriptPluginService>("cross-site-script");
