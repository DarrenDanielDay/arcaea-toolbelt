import { AutoRender, Component, HyplateElement, nil, signal } from "hyplate";
import { bootstrap, title } from "../../styles";
import { Inject } from "../../../services/di";
import { $WorldModeService, WorldModeService } from "../../../services/declarations";
import { CharacterPicker, renderCharacterStepInput } from "../character-picker";
import { inferRange, isInt } from "../../../utils/math";

export
@Component({
  tag: "constant-tools",
  styles: [bootstrap, title],
})
class ConstantTools extends HyplateElement {
  @Inject($WorldModeService)
  accessor worldMode!: WorldModeService;

  characterPicker = new CharacterPicker();

  stepScore = signal(NaN);
  playResult = signal(NaN);
  step = signal(NaN);
  progress = signal(NaN);

  beyondBoostScore = signal(NaN);
  beyondBoost1 = signal(NaN);
  beyondBoost2 = signal(NaN);

  override render() {
    return (
      <div>
        {this.characterPicker}
        <div class="title">Step法</div>
        <div class="mx-3">
          <div class="row">
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
          <div class="row">
            <div class="col-auto">
              <label for="progress" class="col-form-label">
                前进步数（不含技能、残片、源韵强化等加成）
              </label>
            </div>
            <div class="col-auto">
              <input type="number" h-model:number={this.progress} class="form-control" id="progress"></input>
            </div>
          </div>
          <div class="row">
            <div class="col-auto">
              <label for="step" class="col-form-label">
                角色step
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
              return this.#renderTextRow(` 推测定数范围：[${min}, ${max}]`);
            }}
          </AutoRender>
        </div>
        <div class="title">Beyond Boost法</div>
        <div class="mx-3">
          <div class="form-text">
            注：虽然游戏内只能看到beyond boost的整数值，但官网接口返回的是比较精确的数据，接口路径为
            <code>/webapi/user/me</code>，字段为<code>value.beyond_boost_gauge</code>。本站在官网的
            <a href="docs/plugin-usage.html" target="_blank">
              跨站脚本插件
            </a>
            集成了beyond boost测算定数功能，此处的手动录入仅作为不使用该脚本的备选工具。
          </div>
          <div class="row">
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
                return this.#renderTextRow(
                  `推测定数范围：[${this.worldMode.inverseBeyondBoost(min, score)}, ${this.worldMode.inverseBeyondBoost(
                    max,
                    score
                  )}]`
                );
              }
              return this.#renderTextRow(`推测定数：${this.worldMode.inverseBeyondBoost(byd2 - byd1, score)}`);
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
}
