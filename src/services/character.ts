import { Injectable } from "classic-di";
import { $CharacterService, CharacterService } from "./declarations";
import { CharacterData, CharacterIndex } from "../models/character";
import { jsonModule, once } from "../utils/misc";
import { indexBy } from "../utils/collections";

@Injectable({
  implements: $CharacterService,
})
export class CharacterServiceImpl implements CharacterService {
  getCharacterIndex = once(async (): Promise<CharacterIndex> => {
    const characters = await this.getAllCharacters();
    return indexBy(characters, (char) => char.id);
  });

  async getAllCharacters(): Promise<CharacterData[]> {
    const json = await jsonModule(import("../data/character-data.json"));
    return json;
  }
}
