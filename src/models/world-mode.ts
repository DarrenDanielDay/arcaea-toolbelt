export interface CharacterFactors {
  frag: number;
  step: number;
  over: number;
}

/**
 * 角色数据，不是角色实例
 */
export interface CharacterData {
  id: number;
  name: {
    zh: string;
    en: string;
  };
  image: string;
  awakenImage: string | null;
  levels: { [level: number]: CharacterFactors | undefined | null };
}

export enum RewardType {
  Item,
  Song,
  Character,
  Background,
}

/**
 * 主要用于通过奖励搜索，不包含残片奖励和以太之滴奖励
 */
type WorldMapReward =
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
      text: string;
    }
  | {
      type: RewardType.Item;
      text: string;
    };

export interface ChapterData {
  chapter: string;
  maps: NormalWorldMap[];
}

/**
 * 爬梯的地图
 */
export interface NormalWorldMap {
  /**
   * 暂时就用wiki上的id，同时也用作显示名称
   */
  id: string;
  legacy?: true;
  platforms: { [level: number]: MapPlatform | undefined | null };
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
export interface MapPlatform {
  /**
   * length
   */
  length: number;
  /**
   * special
   */
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
  reward?: WorldMapReward;
}
