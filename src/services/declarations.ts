import * as lowiro from "./web-api";
import {
  Chart,
  ClearRank,
  Difficulty,
  Grade,
  NoteResult,
  PartnerClearRank,
  PlayResult,
  Rating,
  ScoreResult,
  Song,
  SongData,
  SongIndex,
} from "../models/music-play";
import { B30Response, BestResultItem, Profile, ProfileUpdatePayload } from "../models/profile";
import { token } from "classic-di";
import { Chapter, CurrentProgress, NormalWorldMap, RewardType } from "../models/world-mode";
import type { Signal } from "hyplate/types";
import {
  CharacterData,
  CharacterImage,
  CharacterIndex,
} from "../models/character";
import { PromiseOr } from "../utils/misc";

export interface DatabaseContext {
  getDB(): Promise<IDBDatabase>;
  transaction(stores: string[], mode?: IDBTransactionMode): Promise<IDBTransaction>;
  objectStore(store: string, mode?: IDBTransactionMode): Promise<IDBObjectStore>;
}

export interface CacheDBContext extends DatabaseContext {
  readonly caches: string;
}

export interface AppDatabaseContext extends CacheDBContext {
  readonly preference: string;
  readonly profiles: string;
}

export type ColorTheme = "dark" | "light";

export interface Preference {
  theme: ColorTheme;
  ghproxy: boolean;
}

export interface PreferenceService {
  get(): Promise<Preference>;
  update(patch: Partial<Preference>): Promise<void>;
  signal<K extends keyof Preference>(name: K): Signal<Preference[K]>;
}

export interface AssetsResolverStrategy {
  base(): string;
  readonly usingProxy: Signal<boolean>;
  useProxy(proxy: boolean): void;
}

export interface AssetsResolver {
  resolve(path: string): URL;
  resoveCharacterImage(image: CharacterImage): URL;
  resolvePotentialBadge(rating: number): URL;
  resolveCover(chart: Chart, song: Song, hd: boolean): URL;
  resolveUnknownCover(): URL;
  resolveClearImg(clearType: ClearRank): URL;
  resolveGradeImg(scoreRank: Grade): URL;
}

export interface AssetsService {
  /**
   * @param url 资源地址
   * @param noCache 使用强缓存
   */
  getAssets(url: URL | string, noCache?: boolean): PromiseOr<string>;
  cacheUsage(): Promise<number>;
  clearCache(): Promise<void>;
}

export interface SearchResult {
  chart: Chart;
  song: Song;
  bpm: string;
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
  ratings: Rating[];
  maximumConstant: number;
  minimumConstant: number;
}

export interface ChartService {
  freePacks: string[];
  getSongData(): Promise<SongData[]>;
  getSongIndex(): Promise<SongIndex>;
  getStatistics(): Promise<ChartStatistics>;
  searchChart(searchText: string): Promise<SearchResult[]>;
  queryChartsByConstant(min: number, max: number): Promise<SearchResult[]>;
  roll(min: number, max: number): Promise<SearchResult | null>;
  getName(chart: Chart, song: Song): string;
  getBPM(chart: Chart, song: Song): string;
  getCover(chart: Chart, song: Song): string;
}

export interface CharacterService {
  getCharacterIndex(): Promise<CharacterIndex>;
  getAllCharacters(): Promise<CharacterData[]>;
}

export interface MusicPlayStatistics {
  readonly maximumPotential: number;
  readonly maximumSinglePotential: number;
}

export interface MusicPlayService {
  readonly ex: number;
  readonly maxBase: number;
  readonly grades: Grade[];
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
  inverseConstant(potential: number, score: number, raw?: boolean): number;
  computeFar(score: number, note: number, overflow: boolean): number;
  compareGrade(a: Grade, b: Grade): number;
  mapClearType(clearType: number, shinyPerfectCount: number, chart: Chart): ClearRank;
  mapDifficulty(d: Difficulty): number;
}

export interface ImportResult {
  count: number;
  difficulties: Record<Difficulty, number>;
  skipped: string[];
}

export interface BestStatisticsQuery {
  /**
   * 标级
   */
  rating?: Rating;
  /**
   * 难度
   */
  difficulty?: Difficulty;
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
   * 有判定信息的总谱面数
   */
  detailed: number;
  /**
   * 有判定信息的大P总数
   */
  perfect: number;
  /**
   * 小P总数
   */
  great: number;
  /**
   * 有判定信息的游玩谱面总物量数
   */
  notes: number;
  /**
   * 大P准度，计算方法：{@link perfect} / {@link notes}
   */
  pacc: number;
  /**
   * 有成绩的谱面距离全部理论相差的分数
   */
  rest: number;
}

export type ReportProgress = (message: string) => void;

export interface B30Options {
  packs: string[];
  filter: (result: BestResultItem) => boolean;
}

export interface ProfileService {
  checkMigration(): Promise<null | (() => Promise<void>)>;
  formatPotential(potential: number): string;
  getProfile(): Promise<Profile | null>;
  createOrUpdateProfile(username: string, potential: number): Promise<void>;
  getProfileList(): Promise<string[]>;
  syncProfiles(data: ProfileUpdatePayload[]): Promise<void>;
  importProfile(file: File): Promise<void>;
  importDB(file: File, profile: Profile, report?: ReportProgress): Promise<ImportResult>;
  exportProfile(profile: Profile): Promise<void>;
  useProfile(username: string): Promise<void>;
  addResult(playResult: PlayResult, replace?: boolean): Promise<void>;
  removeResult(chartId: string): Promise<void>;
  deleteProfile(username: string): Promise<void>;
  b30(profile: Profile, options?: Partial<B30Options>): Promise<B30Response>;
  generateMaxProfile(): Promise<Profile>;
  getProfileStatistics(profile: Profile, query?: BestStatisticsQuery): Promise<BestStatistics>;
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
  inversePlayResult(progress: number, step: number): number;
  inverseProgress(step: number, progressRange: [low: number, high: number]): Promise<InverseProgressSolution[]>;
  inverseConstantRange(playResult: number, score: number, step: number, progress: number): [number, number] | null;
  inverseBeyondBoost(difference: number, score: number, raw?: boolean): number;
  inferConstant(min: number, max: number): number[];
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

export const $Database = token<AppDatabaseContext>("database");
export const $PreferenceService = token<PreferenceService>("preference");
export const $AssetsResolverStrategy = token<AssetsResolverStrategy>("assets-resolver-strategy");
export const $AssetsResolver = token<AssetsResolver>("assets-resolver");
export const $AssetsService = token<AssetsService>("assets");
export const $CharacterService = token<CharacterService>("character");
export const $ChartService = token<ChartService>("chart");
export const $MusicPlayService = token<MusicPlayService>("music-play");
export const $ProfileService = token<ProfileService>("profile");
export const $WorldModeService = token<WorldModeService>("world-mode");
export const $CrossSiteScriptPluginService = token<CrossSiteScriptPluginService>("cross-site-script");
