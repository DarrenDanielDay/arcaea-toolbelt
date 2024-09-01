import { AutoRender, Component, HyplateElement, nil, signal } from "hyplate";
import { bootstrap, table, title } from "../../styles";
import { sheet } from "./style.css.js";
import { Inject } from "../../../services/di";
import {
  $CharacterService,
  $WorldModeService,
  CharacterService,
  WorldModeService,
} from "../../../services/declarations";
import { CharacterPicker, renderCharacterStepInput } from "../character-picker";
import { inferRange, isInt } from "../../../utils/math";
import { WritableSignal } from "hyplate/types";

export
@Component({
  tag: "constant-tools",
  styles: [bootstrap, table, title, sheet],
})
class ConstantTools extends HyplateElement {
  @Inject($WorldModeService)
  accessor worldMode!: WorldModeService;
  @Inject($CharacterService)
  accessor characters!: CharacterService;

  characterPicker = new CharacterPicker();

  stepScore = signal(NaN);
  playResult = signal(NaN);
  step = signal(NaN);
  progress = signal(NaN);

  beyondBoostScore = signal(NaN);
  beyondBoost1 = signal(NaN);
  beyondBoost2 = signal(NaN);

  levelA = signal(NaN);
  levelB = signal(NaN);
  valueA = signal(NaN);
  valueB = signal(NaN);

  override render() {
    return (
      <div>
        {this.characterPicker}
        <div class="title">Step法测定数</div>
        <div class="mx-3">
          <div class="row my-3">
            <div class="col-auto">
              <label for="step-score" class="col-form-label">
                分数
              </label>
            </div>
            <div class="col-auto">
              <input
                type="number"
                h-model:number={this.stepScore}
                class="form-control"
                step={1}
                min={0}
                id="step-score"
              ></input>
            </div>
          </div>
          <div class="row my-3">
            <div class="col-auto">
              <label for="play-result" class="col-form-label">
                游玩结果
              </label>
            </div>
            <div class="col-auto">
              <input
                type="number"
                h-model:number={this.playResult}
                class="form-control"
                min={2.5}
                id="play-result"
              ></input>
            </div>
          </div>
          <div class="row">
            <div class="col-auto">
              <span class="form-text">以下用于辅助计算更精确的游玩结果范围</span>
            </div>
          </div>
          <div class="row my-3">
            <div class="col-auto">
              <label for="progress" class="col-form-label">
                前进步数（不含技能、残片、源韵强化等加成）
              </label>
            </div>
            <div class="col-auto">
              <input type="number" h-model:number={this.progress} class="form-control" id="progress"></input>
            </div>
          </div>
          <div class="row my-3">
            <div class="col-auto">
              <label for="step" class="col-form-label">
                角色step（若角色游玩后升级，应取升级后step）
              </label>
            </div>
            {renderCharacterStepInput(this.characterPicker, this.step, "step")}
          </div>
          <AutoRender>
            {() => {
              const score = this.stepScore();
              const playResult = this.playResult();
              const step = this.step();
              const progress = this.progress();
              const result = this.worldMode.inverseConstantRange(playResult, score, step, progress);
              if (!result) return nil;
              const [min, max] = result;
              return this.#renderTextRow(this.#inferRange(min, max));
            }}
          </AutoRender>
        </div>
        <div class="title">Beyond Boost法测定数</div>
        <div class="mx-3">
          <div class="form-text">
            注：虽然游戏内只能看到beyond boost的整数值，但官网接口返回的是比较精确的数据，接口路径为
            <code>/webapi/user/me</code>，字段为<code>value.beyond_boost_gauge</code>。本站在官网的
            <a href="docs/plugin-usage.html" target="_blank">
              跨站脚本插件
            </a>
            集成了beyond boost测算定数功能，此处的手动输入计算仅作为不使用该脚本的备选工具。
          </div>
          <div class="row my-3">
            <div class="col-auto">
              <label for="beyond-boost1" class="col-form-label">
                游玩前Beyond能量
              </label>
            </div>
            <div class="col-auto">
              <input
                type="number"
                h-model:number={this.beyondBoost1}
                class="form-control"
                min={0}
                max={200}
                id="beyond-boost1"
              ></input>
            </div>
          </div>
          <div class="row my-3">
            <div class="col-auto">
              <label for="beyond-score" class="col-form-label">
                分数
              </label>
            </div>
            <div class="col-auto">
              <input
                type="number"
                h-model:number={this.beyondBoostScore}
                class="form-control"
                min={0}
                id="beyond-score"
              ></input>
            </div>
          </div>
          <div class="row my-3">
            <div class="col-auto">
              <label for="beyond-boost2" class="col-form-label">
                游玩后Beyond能量
              </label>
            </div>
            <div class="col-auto">
              <input
                type="number"
                h-model:number={this.beyondBoost2}
                class="form-control"
                step={1}
                min={0}
                max={200}
                id="beyond-boost2"
              ></input>
            </div>
          </div>
          <AutoRender>
            {() => {
              const byd1 = this.beyondBoost1();
              const byd2 = this.beyondBoost2();
              const score = this.beyondBoostScore();
              if (isNaN(byd1) || isNaN(byd2) || isNaN(score)) {
                return nil;
              }
              const bound = 200;
              if (byd1 >= bound || byd2 >= bound) {
                return this.#renderTextRow("能量溢出时无法测算定数");
              }
              if (isInt(byd1) && isInt(byd2)) {
                const [min, max] = inferRange(byd2 - byd1, 1, false);
                const minConstant = this.worldMode.inverseBeyondBoost(min, score, true);
                const maxConstant = this.worldMode.inverseBeyondBoost(max, score, true);
                return this.#renderTextRow(this.#inferRange(minConstant, maxConstant));
              }
              // 非整数输入认为是接口弄来的准确数据
              return this.#renderTextRow(`推测定数：${this.worldMode.inverseBeyondBoost(byd2 - byd1, score)}`);
            }}
          </AutoRender>
        </div>
        <div class="title">搭档属性值计算</div>
        <div class="mx-3">
          <div class="form-text">
            注：只包含 level 1 ~ level 20 的三次函数拟合。请填入接口返回的精确数据，否则可能不精确。
          </div>
          {this.#renderCharacterFactorRow("level-a", "等级A", this.levelA, this.valueA)}
          {this.#renderCharacterFactorRow("level-b", "等级B", this.levelB, this.valueB)}
          <AutoRender>
            {() => {
              const la = this.levelA();
              const lb = this.levelB();
              const va = this.valueA();
              const vb = this.valueB();
              if ([la, lb, va, vb].some((v) => isNaN(v))) {
                return nil;
              }
              const [f1, f20] = this.characters.computeL1L20Factor({ level: la, value: va }, { level: lb, value: vb });
              const levelData = this.characters.interpolateL1L20Factors(f1, f20);
              return (
                <div class="factor-table">
                  <table class="table">
                    <thead>
                      <tr>
                        <th>等级</th>
                        {levelData.map((_, i) => (
                          <th>{i + 1}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>能力值（整数）</td>
                        {levelData.map((v) => (
                          <td>{Math.floor(v)}</td>
                        ))}
                      </tr>
                      <tr>
                        <td>能力值（精确）</td>
                        {levelData.map((v) => (
                          <td title={`${v}`}>{v.toFixed(4)}</td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            }}
          </AutoRender>
        </div>
      </div>
    );
  }

  #renderTextRow(text: string) {
    return (
      <div class="row">
        <div class="col-auto">{text}</div>
      </div>
    );
  }

  #renderCharacterFactorRow(id: string, label: string, level: WritableSignal<number>, value: WritableSignal<number>) {
    return (
      <div class="row my-3">
        <div class="col-auto">
          <label for={id} class="col-form-label">
            {label}
          </label>
        </div>
        <div class="col-auto">
          <input type="number" h-model:number={level} class="form-control" id={id} min="1" max="20"></input>
        </div>
        <div class="col-auto">
          <label for={`${id}-value`} class="col-form-label">
            属性值
          </label>
        </div>
        <div class="col-auto">
          <input type="number" h-model:number={value} class="form-control" id={`${id}-value`}></input>
        </div>
      </div>
    );
  }

  #inferRange(min: number, max: number) {
    return `推测定数范围：[${min}, ${max}] => ${this.worldMode.inferConstant(min, max).join(" or ")}`;
  }
}
