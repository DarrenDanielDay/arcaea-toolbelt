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
  can?: {
    awake?: boolean;
    lost?: boolean;
  }
  levels: { [level: number]: CharacterFactors | undefined | null; };
}

export enum CharacterStatus {
  Initial = '',
  Awaken = 'u',
  /**
   * 对立、摩耶丢失的特殊状态
   */
  Lost = 'l',
}

export interface CharacterIndex {
  [characterId: number]: CharacterData;
}

export enum CharacterImageKind {
  /**
   * 头像图标
   */
  Icon,
  /**
   * 立绘
   */
  Full,
}

export interface CharacterImage {
  /**
   * 可用-1代表未知
   */
  id: number;
  status: CharacterStatus;
  kind: CharacterImageKind;
}

export interface CharacterInstanceData {
  id: number;
  level: number;
  exp: number;
  factors: CharacterFactors;
}