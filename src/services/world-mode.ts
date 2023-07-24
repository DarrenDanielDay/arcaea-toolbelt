import { Chapter, ChapterData, CharacterData, MapPlatform, NormalWorldMap, RewardType } from "../models/world-mode";
import {
  ChartService,
  InverseProgressSolution,
  MusicPlayService,
  WorldMapBonus,
  WorldModeService,
} from "./declarations";
import characters from "../data/character-data.json";
import items from "../data/item-data.json";
import { SongData } from "../models/music-play";
const BASE_PROG = 2.5;
const BASE_BOOST = 27;
const POTENTIAL_FACTOR = 2.45;
const CHARACTER_FACTOR_RATIO = 50;

export class WorldModeServiceImpl implements WorldModeService {
  itemImages = Object.fromEntries(items.map((item) => [item.name, item.img]));

  constructor(private readonly chart: ChartService, private readonly music: MusicPlayService) {}

  async getLongtermMaps(): Promise<Chapter[]> {
    const chapters = await this.getAllChapterData();
    return this.withRewardImgs(chapters, characters, await this.chart.getSongData()).slice(0, -1);
  }
  async getEventMaps(): Promise<NormalWorldMap[]> {
    const maps = await this.getAllChapterData();
    // TODO 只显示当前可用的活动图
    return this.withRewardImgs(maps, characters, await this.chart.getSongData()).at(-1)!.maps;
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

  computeBasicProgress(step: number, potential: number): number {
    return ((BASE_PROG + POTENTIAL_FACTOR * Math.sqrt(potential)) * step) / CHARACTER_FACTOR_RATIO;
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
    completed: number,
    rest: number,
    targetLevel: number
  ): [min: number, max: number] {
    const platforms = map.platforms;
    let min = 0,
      max = rest;
    for (let currentLevel = completed + 1; currentLevel < targetLevel; currentLevel++) {
      const platform = platforms[currentLevel - 1]!;
      min += currentLevel === completed + 1 ? rest : platform.length;
    }
    for (let currentLevel = completed + 2; currentLevel <= targetLevel; currentLevel++) {
      const platform = platforms[currentLevel - 1]!;
      max += platform.length;
    }
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

  private inverseBasicProgress(progress: number, step: number, overflow: boolean): number {
    const rootOfPotential = ((progress * CHARACTER_FACTOR_RATIO) / step - BASE_PROG) / POTENTIAL_FACTOR;
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

  inverseProgress(step: number, range: [low: number, high: number]): InverseProgressSolution[] {
    const solutions: InverseProgressSolution[] = [];
    const [low, high] = range;
    // 无加成
    solutions.push(this.solveProgressRange(step, range));
    // 新图
    {
      const solution = this.solveProgressRange(step, [low / 4, high / 4]);
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
        const solution = this.solveProgressRange(step, [low / ratio, high / ratio]);
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

  inverseBeyondBoost(difference: number, score: number): number {
    const potentialRoot = (difference - BASE_BOOST) / POTENTIAL_FACTOR;
    if (potentialRoot < 0) {
      return NaN;
    }
    const potential = potentialRoot ** 2;
    return this.music.inverseConstant(potential, score);
  }

  private solveProgressRange(step: number, [low, high]: [number, number]): InverseProgressSolution {
    const maximum = this.chart.maximumConstant;
    const minimum = this.chart.minimumConstant;
    const maximumPtt = maximum + 2;
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

  private async getAllChapterData(): Promise<ChapterData[]> {
    return await import("../data/world-maps.json");
  }

  private findItemImage(name: string): string {
    const result = this.itemImages[name];
    return result || "";
  }

  private withRewardImgs(chapters: ChapterData[], characters: CharacterData[], songs: SongData[]): Chapter[] {
    const characterMap = new Map(characters.map((c) => [c.id, c]));
    const songMap = new Map(songs.map((s) => [s.id, s]));
    return chapters.map((c) => ({
      ...c,
      maps: c.maps.map((m) => ({
        ...m,
        platforms: Object.entries(m.platforms)
          .map<[number, MapPlatform | null | undefined]>(([key, value]) => {
            if (!value) {
              return [+key, value];
            }
            if (!value.reward) {
              return [+key, { ...value, reward: undefined }];
            }
            const { reward } = value;
            return [
              +key,
              {
                ...value,
                reward: (() => {
                  const type = reward.type;
                  switch (reward.type) {
                    case RewardType.Background:
                      return reward;
                    case RewardType.Character:
                      return { ...reward, img: characterMap.get(reward.id)!.image };
                    case RewardType.Item:
                      return {
                        type: RewardType.Item,
                        count: reward.count,
                        name: reward.name,
                        img: this.findItemImage(reward.name)!,
                      };
                    case RewardType.Song:
                      const song = songMap.get(reward.id)!;
                      return { ...reward, img: song.cover, name: song.name };
                    default:
                      throw new Error(`Unknown reward type: ${type}`);
                  }
                })(),
              },
            ];
          })
          .reduce<{ [key: number]: MapPlatform | undefined | null }>((acc, [k, v]) => {
            acc[k] = v;
            return acc;
          }, {}),
      })),
    }));
  }
}
