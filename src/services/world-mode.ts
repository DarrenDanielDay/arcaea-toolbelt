import {
  Chapter,
  ChapterData,
  CharacterData,
  MapPlatform,
  NormalWorldMap,
  NormalWorldMapData,
  RewardType,
} from "../models/world-mode";
import { ChartService, WorldModeService } from "./declarations";
import characters from "../data/character-data.json";
import items from "../data/item-data.json";
import { SongData } from "../models/music-play";
const BASE_PROG = 2.5;
const POTENTIAL_FACTOR = 2.45;
const CHARACTER_FACTOR_RATIO = 50;

export class WorldModeServiceImpl implements WorldModeService {
  itemImages = Object.fromEntries(items.map((item) => [item.name, item.img]));

  constructor(private readonly chart: ChartService) {}

  async getLongtermMaps(): Promise<Chapter[]> {
    const chapters = await this.getAllChapterData();
    return this.withRewardImgs(chapters, characters, await this.chart.getSongData()).slice(0, -1);
  }
  async getEventMaps(): Promise<NormalWorldMap[]> {
    const maps = await this.getAllChapterData();
    // TODO 只显示当前可用的活动图
    return this.withRewardImgs(maps, characters, await this.chart.getSongData()).at(-1)!.maps;
  }

  getMapRewards(map: NormalWorldMapData): Partial<Record<RewardType, string[]>> {
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
          : reward.id
      );
    }
    return res;
  }

  computeBasicProgress(step: number, potential: number): number {
    return ((BASE_PROG + POTENTIAL_FACTOR * Math.sqrt(potential)) * step) / CHARACTER_FACTOR_RATIO;
  }

  computeProgress(step: number, potential: number, fragment?: number | undefined, x4?: boolean | undefined): number {
    let result = this.computeBasicProgress(step, potential);
    if (fragment && fragment !== 1 && !!x4) {
      throw new Error(`残片加成与源韵强化无法同时生效`);
    }
    if (fragment) {
      result *= fragment;
    }
    if (x4) {
      result *= 4;
    }
    return result;
  }

  antiBasicProgress(progress: number, step: number): number {
    return (((progress * CHARACTER_FACTOR_RATIO) / step - BASE_PROG) / POTENTIAL_FACTOR) ** 2;
  }

  private async getAllChapterData(): Promise<ChapterData[]> {
    return await import("../data/world-maps.json");
  }

  private findItemImage(name: string): string {
    const result = this.itemImages[name];
    if (!result) {
      console.error(`物品 ${name} 图片未找到`);
      console.log(this.itemImages);
    }
    return result!;
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
                      return { ...reward, img: songMap.get(reward.id)!.cover };
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
