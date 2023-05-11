import { Component, OnConnected, clone, fragment, query, textContent } from "../../../utils/component";
import html from "bundle-text:./template.html";
import { bootstrap } from "../../styles";
import { sheet } from "./style.css.js";
import { $ChartService, ChartService, SearchResult } from "../../../services/declarations";
import { Inject } from "../../../services/di";
import { getFormData } from "../../../utils/form";
import { alert } from "../../components/global-message";
import { ChartInfo } from "../../components/chart-info";

const templates = query({
  panel: "template#chart-query-panel",
  resultItem: "template#query-result-item",
  chartDisplay: "template#chart-display",
} as const)(fragment(html));

const main = query({
  query: "button.query",
  roll: "button.roll",
  results: "div.result-table",
} as const);

const item = query({
  constant: "div.constant",
  charts: "div.charts",
} as const);

const chart = query({
  container: "div.cover-container",
  cover: "img.cover",
} as const);

export
@Component({
  selector: "chart-query",
  css: [bootstrap, sheet],
})
class ChartQuery extends HTMLElement implements OnConnected {
  @Inject($ChartService)
  accessor chartService!: ChartService;
  connectedCallback(): void {
    const shadow = this.shadowRoot!;
    const frag = clone(templates.panel.content);
    const panel = main(frag);
    const getFormModel = () => {
      const { "min-constant": min, "max-constant": max } = getFormData(panel.query.form!);
      return {
        min: min ? +min : -Infinity,
        max: max ? +max : Infinity,
      };
    };
    panel.query.onclick = async () => {
      const { min, max } = getFormModel();
      const charts = await this.chartService.queryChartsByConstant(min, max);
      renderResults(charts);
    };
    panel.roll.onclick = async () => {
      const { min, max } = getFormModel();
      const chart = await this.chartService.roll(min, max);
      if (chart) {
        renderResults([chart]);
      } else {
        renderResults([]);
      }
    };
    shadow.appendChild(frag);
    const renderResults = (results: SearchResult[]) => {
      const container = panel.results;
      container.innerHTML = "";
      const groups = results.reduce<Record<string, SearchResult[]>>((map, result) => {
        (map[result.constant.toFixed(1)] ??= []).push(result);
        return map;
      }, {});
      for (const [constant, results] of Object.entries(groups)) {
        const frag = clone(templates.resultItem.content);
        const itemRefs = item(frag);
        textContent(itemRefs, {
          constant,
        });
        for (const result of results) {
          const chartFrag = clone(templates.chartDisplay.content);
          const chartRefs = chart(chartFrag);
          chartRefs.cover.src = result.cover;
          chartRefs.cover.onclick = () => {
            const chartInfo = new ChartInfo();
            chartInfo.setChart(result.chart, result.song);
            alert(chartInfo);
          };
          chartRefs.container.style.setProperty("--difficulty", `var(--${result.difficulty})`);
          itemRefs.charts.appendChild(chartFrag);
        }
        container.appendChild(frag);
      }
    };
  }
}
