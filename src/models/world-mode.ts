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
