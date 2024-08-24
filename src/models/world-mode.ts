/**
 * 道具
 */
export interface ItemData {
  name: string;
  img: string;
}

export interface RewardSummaryItem {
  count: number;
  show: boolean;
}

/**
 * 键为名称，值为个数
 */
export type RewardSummary = Record<string, RewardSummaryItem>

export enum RewardType {
  Item,
  Song,
  Character,
  Background,
}

/**
 * 主要用于通过奖励搜索，不包含残片奖励和以太之滴奖励
 */
export type WorldMapRewardData =
  | {
      type: RewardType.Song;
      id: string;
    }
  | {
      type: RewardType.Character;
      id: number;
    }
  | {
      type: RewardType.Background;
      name: string;
      img: string;
    }
  | {
      type: RewardType.Item;
      name: string;
      count: number;
    };

export type WorldMapReward =
  | {
      type: RewardType.Song;
      id: string;
      name: string;
      img: string;
    }
  | {
      type: RewardType.Character;
      id: number;
      img: string;
      name: string;
    }
  | {
      type: RewardType.Background;
      img: string;
      name: string;
    }
  | {
      type: RewardType.Item;
      img: string;
      name: string;
      count: number;
    };

export interface ChapterData {
  chapter: string;
  maps: NormalWorldMapData[];
}

export interface Chapter extends ChapterData {
  maps: NormalWorldMap[]
}

/**
 * 爬梯的地图
 */
export interface NormalWorldMapData {
  /**
   * 暂时就用wiki上的id，同时也用作显示名称
   */
  id: string;
  legacy?: boolean;
  /**
   * 仅活动地图有过期时间，无过期时间的是已经过去的活动
   */
  expire?: number;
  platforms: { [level: number]: MapPlatformData | undefined | null; };
}

export interface NormalWorldMapPlatforms {
  [level: number]: MapPlatform | undefined | null;
  length: number;
}

export interface NormalWorldMap extends NormalWorldMapData {
  
  platforms: NormalWorldMapPlatforms;
}

export enum PlatformType {
  Stamina,
  FixedSpeed,
  Restriction,
  Random,
}

/**
 * 爬梯地图格子，也可以叫平台
 */
export interface MapPlatformData {
  length: number;
  special?:
    | {
        type: PlatformType.Stamina;
        count: number;
      }
    | {
        type: PlatformType.FixedSpeed;
        max: number;
      }
    | {
        type: PlatformType.Restriction;
        /**
         * 单曲/曲包/曲目表，主要是展示用
         */
        range: string | string[];
      }
    | {
        type: PlatformType.Random;
        range: string | string[];
      };
  reward?: WorldMapRewardData;
}

export interface MapPlatform extends MapPlatformData {
  reward?: WorldMapReward;
}

export interface CurrentProgress {
  level: number;
  progress: number;
}