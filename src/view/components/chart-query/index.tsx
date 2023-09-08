import { bootstrap } from "../../styles";
import { sheet } from "./style.css.js";
import { $ChartService, ChartService, SearchResult } from "../../../services/declarations";
import { Inject } from "../../../services/di";
import { alert } from "../global-message";
import { ChartInfo } from "../chart-info";
import { Component, For, Future, HyplateElement, signal, watch } from "hyplate";

export
@Component({
  tag: "chart-query",
  styles: [bootstrap, sheet],
})
class ChartQuery extends HyplateElement {
  @Inject($ChartService)
  accessor chartService!: ChartService;

  min = signal(NaN);
  max = signal(NaN);
  results = signal<[string, SearchResult[]][]>([]);

  override render() {
    this.effect(() =>
      watch(this.min, (min) => {
        // 包括NaN的情况
        if (!(this.max() >= min)) {
          this.max.set(min);
        }
      })
    );
    this.effect(() =>
      watch(this.max, (max) => {
        // 包括NaN的情况
        if (!(this.min() <= max)) {
          this.min.set(max);
        }
      })
    );
    return (
      <Future promise={this.chartService.getStatistics()}>{(stats) => this._render(stats.maximumConstant)}</Future>
    );
  }

  _render(maximumConstant: number) {
    return (
      <>
        <form
          class="chart-query-form"
          onSubmit={(e) => {
            e.preventDefault();
            this.query();
          }}
        >
          <div class="constants m-3">
            <div class="input">
              <input
                name="min-constant"
                type="number"
                min={1}
                max={maximumConstant}
                step="0.1"
                placeholder="1.0"
                class="form-control"
                h-model:number={this.min}
                keypress-submit
              />
            </div>
            <div class="txt">≤ 定数 ≤</div>
            <div class="input">
              <input
                name="max-constant"
                type="number"
                min={1}
                max={maximumConstant}
                step="0.1"
                placeholder={maximumConstant.toFixed(1)}
                class="form-control"
                h-model:number={this.max}
                keypress-submit
              />
            </div>
          </div>
          <div class="m-3">
            <button type="button" class="btn btn-primary query me-2" onClick={this.query}>
              查询
            </button>
            <button type="button" class="btn btn-secondary roll" onClick={this.roll}>
              roll一个
            </button>
          </div>
        </form>
        <div class="result-table">
          <For of={this.results}>
            {([constant, results]) => {
              return (
                <div class="p-3 border">
                  <div class="result-item row">
                    <div class="constant col-2">{constant}</div>
                    <div class="charts col-10">
                      {results.map((result) => (
                        <div class="cover-container" style={`--difficulty: var(--${result.difficulty})`}>
                          <img
                            class="cover"
                            loading="lazy"
                            src={result.cover}
                            onClick={() => alert(<ChartInfo chart={result.chart} song={result.song} />)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            }}
          </For>
        </div>
      </>
    );
  }
  getFormModel = () => {
    const min = this.min(),
      max = this.max();
    return {
      min: isNaN(min) ? -Infinity : min,
      max: isNaN(max) ? Infinity : max,
    };
  };
  query = async () => {
    const { min, max } = this.getFormModel();
    const charts = await this.chartService.queryChartsByConstant(min, max);
    this.setResults(charts);
  };
  roll = async () => {
    const { min, max } = this.getFormModel();
    const chart = await this.chartService.roll(min, max);
    if (chart) {
      this.setResults([chart]);
    } else {
      this.setResults([]);
    }
  };
  setResults = (charts: SearchResult[]) => {
    const groups = charts.reduce<Record<string, SearchResult[]>>((map, result) => {
      (map[result.constant.toFixed(1)] ??= []).push(result);
      return map;
    }, {});
    this.results.set(Object.entries(groups));
  };
}
