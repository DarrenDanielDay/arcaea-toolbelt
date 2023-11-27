import { Injectable } from "classic-di";
import { $CharacterService, $CoreDataService, CharacterService, CoreDataService } from "./declarations";
import { CharacterData, CharacterIndex } from "../models/character";
import { once } from "../utils/misc";
import { indexBy } from "../utils/collections";

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
}
