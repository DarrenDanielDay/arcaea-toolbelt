import { Component, nil } from "hyplate";
import { CharacterData, CharacterImageKind, CharacterStatus } from "../../../models/character";
import { SearchSelect } from "../search-select";
import { sheet } from "./style.css.js";
import { Inject } from "../../../services/di";
import {
  $AssetsResolver,
  $AssetsService,
  $CharacterService,
  AssetsResolver,
  AssetsService,
  CharacterService,
} from "../../../services/declarations";
import { AssetImage } from "../asset-image";
import type { GlobalAttributes } from "hyplate/types";
@Component({
  tag: "character-select",
  styles: [...SearchSelect.styles, sheet],
})
export class CharacterSelect extends SearchSelect<CharacterData> {
  @Inject($AssetsResolver)
  accessor resolver!: AssetsResolver;
  @Inject($AssetsService)
  accessor assets!: AssetsService;
  @Inject($CharacterService)
  accessor characters!: CharacterService;

  constructor() {
    super(
      ({ id, can: { awake, lost } = {}, name }) => (
        <div class="container">
          <div class="images">
            <AssetImage
              src={this.assets.getAssets(
                this.resolver.resoveCharacterImage({
                  id,
                  kind: CharacterImageKind.Icon,
                  status: CharacterStatus.Initial,
                })
              )}
              width={64}
              height={64}
            ></AssetImage>
            {awake ? (
              <AssetImage
                src={this.assets.getAssets(
                  this.resolver.resoveCharacterImage({
                    id,
                    status: CharacterStatus.Awaken,
                    kind: CharacterImageKind.Icon,
                  })
                )}
                width={64}
                height={64}
              ></AssetImage>
            ) : lost ? (
              <AssetImage
                src={this.assets.getAssets(
                  this.resolver.resoveCharacterImage({
                    id,
                    status: CharacterStatus.Lost,
                    kind: CharacterImageKind.Icon,
                  })
                )}
                width={64}
                height={64}
              ></AssetImage>
            ) : (
              nil
            )}
          </div>
          <div class="info">{name.zh}</div>
        </div>
      ),
      async (text) => {
        const data = await this.characters.getAllCharacters();
        return data.filter(
          (d) =>
            d.name.zh.toLowerCase().includes(text.toLowerCase()) || d.name.en.toLowerCase().includes(text.toLowerCase())
        );
      },
      (character) => character.name.zh
    );
  }
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "character-select": JSXAttributes<GlobalAttributes, CharacterSelect>;
    }
  }
}
