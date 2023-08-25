import { sheet } from "./style.css.js";
import { Chart, ScoreResult, Song, ClearRank, NoteResult } from "../../../models/music-play";
import { Component, HyplateElement, computed, content, element, signal, cssVar } from "hyplate";
import { gradeImages, clearImages } from "../../../assets/play-result";

function formatScore(score: number) {
  const raw = Math.floor(score).toString();
  if (raw.length > 8 || score < 0) {
    throw new Error(`Invalid score ${score}`);
  }
  const padded = raw.padStart(8, "0");
  return `${padded.slice(0, 2)}'${padded.slice(2, 5)}'${padded.slice(5, 8)}`;
}

const canvas = element("canvas");
const ctx = canvas.getContext("2d")!;
ctx.font = `600 48px / 80px ${getComputedStyle(document.body).fontFamily}`;

const measureSongTitle = (name: string): number => {
  const measure = ctx.measureText(name);
  return measure.width;
};

export
@Component({
  tag: "result-card",
  styles: [sheet],
})
class ResultCard extends HyplateElement {
  songTitle = element("div");
  chartInfo = signal<{ song: Song; chart: Chart } | null>(null);
  bestNo = signal<number | null>(null);
  noteResult = signal<Partial<NoteResult>>({});
  scoreResult = signal<ScoreResult | null>(null);
  clearRank = signal<ClearRank | null>(null);
  override render() {
    this.effect(() => {
      this.resizeCard();
      const ob = new ResizeObserver(() => {
        this.resizeCard();
      });
      ob.observe(this);
      return () => {
        ob.disconnect();
      };
    });
    this.autorun(() => {
      const info = this.chartInfo();
      if (!info) return;
      const { chart, song } = info;
      const { difficulty } = chart;
      cssVar(this, "potential-color", `var(--${difficulty}-light)`);
      cssVar(this, "constant-color", `var(--${difficulty})`);
      const title = chart.byd?.song ?? song.name;
      content(this.songTitle, title);
      const length = measureSongTitle(title);
      const titleLength = length < 664 ? 664 : length;
      cssVar(this, "title-length", `${titleLength}`);
    });
    return (
      <div
        class="card"
        part="card"
        var:no-color={computed(() => {
          const bestNo = this.bestNo();
          if (!bestNo || bestNo > 3) return null;
          return `var(--${bestNo})`;
        })}
      >
        <img
          class="cover"
          src={computed(() => {
            const info = this.chartInfo();
            if (!info) return "";
            const { chart, song } = info;
            return chart.byd?.cover ?? song.cover;
          })}
          width="288"
          height="288"
        />
        <div class="details">
          <div class="data-badge">
            <div class="potential">{computed(() => this.scoreResult()?.potential.toFixed(4) ?? "")}</div>
            <div class="constant">{computed(() => this.chartInfo()?.chart.constant.toFixed(1) ?? "")}</div>
            <div class="rank">
              <img
                class="grade"
                src={computed(() => {
                  const grade = this.scoreResult()?.grade;
                  return grade ? gradeImages[grade] : null;
                })}
                class:hidden={computed(() => !this.scoreResult())}
              />
              <img
                class="clear"
                src={computed(() => {
                  const clear = this.clearRank();
                  return clear ? clearImages[clear] : null;
                })}
                class:hidden={computed(() => !this.clearRank())}
              />
            </div>
            <div class="no-badge">
              {computed(() => {
                const bestNo = this.bestNo();
                return bestNo == null ? "--" : `#${bestNo}`;
              })}
            </div>
          </div>
          <div ref={this.songTitle} class="song-title">--</div>
          <div class={computed(() => (this.clearRank() === ClearRank.Maximum ? "score max" : "score"))}>
            {computed(() => formatScore(this.scoreResult()?.score ?? 0))}
          </div>
          <div class="play-result">
            <div class="pure">
              Pure / <span class="count">{computed(() => this.noteResult().pure ?? "?")}</span>(+
              <span class="perfect">{computed(() => this.noteResult().perfect ?? "?")}</span>)
            </div>
            <div class="far">
              Far / <span class="count">{computed(() => this.noteResult().far ?? "?")}</span>
            </div>
            <div class="lost">
              Lost / <span class="count">{computed(() => this.noteResult().lost ?? "?")}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  setChart(song: Song, chart: Chart) {
    this.chartInfo.set({ song, chart });
  }

  setResult(noteResult: NoteResult | null, score: ScoreResult | null, clear: ClearRank | null) {
    this.clearRank.set(clear);
    this.noteResult.set(noteResult ?? {});
    this.scoreResult.set(score);
  }

  setBest(bestNo: number | null) {
    this.bestNo.set(bestNo);
  }

  private resizeCard() {
    cssVar(this, "card-scale", `${this.offsetWidth / 1000}`);
    this.style.height = `${this.offsetWidth * 0.32}px`;
  }
}
