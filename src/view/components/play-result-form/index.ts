import { CleanUp, Component, Disposable, OnConnected, OnDisconnected, cleanup, effect } from "../../../utils/component";
import css from "bundle-text:./style.css";
import html from "bundle-text:./template.html";
import { ResultCard } from "../result-card";
import { ChartSelect } from "../chart-select";
import { sheet as bootstrap } from "../../styles/bootstrap.part.css.js";
import { create } from "sheetly";
import { Inject } from "../../../services/di";
import { $ChartService, $MusicPlayService, ChartService, MusicPlayService } from "../../../services/declarations";
import {
  ClearRank,
  NoteResult,
  PartnerClearRank,
  PlayResult,
  PlayerInputType,
  ScoreResult,
} from "../../../models/music-play";

export
@Component({
  selector: "play-result-form",
  html,
  css: [bootstrap, create(css, document.baseURI)],
})
class PlayResultForm extends HTMLElement implements OnConnected {
  @Inject($ChartService)
  accessor chartService!: ChartService;
  @Inject($MusicPlayService)
  accessor musicPlayService!: MusicPlayService;

  chartSelect!: ChartSelect;
  form!: HTMLFormElement;
  far!: HTMLInputElement;
  lost!: HTMLInputElement;
  perfect!: HTMLInputElement;
  score!: HTMLInputElement;
  clear!: HTMLSelectElement;
  card!: ResultCard;


  connectedCallback() {
    const shadow = this.shadowRoot!;
    this.form = shadow.querySelector("form")!;
    this.updateCardSize();
    this.form.addEventListener("change", (e) => this.handleFormChange(e));
    this.chartSelect = shadow.querySelector<ChartSelect>("chart-select")!;
    this.far = shadow.querySelector('input[name="far"]')!;
    this.lost = shadow.querySelector('input[name="lost"]')!;
    this.perfect = shadow.querySelector('input[name="perfect"]')!;
    this.score = shadow.querySelector('input[name="score"]')!;
    this.clear = shadow.querySelector('select[name="clear"]')!;

    this.card = shadow.querySelector<ResultCard>("result-card")!;
    this.handleTypeChange("detailed");
    this.form.addEventListener("submit", async (e) => {
      e.preventDefault();
    });
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
    if (noteResult) {
      return {
        type: "note",
        chartId,
        clear: clearRank,
        result: noteResult,
      };
    }
    return {
      type: "score",
      chartId,
      clear: clearRank,
      score,
    };
  }

  private updateCardSize() {
    const zoom = this.form.clientWidth / 1000;
    this.style.setProperty("--card-scale", `${zoom}`);
  }

  private handleFormChange(e: Event) {
    const { target } = e;
    if (target instanceof HTMLInputElement) {
      if (target === this.chartSelect.searchInput && target.value === this.chartSelect.selectedChart?.id) {
        this.handleChartChange();
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
    const chart = this.chartSelect.selectedChart;
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

  private getResults(): {
    noteResult: NoteResult | null;
    scoreResult: ScoreResult | null;
    clearRank: ClearRank | null;
  } | null {
    const chart = this.chartSelect.selectedChart;
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
