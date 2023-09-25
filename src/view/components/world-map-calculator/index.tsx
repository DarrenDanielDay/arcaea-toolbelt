import { sheet } from "./style.css.js";
import { bootstrap, title } from "../../styles";
import { WorldMapSelect } from "../world-map-select";
import { WorldMapNormal } from "../world-map-normal";
import { Inject } from "../../../services/di";
import {
  $ChartService,
  $MusicPlayService,
  $ProfileService,
  $WorldModeService,
  ChartService,
  InverseProgressSolution,
  MusicPlayService,
  ProfileService,
  WorldMapBonus,
  type WorldModeService,
} from "../../../services/declarations";
import { alert, confirm } from "../global-message";
import {
  HyplateElement,
  Component,
  listen,
  signal,
  element,
  nil,
  computed,
  Show,
  watch,
  effect,
  AutoRender,
  Future,
} from "hyplate";
import { ChartInfo } from "../chart-info";
import type { WritableSignal } from "hyplate/types";
import { CharacterSelect } from "../character-select";
import { pageInto } from "../../../utils/paging";
import { css } from "../../../utils/component";

const characterPickerModalStyle = css`
  div.modal-root {
    width: 80vw;
    max-width: 400px;
    min-height: 540px;
  }
  table {
    width: 100%;
  }
  table {
    display: block;
    overflow-x: auto;
  }
  table th,
  table td {
    padding: 0.25em;
    border-collapse: collapse;
    border: 1px solid var(--bs-border-color);
  }
  th:not(:first-child),
  td:not(:first-child) {
    cursor: pointer;
  }
`;

const scoreControllerModalStyle = css`
  div.modal-root {
    width: 24em;
  }
`;

const NEW_MAP = "新版梯";
const LEGACY_MAP = "遗产梯";

export
@Component({
  tag: "world-mode-calculator",
  styles: [bootstrap, sheet, title],
})
class WorldModeCalculator extends HyplateElement {
  @Inject($WorldModeService)
  accessor worldMode!: WorldModeService;
  @Inject($MusicPlayService)
  accessor musicPlay!: MusicPlayService;
  @Inject($ProfileService)
  accessor profile!: ProfileService;
  @Inject($ChartService)
  accessor chart!: ChartService;

  select = new WorldMapSelect();
  worldMap = new WorldMapNormal();

  jumpForm = element("form");
  completed = signal(NaN);
  rest = signal(NaN);
  restMax = signal<number | null>(null);

  calcForm = element("form");
  /**
   * 用于正算
   */
  step = signal(NaN);
  potential = signal(NaN);
  /**
   * 用于正算
   */
  worldType = signal("new");
  stamina = signal("1");
  fragment = signal("1");
  memoryx4 = signal(false);
  progress = signal(NaN);

  inverseProgressForm = element("form");
  /**
   * 用于逆算
   */
  step2 = signal(NaN);
  lowProgress = signal(NaN);
  highProgress = signal(NaN);

  /**
   * 用于逆算，默认为空，逆算不显示任何带加成的方案
   */
  worldType2 = signal("");
  solutions = signal<InverseProgressSolution[]>([]);

  override render() {
    this.autorun(() => {
      const selected = this.select.selected();
      this.resetCalculation();
      this.worldMap.setCurrentPlatform(null);
      if (selected) {
        this.worldMap.setMap(selected);
      }
    });
    this.effect(() =>
      listen(this.worldMap)<number>("click-cell", ({ detail: targetLevel }) => {
        const completed = this.completed(),
          rest = this.rest();
        const contexts = this.#getMapCurrentPlatformContexts();
        if (isNaN(completed) || isNaN(rest)) {
          const rest = signal(NaN);
          confirm(
            <form>
              <div>设置当前地图进度为第{targetLevel}个台阶：</div>
              <div>
                <label class="col-form-label">阶梯内剩余进度</label>
              </div>
              <div>
                <input
                  class="form-control"
                  type="number"
                  min={0.1}
                  max={contexts[targetLevel - 1]!.platform.length}
                  step={0.1}
                  h-model:number={rest}
                  keypress-submit
                ></input>
              </div>
            </form>
          ).then((confirmed) => {
            if (confirmed) {
              this.completed.set(targetLevel - 1);
              this.rest.set(rest());
              this.jumpPlatform();
            }
          });
          return;
        }

        if (targetLevel < completed + 1) {
          alert("此格已完成！");
          return;
        }
        const currentProgress = this.worldMap.currentProgress();
        if (!currentProgress) {
          alert("未确认设置进度");
          return;
        }
        const [low, high] = this.worldMode.computeProgressRange(
          this.worldMap.currentMap()!,
          currentProgress,
          targetLevel
        );
        this.lowProgress.set(low);
        this.highProgress.set(high);
        this.inverseProgress();
      })
    );
    this.effect(() => listen(this.calcForm)("change", this.calculateProgress));
    this.effect(() => listen(this.inverseProgressForm)("change", this.inverseProgress));
    return (
      <Future promise={this.musicPlay.getStatistics()}>{(stats) => this._render(stats.maximumSinglePotential)}</Future>
    );
  }
  _render(maximumSinglePotential: number) {
    const isNotLegacy = computed(() => this.worldType() !== "legacy");
    const isNotNew = computed(() => this.worldType() !== "new");
    return (
      <>
        <div class="title mx-3">选择地图</div>
        {this.select}
        {this.worldMap}
        <div class="title mx-3">设置当前地图进度</div>
        <form ref={this.jumpForm} id="jump-platform" class="mx-3">
          <div class="row">
            <div class="col-auto">
              <label for="complete" class="col-form-label">
                已完成阶梯数
              </label>
            </div>
            <div class="col-auto">
              <input
                type="number"
                h-model:number={this.completed}
                name="complete"
                step="1"
                min="0"
                class="form-control"
                required
              />
            </div>
            <div class="col-auto">
              <label for="progress" class="col-form-label">
                阶梯内剩余进度
              </label>
            </div>
            <div class="col-auto">
              <input
                type="number"
                h-model:number={this.rest}
                name="progress"
                step="0.1"
                min="0"
                max={this.restMax}
                class="form-control"
                required
              />
            </div>
            <div class="col-auto">
              <button type="button" name="jump" class="btn btn-primary mx-1" onClick={this.jumpPlatform}>
                设为当前
              </button>
              <button type="button" name="focus" class="btn btn-secondary mx-1" onClick={this.focusCurrent}>
                跳转当前
              </button>
              <button type="button" name="reset" class="btn btn-danger mx-1" onClick={this.restCurrentProgress}>
                清空
              </button>
            </div>
          </div>
        </form>
        <AutoRender>
          {() => {
            const currentProgress = this.worldMap.currentProgress();
            const currentMap = this.worldMap.currentMap();
            if (!currentProgress || !currentMap) {
              return nil;
            }
            const { nextReward, total } = this.worldMode.computeRemainingProgress(currentMap, currentProgress);
            return (
              <div class="mx-3">
                <div class="row">
                  <div class="col-auto">
                    {nextReward ? (
                      <>
                        距离下个主要奖励<img src={nextReward.img} width="32" height="32"></img>还剩
                        {nextReward.remaining.distance}进度，
                      </>
                    ) : (
                      nil
                    )}
                    距离爬完还剩{total.distance}进度。
                  </div>
                </div>
              </div>
            );
          }}
        </AutoRender>
        <div class="title mx-3">正算步数（可计算打歌次数）</div>
        <form ref={this.calcForm} id="calc-progress" name="calc" class="mx-3">
          <div class="row">
            <div class="col-auto">
              <label for="step" class="col-form-label">
                角色Step
              </label>
            </div>
            {this.renderCharacterStepInput(this.step, "step")}
            <div class="col-auto">
              <label for="potential" class="col-form-label">
                结算单曲ptt
              </label>
            </div>
            <div class="col-auto">
              <input
                type="number"
                h-model:number={this.potential}
                name="potential"
                step="any"
                id="potential"
                min="0"
                max={maximumSinglePotential}
                class="form-control"
                required
              />
            </div>
            <AutoRender>
              {() => {
                const potential = this.potential();
                if (isNaN(potential)) return nil;
                const playResult = this.worldMode.computePlayResult(potential);
                return (
                  <div class="col-auto col-form-label">
                    游玩结果：{playResult.toFixed(1)}（{playResult}）
                  </div>
                );
              }}
            </AutoRender>
          </div>
          <div class="row">
            <div class="col-auto">世界类型</div>
          </div>
          <div class="input-group">
            <div class="input-group-text">
              <div class="form-check">
                <input
                  type="radio"
                  class="form-check-input"
                  id="new-world"
                  value="new"
                  h-model={this.worldType}
                ></input>
                <label class="form-check-label" for="new-world">
                  {NEW_MAP}
                </label>
              </div>
            </div>
            <div class="input-group-text">
              <div class="form-check">
                <input
                  type="checkbox"
                  h-model:boolean={this.memoryx4}
                  disabled={isNotNew}
                  name="memory-x4"
                  id="memory-x4"
                  class="form-check-input"
                />
                <label for="memory-x4" class="form-check-label">
                  源韵强化 (x4)
                </label>
              </div>
            </div>
          </div>
          <div class="input-group my-3">
            <div class="input-group-text">
              <div class="form-check">
                <input
                  type="radio"
                  class="form-check-input"
                  id="legacy-world"
                  value="legacy"
                  h-model={this.worldType}
                ></input>
                <label class="form-check-label" for="legacy-world">
                  {LEGACY_MAP}
                </label>
              </div>
            </div>
            <label for="fragment" class="input-group-text">
              残片加成
            </label>
            <select h-model={this.fragment} disabled={isNotLegacy} name="fragment" id="fragment" class="form-select">
              <option value="1">无</option>
              <option value="1.1">100 (x1.1)</option>
              <option value="1.25">250 (x1.25)</option>
              <option value="1.5">500 (x1.5)</option>
            </select>
            <label for="stamina" class="input-group-text">
              消耗体力
            </label>
            <select h-model={this.stamina} disabled={isNotLegacy} name="stamina" id="stamina" class="form-select">
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="4">4</option>
              <option value="6">6</option>
            </select>
          </div>
          <div class="row">
            <div class="col-auto">
              <span class="calc-result">
                进度：
                {computed(() => {
                  const progress = this.progress();
                  if (isNaN(progress)) {
                    return "-";
                  }
                  return progress.toFixed(4);
                })}
              </span>
              <button
                type="button"
                name="calc"
                class="btn btn-primary"
                onClick={this.focusProgressResult}
                disabled={computed(() => isNaN(this.progress()) || !this.worldMap.currentProgress())}
              >
                查看结果格子
              </button>
            </div>
          </div>
          <AutoRender>
            {() => {
              const progress = this.progress();
              const currentProgress = this.worldMap.currentProgress();
              const currentMap = this.worldMap.currentMap();
              if (isNaN(progress) || !currentProgress || !currentMap) {
                return nil;
              }
              const { nextReward, total } = this.worldMode.computeRemainingProgress(currentMap, currentProgress);
              return (
                <div class="row">
                  <div class="col-auto">
                    以此进度结算，
                    {nextReward ? (
                      <>
                        到下个主要奖励<img src={nextReward.img} width="32" height="32"></img>还需要打
                        {Math.ceil(nextReward.remaining.distance / progress)}次，
                      </>
                    ) : (
                      nil
                    )}
                    爬完还需要打歌{Math.ceil(total.distance / progress)}次。
                  </div>
                </div>
              );
            }}
          </AutoRender>
        </form>
        <div class="title mx-3">逆算潜力值（控分精准降落）</div>
        <form ref={this.inverseProgressForm} id="anti-progress" class="mx-3">
          <div>
            <div class="row">
              <div class="col-auto">地图类型</div>
            </div>
            <div class="row">
              <div class="col-auto">
                <div class="form-check">
                  <input
                    type="radio"
                    class="form-check-input"
                    id="new-world-2"
                    value="new"
                    h-model={this.worldType2}
                  ></input>
                  <label class="form-check-label" for="new-world-2">
                    {NEW_MAP}
                  </label>
                </div>
              </div>
              <div class="col-auto">
                <div class="form-check">
                  <input
                    type="radio"
                    class="form-check-input"
                    id="legacy-world-2"
                    value="legacy"
                    h-model={this.worldType2}
                  ></input>
                  <label class="form-check-label" for="legacy-world-2">
                    {LEGACY_MAP}
                  </label>
                </div>
              </div>
            </div>
          </div>
          <div class="row">
            <div class="col-auto">
              <label class="col-form-label" for="anti-progress-step">
                角色step
              </label>
            </div>
            {this.renderCharacterStepInput(this.step2, "step2")}
          </div>
          <div class="row">
            <div class="col-auto">
              <label class="col-form-label">期望前进步数</label>
            </div>
            <div class="col-auto">
              <input
                type="number"
                h-model:number={this.lowProgress}
                name="low"
                step="0.1"
                min="0"
                class="form-control"
                required
              />
            </div>
            <div class="col-auto">~</div>
            <div class="col-auto">
              <input
                type="number"
                h-model:number={this.highProgress}
                name="high"
                step="0.1"
                min="0"
                class="form-control"
                required
              />
            </div>
            <div class="col-auto">（设置当前地图进度后，点击要降落的格子可自动计算期望前进步数）</div>
          </div>
          <div class="row">
            <div class="col-auto">
              <AutoRender>
                {() => {
                  const solutions = this.solutions();
                  const worldType = this.worldType2();
                  return (
                    <div class="solutions">
                      {solutions
                        .filter(({ world }) => !world || world.type === worldType)
                        .map(({ invalidMessage, highPtt, lowPtt, pmRange, world }) => {
                          const bonus = world ? (
                            world.type === "legacy" ? (
                              <div>
                                使用加成：{world.fragment > 1 ? `残片x${world.fragment}` : ""}
                                {world.stamina > 1 ? `体力x${world.stamina}` : ""}
                              </div>
                            ) : world.x4 ? (
                              <div>使用源韵强化x4</div>
                            ) : (
                              nil
                            )
                          ) : (
                            <div>不使用加成</div>
                          );
                          return (
                            <div class="solution">
                              {bonus}
                              {invalidMessage ? (
                                <div>{invalidMessage}</div>
                              ) : (
                                <>
                                  <div>
                                    结算潜力值范围：{lowPtt.toFixed(4)} ~ {highPtt.toFixed(4)}
                                  </div>
                                  {pmRange ? (
                                    <div>
                                      相当于PM {pmRange[0]} ~ {pmRange[1]}{" "}
                                      <button
                                        type="button"
                                        class="btn btn-secondary"
                                        onClick={async () => {
                                          const result = await this.chart.roll(...pmRange);
                                          if (!result) {
                                            return alert("未找到给定定数范围内的谱面");
                                          }
                                          alert(
                                            <ChartInfo
                                              chart={result.chart}
                                              song={result.song}
                                              chartService={this.chart}
                                            ></ChartInfo>
                                          );
                                        }}
                                      >
                                        roll一个
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      class="btn btn-secondary"
                                      onClick={async () => {
                                        const charts = await this.chart.queryChartsByConstant(lowPtt - 2, highPtt - 1);
                                        alert(
                                          charts
                                            .map((chart) => {
                                              const { constant, cover, difficulty, title } = chart;
                                              const lowScore = Math.max(
                                                this.musicPlay.ex,
                                                this.musicPlay.inverseScore(lowPtt, constant)
                                              );
                                              const highScore = this.musicPlay.inverseScore(highPtt, constant);
                                              const note = chart.chart.note;
                                              const maxFar = this.musicPlay.computeFar(lowScore, note, true);
                                              const minFar = this.musicPlay.computeFar(highScore, note, false);
                                              return (
                                                <div class="m-3">
                                                  <div class="row my-1">
                                                    <div class="col-auto">
                                                      <img
                                                        src={cover}
                                                        width={80}
                                                        height={80}
                                                        style:border={`0.25em solid var(--${difficulty})`}
                                                        title={title}
                                                      ></img>
                                                    </div>
                                                    <div class="col-auto">
                                                      <div class="row" style:height="2em">
                                                        {title}
                                                      </div>
                                                      <div class="row" style:font-size="0.5em">
                                                        {chart.song.pack}
                                                      </div>
                                                    </div>
                                                  </div>
                                                  <div class="row">
                                                    <div class="col-auto">
                                                      分数 {lowScore} ~ {highScore}
                                                    </div>
                                                    <div class="col-auto">
                                                      Far {minFar} ~ {maxFar}
                                                    </div>
                                                  </div>
                                                </div>
                                              );
                                            })
                                            .concat(<style>{scoreControllerModalStyle}</style>)
                                        );
                                      }}
                                    >
                                      控分
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  );
                }}
              </AutoRender>
            </div>
          </div>
        </form>
      </>
    );
  }

  resetCalculation() {
    this.completed.set(NaN);
    this.rest.set(NaN);
    this.lowProgress.set(NaN);
    this.highProgress.set(NaN);
    this.fragment.set("1");
    this.memoryx4.set(false);
  }

  renderCharacterStepInput(binding: WritableSignal<number>, field: string) {
    const input = element("input");
    const pickCharacterStep = async () => {
      const useStaticData = signal(false);
      const profile = await this.profile.getProfile();
      const profileCharacters = profile?.characters ?? [];
      const characterSelect = new CharacterSelect();
      const selectedCharacter = characterSelect.selectedItem;
      const resultStep = signal<number | null>(null);
      const profileCharacter = computed(() => {
        const character = selectedCharacter();
        if (!character) return null;
        return profileCharacters.find((c) => c.id === character.id);
      });
      const unsubscribeWatch = watch(profileCharacter, (character) => {
        // 存档中角色变更时默认优先使用存档中角色数据
        useStaticData.set(!character);
      });

      const unsubscribeSync = effect(() => {
        const character = profileCharacter();
        const isStatic = useStaticData();
        if (!isStatic) {
          resultStep.set(character?.factors.step ?? null);
        } else {
          resultStep.set(null);
        }
      });
      try {
        const confirmed = await confirm(
          <div>
            <style>{characterPickerModalStyle}</style>
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
                            {(character) => (
                              <div class="form-check-label">存档中的角色数据：{character.factors.step}</div>
                            )}
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
          (done, cancel) => [
            <AutoRender>
              {() => {
                const step = resultStep();
                if (step != null) return <span>当前使用的step值：{step.toFixed(4)}</span>;
                return nil;
              }}
            </AutoRender>,
            <button
              type="button"
              class="btn btn-primary"
              disabled={computed(() => resultStep() == null)}
              onClick={done}
            >
              确认
            </button>,
            <button type="button" class="btn btn-secondary" onClick={cancel}>
              取消
            </button>,
          ]
        );
        if (confirmed) {
          const result = resultStep();
          if (result != null) {
            binding.set(result);
            input.form?.dispatchEvent(new Event("change"));
          } else {
            alert("未选择有效的角色数据");
          }
        }
      } finally {
        unsubscribeSync();
        unsubscribeWatch();
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
  }

  restCurrentProgress = () => {
    this.completed.set(NaN);
    this.rest.set(NaN);
    this.worldMap.setCurrentPlatform(null);
  };

  jumpPlatform = () => {
    const completed = this.completed();
    const rest = this.rest();
    const platformLength = this.#getMapCurrentPlatformContexts()[completed]?.platform.length ?? null;
    this.restMax.set(platformLength);
    if (!this.jumpForm.reportValidity()) {
      return;
    }
    this.worldMap.setCurrentPlatform({
      level: completed + 1,
      progress: rest,
    });
  };

  focusCurrent = () => {
    if (!this.jumpForm.reportValidity()) {
      return;
    }
    this.worldMap.focusLevel(this.completed() + 1);
  };

  calculateProgress = () => {
    if (!this.calcForm.reportValidity()) {
      this.progress.set(NaN);
      return;
    }
    const fragment = +this.fragment(),
      potential = this.potential(),
      step = this.step(),
      x4 = this.memoryx4(),
      worldType = this.worldType(),
      stamina = +this.stamina();
    try {
      const bonus: WorldMapBonus | null =
        worldType === "new"
          ? { type: "new", x4 }
          : worldType === "legacy"
          ? {
              type: "legacy",
              fragment,
              stamina,
            }
          : null;
      const result = this.worldMode.computeProgress(step, potential, bonus);
      this.progress.set(result);
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message);
      }
      this.progress.set(NaN);
    }
  };

  focusProgressResult = () => {
    this.calculateProgress();
    const progress = this.progress();
    if (!progress) {
      return;
    }
    const reached = this.worldMap.currentProgress();
    if (!reached) {
      return;
    }
    const platforms = this.#getMapCurrentPlatformContexts();
    let reachedIndex = reached.level;
    if (progress < reached.progress) {
      this.worldMap.focusLevel(reachedIndex);
      return;
    }
    let context = platforms[reachedIndex];
    for (
      let rest = progress - reached.progress;
      context && rest > 0;
      reachedIndex++, context = platforms[reachedIndex]
    ) {
      rest -= context.platform.length;
    }
    if (!context) {
      // 到顶了
      alert("爬到顶了");
    } else {
      this.worldMap.focusLevel(reachedIndex);
    }
  };

  inverseProgress = async () => {
    if (!this.inverseProgressForm.reportValidity()) {
      return;
    }
    const step = this.step2();
    const low = this.lowProgress();
    const high = this.highProgress();
    this.solutions.set(await this.worldMode.inverseProgress(step, [low, high]));
  };

  /**
   * 用索引level-1拿到
   */
  #getMapCurrentPlatformContexts() {
    return [...this.worldMap.platforms()].reverse();
  }
}
