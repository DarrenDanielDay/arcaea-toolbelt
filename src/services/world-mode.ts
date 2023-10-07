import {
  Chapter,
  CharacterData,
  CurrentProgress,
  MapPlatform,
  NormalWorldMap,
  NormalWorldMapData,
  NormalWorldMapPlatforms,
  RewardType,
} from "../models/world-mode";
import {
  $AssetsResolver,
  $ChartService,
  $MusicPlayService,
  $WorldModeService,
  AssetsResolver,
  ChartService,
  ChartStatistics,
  InverseProgressSolution,
  MapDistance,
  MusicPlayService,
  MusicPlayStatistics,
  NextRewardInfo,
  RemainingProgress,
  WorldMapBonus,
  WorldModeService,
} from "./declarations";
import characters from "../data/character-data.json";
import items from "../data/item-data.json";
import { SongIndex } from "../models/music-play";
import { Indexed, indexBy } from "../utils/collections";
import { Injectable } from "classic-di";
import { inferRange } from "../utils/math";
const BASE_PROG = 2.5;
const BASE_BOOST = 27;
const POTENTIAL_FACTOR = 2.45;
const CHARACTER_FACTOR_RATIO = 50;
@Injectable({
  requires: [$ChartService, $MusicPlayService, $AssetsResolver] as const,
  implements: $WorldModeService,
})
export class WorldModeServiceImpl implements WorldModeService {
  itemImages = Object.fromEntries(items.map((item) => [item.name, item.img]));
  #characterIndex: Indexed<CharacterData> | null = null;
  #songIndex: SongIndex | null = null;
  constructor(
    private readonly chart: ChartService,
    private readonly music: MusicPlayService,
    private readonly resolver: AssetsResolver
  ) {}

  async getLongtermMaps(): Promise<Chapter[]> {
    const chapters = await import("../data/world-maps-longterm.json");
    const songIndex = await this.getSongIndex();
    return chapters.map((c) => ({ ...c, maps: c.maps.map((m) => this.withRewardImgs(m, songIndex)) }));
  }

  async getEventMaps(): Promise<NormalWorldMap[]> {
    const maps = await import("../data/world-maps-events.json");
    const songIndex = await this.getSongIndex();
    // TODO 只显示当前可用的活动图
    return maps.map((m) => this.withRewardImgs(m, songIndex));
  }

  getMapRewards(map: NormalWorldMap): Partial<Record<RewardType, string[]>> {
    const res: Partial<Record<RewardType, string[]>> = {};
    const { platforms } = map;
    for (const key in platforms) {
      const platform = platforms[key];
      if (!platform) {
        continue;
      }
      const { reward } = platform;
      if (!reward) {
        continue;
      }
      (res[reward.type] ??= []).push(
        reward.type === RewardType.Background || reward.type === RewardType.Item
          ? reward.name
          : reward.type === RewardType.Character
          ? characters.find((c) => c.id === reward.id)!.name.zh
          : reward.name
      );
    }
    return res;
  }

  computePlayResult(potential: number) {
    return BASE_PROG + POTENTIAL_FACTOR * Math.sqrt(potential);
  }

  computeBasicProgress(step: number, potential: number): number {
    return (this.computePlayResult(potential) * step) / CHARACTER_FACTOR_RATIO;
  }

  computeProgress(step: number, potential: number, bonus: WorldMapBonus | null): number {
    let result = this.computeBasicProgress(step, potential);
    if (bonus) {
      if (bonus.type === "legacy") {
        result *= bonus.fragment;
        result *= bonus.stamina;
      } else if (bonus.type === "new") {
        if (bonus.x4) result *= 4;
      }
    }
    return result;
  }

  computeProgressRange(
    map: NormalWorldMap,
    currentProgress: CurrentProgress,
    targetLevel: number
  ): [min: number, max: number] {
    let min = this.computeDistance(map, currentProgress, targetLevel, false).distance,
      max = this.computeDistance(map, currentProgress, targetLevel, true).distance;
    if (min) {
      // 超出0.1保证进入格子
      min += 0.1;
    }
    if (max) {
      // 少0.1保证不过头
      max -= 0.1;
    }
    return [min, max];
  }

  computeRemainingProgress(map: NormalWorldMap, currentProgress: CurrentProgress): RemainingProgress {
    const { level: reachedLevel } = currentProgress;
    const platforms = map.platforms;
    let nextRewardData = null;
    loop: for (let currentLevel = reachedLevel; currentLevel <= platforms.length; currentLevel++) {
      const platform = platforms[currentLevel]!;
      const { reward } = platform;
      if (reward) {
        switch (reward.type) {
          case RewardType.Character:
          case RewardType.Song:
            nextRewardData = {
              img: reward.img,
              level: currentLevel,
            };
            break loop;
        }
      }
    }
    let nextReward: NextRewardInfo | null = null;
    if (nextRewardData) {
      const distance = this.computeDistance(map, currentProgress, nextRewardData.level, false);
      nextReward = {
        img: nextRewardData.img,
        remaining: distance,
      };
    }
    const totalDistance = this.computeDistance(map, currentProgress, platforms.length, true);
    return {
      nextReward,
      total: totalDistance,
    };
  }

  inversePlayResult(progress: number, step: number) {
    return (progress * CHARACTER_FACTOR_RATIO) / step;
  }

  private inverseBasicProgress(progress: number, step: number, overflow: boolean): number {
    const rootOfPotential = (this.inversePlayResult(progress, step) - BASE_PROG) / POTENTIAL_FACTOR;
    if (rootOfPotential < 0) {
      // 平方根为负数，进度必然超过
      if (overflow) {
        // 作为下限的时候，可以用0
        return 0;
      }
      return NaN;
    }
    const potential = rootOfPotential ** 2;
    return potential;
  }

  async inverseProgress(step: number, range: [low: number, high: number]): Promise<InverseProgressSolution[]> {
    const chartStats = await this.chart.getStatistics();
    const musicStats = await this.music.getStatistics();
    const solutions: InverseProgressSolution[] = [];
    const [low, high] = range;
    // 无加成
    solutions.push(this.solveProgressRange(step, range, chartStats, musicStats));
    // 新图
    {
      const solution = this.solveProgressRange(step, [low / 4, high / 4], chartStats, musicStats);
      solution.world = {
        type: "new",
        x4: true,
      };
      solutions.push(solution);
    }
    // 老图
    // 体力倍数
    for (const stamina of [2, 4, 6]) {
      // 残片加成
      for (const fragment of [1, 1.1, 1.25, 1.5]) {
        const ratio = fragment * stamina;
        const solution = this.solveProgressRange(step, [low / ratio, high / ratio], chartStats, musicStats);
        solution.world = {
          type: "legacy",
          fragment,
          stamina,
        };
        solutions.push(solution);
      }
    }
    return solutions;
  }

  inverseConstantRange(playResult: number, score: number, step: number, progress: number): [number, number] | null {
    if (!score) return null;
    let min = -Infinity,
      max = Infinity;
    if (playResult) {
      const base = Math.floor(playResult * 10);
      min = (base * 10) / 100;
      max = (base * 10 + 10) / 100;
    }
    if (step && progress) {
      // TODO 验证实际显示的progress是截尾还是舍入
      const [minProgress, maxProgress] = inferRange(progress, 1, false);
      const minPlayResult = this.inversePlayResult(minProgress, step);
      const maxPlayResult = this.inversePlayResult(maxProgress, step);
      // 缩小范围
      min = Math.max(min, minPlayResult);
      max = Math.min(max, maxPlayResult);
    }
    if (!(isFinite(min) && isFinite(max))) return null;
    return [this.inverseConstant(min, score), this.inverseConstant(max, score)];
  }

  inverseBeyondBoost(difference: number, score: number, raw?: boolean): number {
    const potentialRoot = (difference - BASE_BOOST) / POTENTIAL_FACTOR;
    if (potentialRoot < 0) {
      return NaN;
    }
    const potential = potentialRoot ** 2;
    return this.music.inverseConstant(potential, score, raw);
  }

  inferConstant(min: number, max: number): number[] {
    const possible: number[] = [];
    const min10 = Math.ceil(min * 10);
    const max10 = Math.floor(max * 10);
    for (let rating10 = min10; rating10 <= max10; rating10++) {
      // level 7 以下最小单位为.5
      if (rating10 >= 80 || rating10 % 5 === 0) {
        possible.push(rating10 / 10);
      }
    }
    return possible;
  }

  private getCharacterIndex() {
    return (this.#characterIndex ??= indexBy(characters, (c) => c.id));
  }

  private async getSongIndex() {
    return (this.#songIndex ??= indexBy(await this.chart.getSongData(), (s) => s.id));
  }

  private solveProgressRange(
    step: number,
    [low, high]: [number, number],
    chartStats: ChartStatistics,
    musicStats: MusicPlayStatistics
  ): InverseProgressSolution {
    const maximum = chartStats.maximumConstant;
    const minimum = chartStats.minimumConstant;
    const maximumPtt = musicStats.maximumSinglePotential;
    const lowPtt = this.inverseBasicProgress(low, step, true);
    const highPtt = Math.min(maximumPtt, this.inverseBasicProgress(high, step, false));
    const solution: InverseProgressSolution = {
      world: null,
      highPtt,
      lowPtt,
      invalidMessage: null,
      pmRange: false,
    };
    if (isNaN(highPtt)) {
      solution.invalidMessage = "无法降落，放置0分结算也会前进过头";
    } else if (lowPtt > maximumPtt) {
      solution.invalidMessage = `PM最高定数${maximum}谱面也无法前进这么多`;
    } else {
      const minConstant = Math.max(minimum, this.music.computePMConstant(lowPtt, true));
      const maxConstant = this.music.computePMConstant(highPtt, false);
      if (maxConstant <= maximum && minConstant <= maxConstant) {
        solution.pmRange = [minConstant, maxConstant];
      }
    }
    return solution;
  }

  private findItemImage(name: string): string {
    const result = this.itemImages[name];
    return result || "";
  }

  private withRewardImgs(map: NormalWorldMapData, songIndex: SongIndex): NormalWorldMap {
    const characterIndex = this.getCharacterIndex();
    return {
      ...map,
      platforms: Object.entries(map.platforms)
        .map<[number, MapPlatform | null | undefined]>(([key, value]) => {
          const level = +key + 1;
          if (!value) {
            return [level, value];
          }
          if (!value.reward) {
            return [level, { ...value, reward: undefined }];
          }
          const { reward } = value;
          return [
            level,
            {
              ...value,
              reward: (() => {
                const type = reward.type;
                switch (reward.type) {
                  case RewardType.Background:
                    return reward;
                  case RewardType.Character:
                    return { ...reward, img: characterIndex[reward.id]!.image };
                  case RewardType.Item:
                    return {
                      type: RewardType.Item,
                      count: reward.count,
                      name: reward.name,
                      img: this.findItemImage(reward.name)!,
                    };
                  case RewardType.Song:
                    const song = songIndex[reward.id]!;
                    if (!song) {
                      debugger;
                    }
                    return {
                      ...reward,
                      img: this.resolver.resolveCover(song.charts[2]!, song, false).href,
                      name: song.name,
                    };
                  default:
                    throw new Error(`Unknown reward type: ${type}`);
                }
              })(),
            },
          ];
        })
        .reduce<NormalWorldMapPlatforms>(
          (acc, [k, v], i) => {
            acc[k] = v;
            acc.length = i + 1;
            return acc;
          },
          { length: 0 }
        ),
    };
  }

  private computeDistance(
    map: NormalWorldMap,
    currentProgress: CurrentProgress,
    targetLevel: number,
    overflow: boolean
  ): MapDistance {
    let distance = 0;
    let { level: reachedLevel, progress } = currentProgress;
    const { platforms } = map;
    for (let currentLevel = reachedLevel; currentLevel <= targetLevel; currentLevel++) {
      if (!overflow && currentLevel === targetLevel) {
        break;
      }
      distance += currentLevel === reachedLevel ? progress : platforms[currentLevel]!.length;
    }
    return {
      distance,
    };
  }

  private inverseConstant(playResult: number, score: number) {
    const potentialRoot = (playResult - BASE_PROG) / POTENTIAL_FACTOR;
    if (potentialRoot < 0) return NaN;
    return this.music.inverseConstant(potentialRoot ** 2, score, true);
  }
}
