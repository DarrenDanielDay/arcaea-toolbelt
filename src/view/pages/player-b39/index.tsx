import { sheet } from "./style.css.js";
import loadingImg from "../../../assets/loading.gif";
import { Component, Future, HyplateElement, Show, cssVar, element, listen, signal } from "hyplate";
import {
  $ChartService,
  $MusicPlayService,
  $ProfileService,
  ChartService,
  ChartStatistics,
  MusicPlayService,
  ProfileService,
} from "../../../services/declarations";
import { Inject } from "../../../services/di";
import { Best30 } from "../../components/b30";
import { alert } from "../../components/fancy-dialog";
import { Route } from "../router";
import { download } from "../../../utils/download";
import { bootstrap } from "../../styles/index";
import { loading } from "../../components/loading";
import { future } from "../../../utils/future";
import { Grade } from "../../../models/music-play";
import { HelpTip } from "../../components/help-tip";
~HelpTip;
@Component({
  tag: "player-b30",
  styles: [bootstrap, sheet],
})
class PlayerB39 extends HyplateElement {
  @Inject($ProfileService)
  accessor profileService!: ProfileService;
  @Inject($MusicPlayService)
  accessor musicPlay!: MusicPlayService;

  @Inject($ChartService)
  accessor chart!: ChartService;

  best30 = new Best30();

  packs = element("select");
  gradeFilter = signal<Grade | "">("");
  minConstant = signal(NaN);
  maxConstant = signal(NaN);

  override render() {
    this.effect(() => {
      queueMicrotask(this.computeConditionalB30);
      const events = listen(this.best30 as HTMLElement);
      const unsubscribe = events("dblclick", () => {
        this.best30.requestFullscreen({
          navigationUI: "hide",
        });
      });
      return () => {
        unsubscribe();
      };
    });
    return <Future promise={this.chart.getStatistics()}>{(chartStats) => this._render(chartStats)}</Future>;
  }

  _render({ minimumConstant, maximumConstant }: ChartStatistics) {
    return (
      <div>
        <form class="m-3">
          <details class="mb-3">
            <summary>高级查询</summary>
            <div class="input-group">
              <label for="packs" class="input-group-text">
                仅免费曲包
                <help-tip>
                  <p>以下曲包内曲目均可直接/在世界模式常驻地图/限时地图免费获得：</p>
                  {this.chart.freePacks.map((pack) => (
                    <p>{pack}</p>
                  ))}
                  <p>
                    可多选，电脑是按住<kbd>Ctrl</kbd>后点击进行多选。
                  </p>
                  <p>若不选择任何曲包或仅选择“无”，视为无此过滤条件。</p>
                </help-tip>
              </label>
              <select ref={this.packs} class="form-select" size="4" multiple name="packs">
                <option value="">无</option>
                {this.chart.freePacks.map((pack) => (
                  <option value={pack}>{pack}</option>
                ))}
              </select>
            </div>
            <div class="input-group">
              <label class="input-group-text" for="grade">
                评级≥
              </label>
              <select h-model={this.gradeFilter} class="form-select" id="grade" name="grade">
                <option value="">无</option>
                {this.musicPlay.grades.map((grade) => (
                  <option value={grade}>{grade}</option>
                ))}
              </select>
              <input
                name="min-constant"
                type="number"
                min={minimumConstant}
                max={maximumConstant}
                step="0.1"
                placeholder={minimumConstant.toFixed(1)}
                class="form-control"
                h-model:number={this.minConstant}
                keypress-submit
              />
              <span class="input-group-text">≤ 定数 ≤</span>
              <input
                name="max-constant"
                type="number"
                min={maximumConstant}
                max={maximumConstant}
                step="0.1"
                placeholder={maximumConstant.toFixed(1)}
                class="form-control"
                h-model:number={this.maxConstant}
                keypress-submit
              />
            </div>
            <div class="row action">
              <button type="button" class="btn btn-primary" onClick={this.computeConditionalB30}>
                计算条件b30
              </button>
            </div>
          </details>
          <div>
            <div class="input-group">
              <div class="input-group-text">
                <input type="checkbox" h-model:boolean={this.best30.hd} name="hd" id="hd" class="form-check-input" />
                <label for="hd" class="form-check-label">
                  高清
                </label>
                <help-tip>
                  <p>高清选项可导出更清晰的曲绘和文字的b30图，但同时也比较大（约10M），导出较慢，也会消耗更多流量。</p>
                </help-tip>
              </div>
              <button class="btn btn-primary" onClick={() => this.exportImg()} type="button">
                导出图片
              </button>
            </div>
          </div>
        </form>
        <div style:overflow="auto">{this.best30}</div>
      </div>
    );
  }

  computeConditionalB30 = async () => {
    const profile = await this.profileService.getProfile();
    if (!profile) {
      alert("未选择存档");
      return;
    }
    const packs = Array.from(this.packs.querySelectorAll("option"))
      .filter((o) => o.selected && o.value)
      .map((o) => o.value);
    const rankFilter = this.gradeFilter(),
      minConstant = this.minConstant(),
      maxConstant = this.maxConstant();
    const b30 = await this.profileService.b30(profile, {
      packs,
      filter: (result) => {
        const {
          score: { grade },
          chart: { constant },
        } = result;
        if (rankFilter) {
          if (this.musicPlay.compareGrade(grade, rankFilter) > 0) {
            return false;
          }
        }
        if (constant < minConstant || constant > maxConstant) {
          return false;
        }
        return true;
      },
    });
    this.best30.b30.set(b30);
  };

  exportImg = async () => {
    const b30 = this.best30.b30();
    if (!b30) {
      alert("b30计算尚未完成，请稍后……");
      return;
    }
    const exportNode = this.best30.getExportNode();
    const profile = await this.profileService.getProfile();
    if (!exportNode || !profile) return;
    const progress = signal("");
    const link = signal<{ url: string; filename: string } | null>(null);
    const task = future();
    await loading(
      (async () => {
        progress.set("正在加载模块");
        // @ts-expect-error parcel ESM default
        const html2canvas: typeof import("html2canvas").default = await import("html2canvas");
        progress.set("正在绘制图片");
        const canvas = await html2canvas(exportNode);
        progress.set("正在导出图片");
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject();
            }
          }, "image/jpeg");
        });
        const now = new Date(b30.queryTime);
        const pad2 = (n: number) => `${n}`.padStart(2, "0");
        const filename = `b30 ${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())} ${pad2(
          now.getHours()
        )}-${pad2(now.getMinutes())}-${pad2(now.getSeconds())}.jpg`;
        const url = URL.createObjectURL(blob);
        link.set({
          url,
          filename,
        });
        download(url, filename);
        await task.promise;
      })(),
      <div style="display: flex; flex-direction: column; align-items: center;">
        <p>{progress}</p>
        <Show when={link} fallback={() => <img src={loadingImg} width="48" height="48"></img>}>
          {({ url, filename }) => (
            <div>
              <p>如果图片没有自动下载，请点击下面的链接打开图片手动保存。</p>
              <div>
                <a href={url} target="_blank">
                  {filename}
                </a>
              </div>
              <div class="modal-footer">
                <button
                  class="btn btn-primary"
                  onClick={() => {
                    task.done();
                    URL.revokeObjectURL(url);
                  }}
                >
                  完成
                </button>
              </div>
            </div>
          )}
        </Show>
      </div>
    );
  };
}

export const PlayerB30Route: Route = {
  path: "/b30",
  title: "b30",
  setup() {
    const page = new PlayerB39();
    const width = window.innerWidth;
    if (width < 800) {
      cssVar(document.body, "inner-width", `${width}`);
    }
    return page;
  },
};
