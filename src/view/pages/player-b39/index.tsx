import { sheet } from "./style.css.js";
import loadingImg from "../../../assets/loading.gif";
import {
  AutoRender,
  Component,
  Future,
  HyplateElement,
  computed,
  cssVar,
  effect,
  element,
  listen,
  nil,
  signal,
} from "hyplate";
import {
  $ChartService,
  $Gateway,
  $MusicPlayService,
  $ProfileService,
  ChartService,
  ChartStatistics,
  Gateway,
  MusicPlayService,
  ProfileService,
} from "../../../services/declarations";
import { Inject } from "../../../services/di";
import { Best30YukiChan } from "../../components/b30-yukichan";
import { FancyDialog, alert } from "../../components/fancy-dialog";
import { $Router, Route, Router } from "../router";
import { download } from "../../../utils/download";
import { bootstrap } from "../../styles/index";
import { loading } from "../../components/loading";
import { ClearRank, Grade } from "../../../models/music-play";
import { HelpTip } from "../../components/help-tip";
import { esModule } from "../../../utils/misc";
import { RPC, RPCConnection, WindowMessageHub } from "../../../utils/rpc";
import type { ClientAPI, HostAPI, ImageFile } from "../../../services/generator-api";
import { HostAPIImpl } from "../../../services/generator-api-impl.js";

~HelpTip;

export type B30Params = "template" | "url";

@Component({
  tag: "player-b30",
  styles: [bootstrap, sheet],
})
class PlayerB39 extends HyplateElement {
  @Inject($ProfileService)
  accessor profileService!: ProfileService;
  @Inject($MusicPlayService)
  accessor musicPlay!: MusicPlayService;
  @Inject($Gateway)
  accessor gateway!: Gateway;
  @Inject($Router)
  accessor router!: Router;

  @Inject($ChartService)
  accessor chart!: ChartService;
  @Inject(HostAPIImpl, { once: true })
  accessor host!: HostAPIImpl;

  best30 = new Best30YukiChan();
  imagePicker = new FancyDialog();
  downloadModal = new FancyDialog();
  customTemplateIframe: HTMLIFrameElement | null = null;

  packs = element("select");
  gradeFilter = signal<Grade | ClearRank.PureMemory | ClearRank.Maximum | "">("");
  minConstant = signal(NaN);
  maxConstant = signal(NaN);
  template = signal("yuki-chan");
  custom = signal("");
  customTemplateStarted = signal(false);

  rpc = new RPC<HostAPI, ClientAPI>({
    hub: new WindowMessageHub(() => {
      const targetWindow = this.customTemplateIframe!.contentWindow!;
      return {
        input: window,
        output: targetWindow,
      };
    }),
    impl: {
      exportAsImage: (...args) => this.exportAsImageFile(...args),
      getAllCharacters: (...args) => this.host.getAllCharacters(...args),
      getImages: (...args) => this.host.getImages(...args),
      getPackList: (...args) => this.host.getPackList(...args),
      getPreference: (...args) => this.host.getPreference(...args),
      getSongList: (...args) => this.host.getSongList(...args),
      resolveAssets: (...args) => this.host.resolveAssets(...args),
      pickImage: (...args) => this.pickImage(...args),
      resolveBackgrounds: (...args) => this.host.resolveBackgrounds(...args),
      resolveCharacterImages: (...args) => this.host.resolveCharacterImages(...args),
      resolveCovers: (...args) => this.host.resolveCovers(...args),
      resolveGradeImgs: (...args) => this.host.resolveGradeImgs(...args),
      resolvePotentialBadge: (...args) => this.host.resolvePotentialBadge(...args),
      savePreference: (...args) => this.host.savePreference(...args),
    },
  });
  #connection: RPCConnection<ClientAPI> | null = null;

  override render() {
    this.effect(() => {
      const { template, url } = this.router.parseQuery<B30Params>();
      if (template === "custom-template") {
        this.template.set(template);
      }
      if (url) {
        this.custom.set(url);
      }

      const cleanupParams = effect(() => {});
      queueMicrotask(this.computeConditionalB30);
      const events = listen(this.best30 as HTMLElement);
      const unsubscribe = events("dblclick", () => {
        this.best30.requestFullscreen({
          navigationUI: "hide",
        });
      });
      return () => {
        unsubscribe();
        this.stopConnection();
        cleanupParams();
      };
    });
    this.autorun(() => {
      const template = this.template();
      const url = this.custom();
      const isCustomTemplate = template === "custom-template";
      if (!isCustomTemplate) {
        queueMicrotask(() => {
          this.stopConnection();
        });
      }
      this.router.updateQuery<B30Params>({
        template: isCustomTemplate ? template : null,
        url: url || null,
      });
    });
    return <Future promise={this.chart.getStatistics()}>{(chartStats) => this._render(chartStats)}</Future>;
  }

  _render({ minimumConstant, maximumConstant }: ChartStatistics) {
    const notUsingYukiChan = computed(() => this.template() !== "yuki-chan");
    const notUsingCustomTemplate = computed(() => this.template() !== "custom-template");
    return (
      <div>
        {this.imagePicker}
        {this.downloadModal}
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
                <option value={ClearRank.Maximum}>理论值</option>
                <option value={ClearRank.PureMemory}>PM</option>
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
            <div class="input-group my-2">
              <div class="input-group-text">
                <div class="form-check">
                  <input
                    type="radio"
                    value="yuki-chan"
                    id="yuki-chan"
                    class="form-check-input"
                    h-model={this.template}
                  ></input>
                  <label for="yuki-chan" class="form-check-label">
                    暮雪酱
                  </label>
                </div>
              </div>
              <div class="input-group-text">
                <input
                  type="checkbox"
                  h-model:boolean={this.best30.hd}
                  name="hd"
                  id="hd"
                  class="form-check-input"
                  disabled={notUsingYukiChan}
                />
                <label for="hd" class="form-check-label">
                  高清
                </label>
                <help-tip>
                  <p>
                    高清选项可导出更清晰的曲绘和文字的b30图，但同时也比较大（约10M），导出较慢，也会消耗更多流量。
                    <span class="ios-issue">iOS设备有Safari的内存限制，可能无法导出高清图片。</span>
                  </p>
                </help-tip>
              </div>
              <button class="btn btn-primary" onClick={this.exportImg} type="button" disabled={notUsingYukiChan}>
                导出图片
              </button>
            </div>
            <div class="input-group my-2">
              <div class="input-group-text">
                <div class="form-check">
                  <input
                    type="radio"
                    value="custom-template"
                    id="custom"
                    class="form-check-input"
                    h-model={this.template}
                  ></input>
                  <label for="custom-template" class="form-check-label">
                    自定义模板
                  </label>
                </div>
              </div>
              <label for="custom" class="input-group-text form-check-label">
                地址
              </label>
              <input
                type="text"
                h-model={this.custom}
                name="custom"
                id="custom"
                placeholder="默认AOL模板"
                class="form-control"
                disabled={computed(() => notUsingCustomTemplate() || this.customTemplateStarted())}
              />
              <button
                class={computed(() => `btn btn-${this.customTemplateStarted() ? "danger" : "primary"}`)}
                onClick={this.toggleConnection}
                type="button"
                disabled={notUsingCustomTemplate}
              >
                {computed(() => (this.customTemplateStarted() ? "停止" : "启动"))}
              </button>
            </div>
          </div>
        </form>
        <div class="b30-container">
          <AutoRender>
            {() => {
              if (this.template() === "yuki-chan") {
                return <>{this.best30}</>;
              }
              if (!this.customTemplateStarted()) {
                return nil;
              }
              return <iframe ref={this.customTemplateIframe!}></iframe>;
            }}
          </AutoRender>
        </div>
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
          clear,
        } = result;
        if (rankFilter) {
          if (rankFilter === ClearRank.PureMemory || rankFilter === ClearRank.Maximum) {
            const levels = [ClearRank.PureMemory, ClearRank.Maximum];
            if (levels.indexOf(rankFilter) > levels.indexOf(clear!)) return false;
          } else if (this.musicPlay.compareGrade(grade, rankFilter) > 0) {
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
    await this.#connection?.api.setB30(b30);
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
    const { blob, filename } = await loading(
      (async () => {
        progress.set("正在加载模块");
        const html2canvas = await esModule(import("html2canvas"));
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
        return {
          blob,
          filename,
        };
      })(),
      <div style="display: flex; flex-direction: column; align-items: center;">
        <p>{progress}</p>
        <img src={loadingImg} width="48" height="48"></img>
      </div>
    );
    await this.exportAsImageFile(blob, {
      filename,
      autoDownload: false,
    });
  };

  toggleConnection = async () => {
    const started = !this.customTemplateStarted();
    if (started) {
      this.startConnection();
    } else {
      this.stopConnection();
    }
  };

  async startConnection() {
    const custom = this.custom();
    let site: string;
    if (custom) {
      try {
        site = new URL(custom).href;
      } catch {
        alert("地址格式不正确");
        return;
      }
    } else {
      site = new URL(process.env.ARCAEA_TOOLBELT_AOL_B30, document.baseURI).href;
    }
    this.customTemplateIframe = element("iframe");
    this.customTemplateStarted.set(true);
    this.customTemplateIframe.src = site;
    this.host.site = site;
    this.#connection = this.rpc.start();
    await this.computeConditionalB30();
  }

  stopConnection() {
    this.customTemplateStarted.set(false);
    this.#connection?.stop();
    this.customTemplateIframe = null;
  }

  pickImage: HostAPI["pickImage"] = async (urls, options) => {
    const { display, title } = options;
    const images = await loading(this.host.getImages(urls), <div>正在下载图片……</div>);
    const selected = signal(images.find((image) => image.resourceURL.href === options.defaultSelected?.href));
    const renderImages = () => {
      const items = images.map((image) => (
        <div
          class="item"
          class:selected={computed(() => selected() === image)}
          onClick={() => {
            selected.set(image);
          }}
        >
          <img src={image.blobURL}></img>
        </div>
      ));
      const { height, columns, width } = display;
      return (
        <div
          class="image-picker cells"
          var:item-height={`${height}px`}
          var:grid-columns={`${columns}`}
          var:item-width={`${width}px`}
        >
          {items}
        </div>
      );
    };
    const imageFile = await this.imagePicker.showPicker<ImageFile>((done, cancel) => {
      return [
        <div slot="content">
          <h2>{title}</h2>
          {renderImages()}
        </div>,
        <div slot="footer">
          <button
            class="btn btn-primary"
            disabled={computed(() => !selected())}
            onClick={() => {
              const selectedImage = selected();
              if (selectedImage) {
                done(selectedImage);
              } else {
                cancel();
              }
            }}
          >
            选择
          </button>
          <button
            class="btn btn-secondary"
            onClick={() => {
              cancel();
            }}
          >
            取消
          </button>
        </div>,
      ];
    });
    return imageFile?.resourceURL ?? null;
  };

  exportAsImageFile: HostAPI["exportAsImage"] = async (data, options) => {
    const url = URL.createObjectURL(data);
    const { filename = url.toString(), autoDownload = true } = options ?? {};
    try {
      if (autoDownload) {
        download(url, filename);
      }
      await this.downloadModal.showPicker<boolean>((done) => [
        <div slot="content">
          {autoDownload ? (
            <>
              <p>如果图片没有自动下载，请点击下面的链接打开图片手动保存。</p>
              <div>
                <a href={url} target="_blank">
                  {filename}
                </a>
              </div>
            </>
          ) : (
            <>
              <p>点击下方链接下载图片：</p>
              <div>
                <a href={url} download={filename}>
                  {filename}
                </a>
              </div>
              <p>点击下方链接在新页面预览图片：</p>
              <div>
                <a href={url} target="_blank">
                  {filename}
                </a>
              </div>
            </>
          )}
        </div>,
        <div slot="footer">
          <button
            class="btn btn-primary"
            onClick={() => {
              done(true);
            }}
          >
            完成
          </button>
        </div>,
      ]);
    } finally {
      URL.revokeObjectURL(url);
    }
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
