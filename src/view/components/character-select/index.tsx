import { Component, nil } from "hyplate";
import { CharacterData } from "../../../models/world-mode";
import { SearchSelect } from "../search-select";
import { sheet } from "./style.css.js";
@Component({
  tag: "character-select",
  styles: [...SearchSelect.styles, sheet],
})
export class CharacterSelect extends SearchSelect<CharacterData> {
  constructor() {
    super(
      ({ awakenImage, image, name }) => (
        <div class="container">
          <div class="images">
            <img src={image} width={64} height={64} title={name.en}></img>
            {awakenImage ? <img src={awakenImage} width={64} height={64} title={name.en}></img> : nil}
          </div>
          <div class="info">{name.zh}</div>
        </div>
      ),
      async (text) => {
        const data = await import("../../../data/character-data.json");
        return data.filter(
          (d) =>
            d.name.zh.toLowerCase().includes(text.toLowerCase()) || d.name.en.toLowerCase().includes(text.toLowerCase())
        );
      },
      (character) => character.name.zh
    );
  }
}
