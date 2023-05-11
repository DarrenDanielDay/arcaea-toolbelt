import html from "bundle-text:./template.html";
import { sheet } from "./style.css.js";
import { Component, query, textContent } from "../../../utils/component";
import { bootstrap } from "../../styles";
import { Chart, Song } from "../../../models/music-play";

const chartInfo = query({
  constant: "span.constant",
  cover: "img.cover",
  level: "span.level",
  name: "span.name",
  bpm: "span.bpm",
  pack: "span.pack",
  notes: "span.notes",
} as const);

export
@Component({
  selector: "chart-info",
  html,
  css: [bootstrap, sheet],
})
class ChartInfo extends HTMLElement {
  setChart(chart: Chart, song: Song) {
    const refs = chartInfo(this.shadowRoot!);
    textContent(refs, {
      bpm: song.bpm,
      constant: chart.constant.toFixed(1),
      level: `${chart.difficulty} ${chart.level}`,
      name: chart.byd?.song ?? song.name,
      notes: chart.note + "",
      pack: song.pack,
    });
    refs.cover.src = chart.byd?.cover ?? song.cover,
    this.style.setProperty("--difficulty", `var(--${chart.difficulty})`);
  }
}
