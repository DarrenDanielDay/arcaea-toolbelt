import { sheet } from "./style.css.js";
import {
  AutoRender,
  Component,
  Future,
  HyplateElement,
  Show,
  computed,
  effect,
  element,
  nil,
  noop,
  signal,
  watch,
} from "hyplate";
import { bootstrap } from "../../styles";
import { CharacterInstanceData } from "../../../models/world-mode";
import { pageInto } from "../../../utils/paging";
import { CharacterSelect } from "../character-select";
import { Inject } from "../../../services/di";
import { $ProfileService, ProfileService } from "../../../services/declarations";
import { FancyDialog } from "../fancy-dialog";
import type { WritableSignal } from "hyplate/types";

export
@Component({
  tag: "character-picker",
  styles: [bootstrap, sheet],
})
class CharacterPicker extends HyplateElement {
  @Inject($ProfileService)
  accessor profile!: ProfileService;

  modal = new FancyDialog();
  characterSelect = new CharacterSelect();
  useStaticData = signal(false);
  resultStep = signal<number | null>(null);

  override render() {
    return <>{this.modal}</>;
  }

  async pickStep(): Promise<number | null> {
    const { resultStep } = this;
    const profile = await this.profile.getProfile();
    const [body, unsubscribe] = this.#renderStepPickerBody(profile?.characters ?? []);
    const confirmed = await this.modal.showPicker<number>((done, cancel) => [
      body,
      <AutoRender>
        {() => {
          const step = resultStep();
          if (step != null) return <span slot="footer">当前使用的step值：{step.toFixed(4)}</span>;
          return nil;
        }}
      </AutoRender>,
      <button
        type="button"
        class="btn btn-primary mx-2"
        slot="footer"
        disabled={computed(() => resultStep() == null)}
        onClick={() => done(resultStep()!)}
      >
        确认
      </button>,
      <button type="button" class="btn btn-secondary" slot="footer" onClick={cancel}>
        取消
      </button>,
    ]);
    unsubscribe();
    if (confirmed) {
      const result = resultStep();
      return result;
    }
    return null;
  }

  #renderStepPickerBody(profileCharacters: CharacterInstanceData[]) {
    const { useStaticData, characterSelect, resultStep } = this;
    const selectedCharacter = characterSelect.selectedItem;
    const profileCharacter = computed(() => {
      const character = selectedCharacter();
      if (!character) return null;
      return profileCharacters.find((c) => c.id === character.id);
    });
    const unsubscribeWatch = watch(profileCharacter, (character) => {
      // 存档中角色变更时默认优先使用存档中角色数据
      useStaticData.set(!character);
    });
    let firstUpdate = true;
    const unsubscribeSync = effect(() => {
      const character = profileCharacter();
      const isStatic = useStaticData();
      if (!isStatic) {
        resultStep.set(character?.factors.step ?? null);
      } else {
        if (firstUpdate) {
          firstUpdate = false;
        } else {
          resultStep.set(null);
        }
      }
    });
    return [
      <div slot="content">
        <form>
          <div class="row">
            <label class="form-label">选择角色</label>
          </div>
          <character-select ref={characterSelect} name="character"></character-select>
          <Show when={selectedCharacter}>
            {(character) => {
              const pagedCharacterLevels = pageInto(
                Object.entries(character.levels).flatMap(([level, factors]) => {
                  if (!factors) return [];
                  return [[level, factors] as const];
                }),
                10
              );
              const hasStepModifier = [
                35, // 风暴对立
                55, // 宿命光
              ].includes(character.id);
              return (
                <>
                  <div class="row my-3">
                    <div class="col-auto">
                      <img src={character.image} width={64} height={64}></img>
                    </div>
                    {character.awakenImage ? (
                      <div class="col-auto">
                        <img src={character.awakenImage} width={64} height={64}></img>
                      </div>
                    ) : (
                      nil
                    )}
                    {hasStepModifier ? (
                      <div class="col-auto" style:color="red">
                        注意：此角色有step加成的因子，静态数据不包括加成的值。
                      </div>
                    ) : (
                      nil
                    )}
                    <div class="col-auto">
                      <Show
                        when={profileCharacter}
                        fallback={() => <div class="form-check-label">存档中没有此角色</div>}
                      >
                        {(character) => <div class="form-check-label">存档中的角色数据：{character.factors.step}</div>}
                      </Show>
                    </div>
                  </div>
                  <div class="row">
                    <div class="col-auto">
                      <div class="form-check col-form-label">
                        <input
                          type="checkbox"
                          h-model:boolean={useStaticData}
                          disabled={computed(() => !profileCharacter())}
                          class="form-check-input"
                          name="use-static"
                          id="use-static"
                        ></input>
                        <label class="form-check-label" for="use-static">
                          使用静态等级数据
                        </label>
                      </div>
                    </div>
                  </div>
                  <Show when={useStaticData}>
                    {() => (
                      <>
                        <div class="row">
                          <div class="col my-2">点击表格中等级/数值进行选择：</div>
                        </div>
                        <div class="row">
                          <div class="col">
                            <table>
                              <tbody>
                                {pagedCharacterLevels.map((characterLevels) => {
                                  return (
                                    <>
                                      <tr>
                                        <th>等级</th>
                                        {characterLevels.map(([key, factors]) => (
                                          <th onClick={() => resultStep.set(factors.step)}>{key}</th>
                                        ))}
                                      </tr>
                                      <tr>
                                        <td>step</td>
                                        {characterLevels.map(([, factors]) => (
                                          <td onClick={() => resultStep.set(factors.step)}>{factors.step}</td>
                                        ))}
                                      </tr>
                                    </>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </>
                    )}
                  </Show>
                </>
              );
            }}
          </Show>
        </form>
      </div>,
      () => {
        unsubscribeSync();
        unsubscribeWatch();
      },
    ] as const;
  }
}

export const renderCharacterStepInput = (picker: CharacterPicker, binding: WritableSignal<number>, field: string) => {
  const input = element("input");
  const pickCharacterStep = async () => {
    const result = await picker.pickStep();
    if (result != null) {
      binding.set(result);
      input.form?.dispatchEvent(new Event("change"));
    }
  };
  return [
    <div class="col-auto">
      <input
        ref={input}
        type="number"
        h-model:number={binding}
        name={field}
        id={field}
        step="any"
        min="0"
        class="form-control"
        required
      />
    </div>,
    <div class="col-auto">
      <button type="button" class="btn btn-secondary" onClick={pickCharacterStep}>
        使用角色数据
      </button>
    </div>,
  ];
};
