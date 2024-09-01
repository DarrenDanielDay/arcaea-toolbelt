import { Injectable } from "classic-di";
import { $CharacterService, $CoreDataService, CharacterService, CoreDataService, LevelData } from "./declarations";
import { CharacterData, CharacterIndex } from "../models/character";
import { once } from "../utils/misc";
import { indexBy } from "../utils/collections";
import { solve } from "../utils/math";

@Injectable({
  requires: [$CoreDataService],
  implements: $CharacterService,
})
export class CharacterServiceImpl implements CharacterService {
  constructor(private readonly core: CoreDataService) {}
  getCharacterIndex = once(async (): Promise<CharacterIndex> => {
    const characters = await this.getAllCharacters();
    return indexBy(characters, (char) => char.id);
  });

  async getAllCharacters(): Promise<CharacterData[]> {
    const json = await this.core.getCharacterData();
    return json;
  }

  computeL1L20Factor(levelA: LevelData, levelB: LevelData): [number, number] {
    const coefficients = (level: number, value: number) => {
      const d = 2 * level - 21;
      const t = 19 ** 3;
      const u = Math.sign(d) * ((Math.abs(d) - 19) ** 3 + t);
      return [t - u, t + u, 2 * t * value] as const;
    };
    const [f1, f2] = solve<2>([[...coefficients(levelA.level, levelA.value)], [...coefficients(levelB.level, levelB.value)]]);
    return [this.normalizeL1L20Factor(f1), this.normalizeL1L20Factor(f2)];
  }

  interpolateL1L20Factor(level: number, f1: number, f20: number): number {
    return (
      (f1 + f20) / 2 +
      ((f20 - f1) * (Math.sign(level - 10.5) * ((Math.abs(level - 10.5) - 9.5) ** 3 + 9.5 ** 3))) / (2 * 9.5 ** 3)
    );
  }

  interpolateL1L20Factors(f1: number, f20: number): number[] {
    return Array.from({ length: 20 }, (_, i) => this.interpolateL1L20Factor(i + 1, f1, f20));
  }

  private normalizeL1L20Factor(value: number) {
    return Math.round(value * 2) / 2;
  }
}
