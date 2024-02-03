import { input } from "../../../utils/component";
import { ResultCard } from "../result-card";
import { SearchSelect } from "../search-select";
import { bootstrap } from "../../styles";
import { Inject } from "../../../services/di";
import {
  $ChartService,
  $MusicPlayService,
  ChartService,
  MusicPlayService,
  SearchResult,
} from "../../../services/declarations";
import {
  ClearRank,
  NoteResult,
  PartnerClearRank,
  PlayResult,
  PlayerInputType,
  ScoreResult,
  Side,
} from "../../../models/music-play";
import { Component, HyplateElement, cssVar, element, listen } from "hyplate";
import { addSheet } from "sheetly";
import { sheet } from "./style.css.js";
import type { AttachFunc, Rendered } from "hyplate/types";
import { getDateFromDatetimeLocal, getNow, setDateToDatetimeLocal } from "../../../utils/time";

export
@Component({
  tag: "play-result-form",
  styles: [bootstrap],
})
class PlayResultForm extends HyplateElement {
  @Inject($ChartService)
  accessor chartService!: ChartService;
  @Inject($MusicPlayService)
  accessor musicPlayService!: MusicPlayService;

  form = element("form");
  far = input();
  lost = input();
  perfect = input();
  score = input();
  clear = element("select");
  playTime = input();
  card = new ResultCard();
  chartSelect = new SearchSelect<SearchResult>(
    (result) => {
      const {
        song: { alias, pack, side },
        cover,
        chart: { note, designer },
        constant,
        bpm,
        difficulty,
        title,
      } = result;
      return (
        <>
          <img class="cover" src={cover} loading="lazy" var:color-side={`var(--side-${Side[side].toLowerCase()})`} />
          <div class="details">
            <div class="column">
              <span class="notes">{note}</span>
              <span class="constant" style={`background-color: var(--${difficulty})`}>
                {constant.toFixed(1)}
              </span>
              <span class="bpm">♩ = {bpm}</span>
            </div>
            <div class="column">
              <div class="info-row">
                <span class="pack-name">曲包：{pack}</span>
                <span class="chart-designer">谱面设计：{designer}</span>
              </div>
              <span class="song-name">{title}</span>
              <span class="alias">{alias.join(" ")}</span>
            </div>
          </div>
        </>
      );
    },
    async (text) => {
      const results = await this.chartService.searchChart(text);
      // 避免一次性加载过多图片
      if (results.length > 10) {
        return results.slice(0, 10);
      }
      return results;
    },
    (item) => item.chart.id
  );

  override mount(attach?: AttachFunc | undefined): Rendered<this> {
    const rendered = super.mount(attach);
    this.chartSelect.searchInput.placeholder = "输入搜索谱面，支持别称（例如：骨折光）";
    addSheet(sheet, this.chartSelect.shadowRoot);
    return rendered;
  }

  override render() {
    this.effect(() => {
      const formEvents = listen(this.form);
      const unsubscribeChange = formEvents("change", (e) => this.handleFormChange(e));
      const unsubscribeSubmit = formEvents("submit", (e) => e.preventDefault());
      this.handleTypeChange("detailed");
      this.updateCardSize();
      return () => {
        unsubscribeChange();
        unsubscribeSubmit();
      };
    });
    return (
      <div class="m-3">
        <form ref={this.form}>
          <div class="row my-2">
            <div class="col">{this.chartSelect}</div>
          </div>
          <div class="mx-3">
            <div>对于成绩信息……</div>
            <div class="row my-2">
              <div class="form-check">
                <input class="form-check-input" type="radio" name="type" id="detailed" value="detailed" checked />
                <label class="form-check-label" for="detailed">
                  有大P的详细成绩信息（如bot生成b30）
                </label>
              </div>
            </div>
            <div class="row my-2">
              <div class="form-check">
                <input class="form-check-input" type="radio" name="type" id="screenshot" value="screenshot" />
                <label class="form-check-label" for="screenshot">
                  有游戏内成绩截图但没显示大P
                </label>
              </div>
            </div>
            <div class="row my-2">
              <div class="form-check">
                <input class="form-check-input" type="radio" name="type" id="score-only" value="score-only" />
                <label class="form-check-label" for="score-only">
                  只知道分数（好友/世界榜可查看）
                </label>
              </div>
            </div>
          </div>
          <div class="row my-2">
            <div class="col-2">
              <label for="perfect" class="col-form-label">
                大P
              </label>
            </div>
            <div class="col-4">
              <input ref={this.perfect} type="number" class="form-control" id="perfect" name="perfect" min="0" />
            </div>
            <div class="col-1">
              <label for="far" class="col-form-label">
                Far
              </label>
            </div>
            <div class="col-2">
              <input ref={this.far} type="number" class="form-control" id="far" name="far" min="0" />
            </div>
            <div class="col-1">
              <label for="lost" class="col-form-label">
                Lost
              </label>
            </div>
            <div class="col-2">
              <input ref={this.lost} type="number" class="form-control" id="lost" name="lost" min="0" />
            </div>
          </div>
          <div class="row my-2">
            <div class="col-2">
              <label for="score" class="col-form-label">
                分数
              </label>
            </div>
            <div class="col">
              <input ref={this.score} type="number" class="form-control" id="score" name="score" min="0" />
            </div>
          </div>
          <div class="row my-2">
            <div class="col-auto">
              <label for="clear" class="col-form-label">
                通关类型（看搭档）
              </label>
            </div>
            <div class="col">
              <select ref={this.clear} class="form-select" name="clear" id="clear">
                <option value="">不知道</option>
                <option value="HC">Hard Clear</option>
                <option value="NC">Normal Clear</option>
                <option value="EC">Easy Clear</option>
                <option value="TL">Track Lost</option>
              </select>
            </div>
          </div>
          <div class="row my-2">
            <div class="col-auto">
              <label for="play-time" class="col-form-label">
                游玩时间（可选）
              </label>
            </div>
            <div class="col">
              <input
                ref={this.playTime}
                type="datetime-local"
                class="form-control"
                id="play-time"
                name="play-time"
                step={1}
              />
            </div>
            <div class="col">
              <button
                type="button"
                class="btn btn-secondary"
                onClick={() => {
                  setDateToDatetimeLocal(this.playTime, getNow());
                  this.playTime.dispatchEvent(new Event("change", { bubbles: true }));
                }}
              >
                现在
              </button>
            </div>
          </div>
          <div class="my-2">
            <p>谱面成绩预览：</p>
            {this.card}
          </div>
        </form>
      </div>
    );
  }

  getPlayResult(): PlayResult | null {
    const results = this.getResults();
    if (!results) {
      return null;
    }
    const { scoreResult, clearRank, noteResult } = results;
    if (!scoreResult) {
      return null;
    }
    const { chartId, score } = scoreResult;
    const date = getDateFromDatetimeLocal(this.playTime).getTime();
    if (noteResult) {
      return {
        type: "note",
        chartId,
        clear: clearRank,
        result: noteResult,
        date,
      };
    }
    return {
      type: "score",
      chartId,
      clear: clearRank,
      score,
      date,
    };
  }

  private updateCardSize() {
    const zoom = this.form.clientWidth / 1000;
    cssVar(this, "card-scale", `${zoom}`);
  }

  private handleFormChange(e: Event) {
    const { target } = e;
    if (target instanceof HTMLInputElement) {
      if (target === this.chartSelect.searchInput && target.value === this.chartSelect.selectedItem()?.chart?.id) {
        this.handleChartChange();
      } else if (target === this.playTime) {
        this.handlePlayTimeChange();
      } else if (target.type === "radio" && target.name === "type") {
        // @ts-expect-error skip radio value type check
        this.handleTypeChange(target.value);
      } else {
        this.handlePlayResultChange();
      }
    } else {
      this.handlePlayResultChange();
    }
  }

  private async handleChartChange() {
    const chart = this.chartSelect.selectedItem()?.chart;
    if (!chart) {
      return;
    }
    const songs = await this.chartService.getSongData();
    const song = songs.find((s) => s.id === chart.songId);
    if (!song) {
      throw new Error(`数据出问题力，${chart.songId}歌曲未找到`);
    }
    this.card.setChart(song, chart);
    // @ts-expect-error skip type check
    this.handleTypeChange(new FormData(this.form).get("type"));
  }

  private handleTypeChange(type: PlayerInputType) {
    type Inputs = keyof Pick<PlayResultForm, "perfect" | "far" | "lost" | "score">;

    const enableState: Record<Inputs, boolean> = {
      far: false,
      lost: false,
      perfect: false,
      score: false,
    };

    switch (type) {
      case "detailed":
        enableState.perfect = true;
        enableState.far = true;
        enableState.lost = true;
        break;
      case "screenshot":
        enableState.far = true;
        enableState.lost = true;
        enableState.score = true;
        break;
      case "score-only":
        enableState.score = true;
        break;
    }

    for (const key of Object.keys(enableState) as Inputs[]) {
      const input = this[key];
      const enabled = enableState[key];
      input.value = "";
      input.disabled = !enabled;
      input.required = enabled;
    }
    this.handlePlayResultChange();
  }

  private handlePlayResultChange() {
    const results = this.getResults();
    if (!results) {
      return;
    }
    const { noteResult, scoreResult, clearRank } = results;
    this.card.setResult(noteResult, scoreResult, clearRank);
  }

  private handlePlayTimeChange() {
    this.card.setPlayTime(getDateFromDatetimeLocal(this.playTime));
    this.card.setNow(getNow());
  }

  private getResults(): {
    noteResult: NoteResult | null;
    scoreResult: ScoreResult | null;
    clearRank: ClearRank | null;
  } | null {
    const chart = this.chartSelect.selectedItem()?.chart;
    if (!chart) {
      return null;
    }
    const toNum = (input: HTMLInputElement) => (input.value ? +input.value : null);
    const perfect = toNum(this.perfect);
    const far = toNum(this.far);
    const lost = toNum(this.lost);
    let score = toNum(this.score);
    const noteResult = this.musicPlayService.inferNoteResult(chart, perfect, far, lost, score);
    if (noteResult) {
      score = this.musicPlayService.computeScore(chart, noteResult);
    }
    // @ts-expect-error skip check
    let clear: PartnerClearRank | null = this.clear.value || null;
    let scoreResult: ScoreResult | null = null;
    let clearRank: ClearRank | null = null;
    clearRank = noteResult ? this.musicPlayService.computeClearRank(noteResult, chart, clear) : clear;
    if (score != null) {
      scoreResult = this.musicPlayService.computeScoreResult(score, chart);
    }
    return { noteResult, scoreResult, clearRank };
  }
}
