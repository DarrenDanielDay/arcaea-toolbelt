import { CleanUp, Component, Disposable, OnConnected, OnDisconnected, cleanup, effect, element } from "../../../utils/component";
import { sheet } from "./style.css.js";
import html from "bundle-text:./template.html";
import { Chart, Grade, ScoreResult, Song, ClearRank, NoteResult } from "../../../models/music-play";

const gradeImages: Record<Grade, string> = {
  [Grade.EXPlus]:
    "https://wiki.arcaea.cn/images/thumb/f/fe/Play_result_grade_ex%2B.png/75px-Play_result_grade_ex%2B.png",
  [Grade.EX]: "https://wiki.arcaea.cn/images/thumb/c/c5/Play_result_grade_ex.png/75px-Play_result_grade_ex.png",
  [Grade.AA]: "https://wiki.arcaea.cn/images/thumb/c/c7/Play_result_grade_aa.png/75px-Play_result_grade_aa.png",
  [Grade.A]: "https://wiki.arcaea.cn/images/thumb/8/82/Play_result_grade_a.png/75px-Play_result_grade_a.png",
  [Grade.B]: "https://wiki.arcaea.cn/images/thumb/2/28/Play_result_grade_b.png/75px-Play_result_grade_b.png",
  [Grade.C]: "https://wiki.arcaea.cn/images/thumb/5/5e/Play_result_grade_c.png/75px-Play_result_grade_c.png",
  [Grade.D]: "https://wiki.arcaea.cn/images/thumb/1/18/Play_result_grade_d.png/75px-Play_result_grade_d.png",
};

const clearImages: Record<ClearRank, string> = {
  [ClearRank.Maximum]:
    "https://wiki.arcaea.cn/images/thumb/a/a1/Play_result_clear_badge_pure.png/50px-Play_result_clear_badge_pure.png",
  [ClearRank.PureMemory]:
    "https://wiki.arcaea.cn/images/thumb/a/a1/Play_result_clear_badge_pure.png/50px-Play_result_clear_badge_pure.png",
  [ClearRank.FullRecall]:
    "https://wiki.arcaea.cn/images/thumb/1/11/Play_result_clear_badge_full.png/50px-Play_result_clear_badge_full.png",
  [ClearRank.HardClear]:
    "https://wiki.arcaea.cn/images/thumb/a/ac/Play_result_clear_badge_hard.png/50px-Play_result_clear_badge_hard.png",
  [ClearRank.NormalClear]:
    "https://wiki.arcaea.cn/images/thumb/1/15/Play_result_clear_badge_normal.png/50px-Play_result_clear_badge_normal.png",
  [ClearRank.EasyClear]:
    "https://wiki.arcaea.cn/images/thumb/c/cf/Play_result_clear_badge_easy.png/50px-Play_result_clear_badge_easy.png",
  [ClearRank.TrackLost]:
    "https://wiki.arcaea.cn/images/thumb/4/4c/Play_result_clear_badge_fail.png/50px-Play_result_clear_badge_fail.png",
};

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
  selector: "result-card",
  html,
  css: sheet,
})
class ResultCard extends HTMLElement implements OnConnected, OnDisconnected, Disposable {
  cleanups: CleanUp[] = [];
  connectedCallback(): void {
    this.resizeCard();
    effect(this, () => {
      const ob = new ResizeObserver(() => {
        this.resizeCard();
      });
      ob.observe(this);
      return () => {
        ob.disconnect();
      };
    });
  }

  disconnectedCallback(): void {
    cleanup(this);
  }
  setChart(song: Song, chart: Chart) {
    const shadow = this.shadowRoot!;
    const { difficulty } = chart;
    this.style.setProperty("--potential-color", `var(--${difficulty}-light)`);
    this.style.setProperty("--constant-color", `var(--${difficulty})`);
    shadow.querySelector("img.cover")!.src = chart.byd?.cover ?? song.cover;
    shadow.querySelector(".constant")!.textContent = chart.constant.toFixed(1);
    const title = chart.byd?.song ?? song.name;
    shadow.querySelector(".song-title")!.textContent = title;
    const length = measureSongTitle(title);
    const titleLength = length < 664 ? 664 : length;
    this.style.setProperty("--title-length", `${titleLength}`);
  }
  setResult(noteResult: NoteResult | null, score: ScoreResult | null, clear: ClearRank | null) {
    const shadow = this.shadowRoot!;
    const clearImage = shadow.querySelector("img.clear")!;
    const gradeImage = shadow.querySelector("img.grade")!;
    const t = shadow.querySelector(".pure .count")!;
    const p = shadow.querySelector(".pure .perfect")!;
    const f = shadow.querySelector(".far .count")!;
    const l = shadow.querySelector(".lost .count")!;
    const ptt = shadow.querySelector(".potential")!;
    const scoreText = shadow.querySelector(".score")!;
    if (score) {
      ptt.textContent = score.potential.toFixed(4);
      gradeImage.src = gradeImages[score.grade];
      scoreText.textContent = formatScore(score.score);
    } else {
      ptt.textContent = "";
      gradeImage.removeAttribute("src");
      scoreText.textContent = formatScore(0);
    }
    if (clear === ClearRank.Maximum) {
      scoreText.classList.add("max");
    } else {
      scoreText.classList.remove("max");
    }
    if (noteResult) {
      const { pure, perfect, far, lost } = noteResult;
      t.textContent = `${pure}`;
      p.textContent = `${perfect}`;
      f.textContent = `${far}`;
      l.textContent = `${lost}`;
    } else {
      t.textContent = p.textContent = f.textContent = l.textContent = "?";
    }
    if (clear) {
      clearImage.src = clearImages[clear];
    } else {
      clearImage.removeAttribute("src");
    }

    clearImage.style.visibility = clearImage.src ? "visible" : "hidden";
    gradeImage.style.visibility = gradeImage.src ? "visible" : "hidden";
  }
  setBest(bestNo: number | null) {
    const noBadge = this.shadowRoot!.querySelector(".no-badge")!;
    if (!bestNo) {
      noBadge.textContent = "--";
      this.style.removeProperty("--no-color");
      return;
    }
    if (bestNo <= 3) {
      this.style.setProperty("--no-color", `var(--${bestNo})`);
    }
    noBadge.textContent = `#${bestNo}`;
  }
  private resizeCard() {
    this.style.setProperty("--card-scale", `${this.offsetWidth / 1000}`);
    this.style.height = `${this.offsetWidth * 0.32}px`;
  }
}
