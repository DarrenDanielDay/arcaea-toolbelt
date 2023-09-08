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

export interface AssetsService {
  getCover(chart: Chart, song: Song, hd?: boolean): Promise<string>;
  getClearImg(clearType: ClearRank): Promise<string>;
  getGradeImg(scoreRank: Grade): Promise<string>;
}

export interface SearchResult {
  chart: Chart;
  song: Song;
  sort: number;
  title: string;
  cover: string;
  constant: number;
  difficulty: Difficulty;
}

export interface DifficultyStatistics {
  /**
   * 谱面个数
   */
  count: number;
  /**
   * 物量总和
   */
  notes: number;
}

export type ChartDifficultyStatistics = Record<Difficulty, DifficultyStatistics>;

export interface ChartStatistics {
  difficulties: ChartDifficultyStatistics;
  maximumConstant: number;
  minimumConstant: number;
}

export interface ChartService {
  getSongData(): Promise<SongData[]>;
  getSongIndex(): Promise<SongIndex>;
  getStatistics(): Promise<ChartStatistics>;
  searchChart(searchText: string): Promise<SearchResult[]>;
  queryChartsByConstant(min: number, max: number): Promise<SearchResult[]>;
  roll(min: number, max: number): Promise<SearchResult | null>;
  getName(chart: Chart, song: Song): string;
  getCover(chart: Chart, song: Song): string;
}

export interface MusicPlayStatistics {
  readonly maximumPotential: number;
  readonly maximumSinglePotential: number;
}

export interface MusicPlayService {
  readonly ex: number;
  readonly maxBase: number;
  getStatistics(): Promise<MusicPlayStatistics>;
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

export interface ScoreStatistics {
  /**
   * 各个难度分层的统计信息
   */
  difficulties: Record<Difficulty, BestStatistics>;
  /**
   * 整体统计信息
   */
  general: BestStatistics;
}

export interface BestStatistics {
  /**
   * 游玩过（存档中成绩）的个数
   */
  total: number;
  /**
   * 通关个数，不包括Track Lost
   */
  clear: number;
  /**
   * Full Recall个数
   */
  fr: number;
  /**
   * Pure Memory个数
   */
  pm: number;
  /**
   * 理论值个数
   */
  max: number;
  /**
   * EX以上谱面平均准度，计算方法为平均分/1kw，PM谱面不算大P
   */
  acc: number;
  /**
   * 大P准度，计算方法：大P总数/总Pure数，仅计算有判定信息的成绩
   */
  pacc: number;
  /**
   * 有成绩的谱面距离全部理论相差的分数
   */
  rest: number;
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
  deleteProfile(username: string): Promise<void>;
  b30(profile: Profile): Promise<B30Response>;
  getProfileStatistics(profile: Profile): Promise<ScoreStatistics>;
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
  inverseProgress(step: number, progressRange: [low: number, high: number]): Promise<InverseProgressSolution[]>;
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

export const $AssetsService = token<AssetsService>("assets");
export const $ChartService = token<ChartService>("chart");
export const $MusicPlayService = token<MusicPlayService>("music-play");
export const $ProfileService = token<ProfileService>("profile");
export const $WorldModeService = token<WorldModeService>("world-mode");
export const $CrossSiteScriptPluginService = token<CrossSiteScriptPluginService>("cross-site-script");
