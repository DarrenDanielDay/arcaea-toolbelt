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
  SongIndex,
} from "../models/music-play";
import { B30Response, Profile } from "../models/profile";
import { token } from "classic-di";
import { Chapter, CurrentProgress, NormalWorldMap, RewardType } from "../models/world-mode";

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
  readonly minimumConstant: number;
  readonly maximumPotential: number;
  getSongData(): Promise<SongData[]>;
  getSongIndex(): Promise<SongIndex>;
  searchChart(searchText: string): Promise<SearchResult[]>;
  queryChartsByConstant(min: number, max: number): Promise<SearchResult[]>;
  roll(min: number, max: number): Promise<SearchResult | null>;
}

export interface MusicPlayService {
  readonly ex: number;
  readonly maximumSinglePotential: number;
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
  inverseScore(potential: number, constant: number): number;
  inverseConstant(potential: number, score: number): number;
  computeFar(score: number, note: number, overflow: boolean): number;
  mapClearType(clearType: number, shinyPerfectCount: number, chart: Chart): ClearRank;
  mapDifficulty(d: Difficulty): number;
}

export interface ProfileService {
  getProfile(): Promise<Profile | null>;
  createOrUpdateProfile(username: string, potential: number): Promise<void>;
  getProfileList(): Promise<string[]>;
  syncProfiles(data: Partial<Profile>[]): Promise<void>;
  importProfile(file: File): Promise<void>;
  importDB(file: File, profile: Profile): Promise<void>;
  exportProfile(): Promise<void>;
  useProfile(username: string): Promise<void>;
  addResult(playResult: PlayResult, replace?: boolean): Promise<void>;
  removeResult(chartId: string): Promise<void>;
  b30(profile: Profile): Promise<B30Response>;
}

export interface MapDistance {
  // 暂时只管一个progress的距离
  distance: number;
}

export interface NextRewardInfo {
  img: string;
  remaining: MapDistance;
}

export interface RemainingProgress {
  total: MapDistance;
  nextReward: NextRewardInfo | null;
}

export type WorldMapBonus =
  | {
      type: "legacy";
      fragment: number;
      stamina: number;
    }
  | {
      type: "new";
      x4: boolean;
    };

export interface InverseProgressSolution {
  invalidMessage: string | null;
  world: WorldMapBonus | null;
  lowPtt: number;
  highPtt: number;
  pmRange: [number, number] | false;
}

export interface WorldModeService {
  getLongtermMaps(): Promise<Chapter[]>;
  getEventMaps(): Promise<NormalWorldMap[]>;
  getMapRewards(map: NormalWorldMap): Partial<Record<RewardType, string[]>>;
  computePlayResult(potential: number): number;
  computeBasicProgress(step: number, potential: number): number;
  computeProgress(step: number, potential: number, bonus: WorldMapBonus | null): number;
  computeProgressRange(
    map: NormalWorldMap,
    currentProgress: CurrentProgress,
    targetLevel: number
  ): [low: number, high: number];
  computeRemainingProgress(map: NormalWorldMap, currentProgress: CurrentProgress): RemainingProgress;
  inverseProgress(step: number, progressRange: [low: number, high: number]): InverseProgressSolution[];
  inverseBeyondBoost(difference: number, score: number): number;
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
