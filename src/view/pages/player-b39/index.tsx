import { sheet } from "./style.css.js";
import loadingImg from "../../../assets/loading.gif";
import {
  AutoRender,
  Component,
  Future,
  HyplateElement,
  Show,
  computed,
  cssVar,
  element,
  listen,
  nil,
  signal,
} from "hyplate";
import {
  $ChartService,
  $FileStorage,
  $Gateway,
  $MusicPlayService,
  $PreferenceService,
  $ProfileService,
  ChartService,
  ChartStatistics,
  FileStorageService,
  Gateway,
  MusicPlayService,
  PreferenceService,
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
import type {
  CandidateResult,
  ClientAPI,
  CustomImageOptions,
  CustomImageResult,
  HostAPI,
  ImageCandidate,
  ImageFile,
  PickImageOptions,
  PickImageResult,
} from "../../../services/generator-api";
import { HostAPIImpl } from "../../../services/generator-api-impl";
import { CleanUpFunc } from "hyplate/types";
import { ImageClipper } from "../../components/image-clipper";

~HelpTip;

export type B30Params = "template" | "url";
export type TemplateKind = "yuki-chan" | "custom-template";

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
  @Inject($FileStorage)
  accessor fs!: FileStorageService;
  @Inject($PreferenceService)
  accessor preference!: PreferenceService;
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
  template = signal<TemplateKind>("yuki-chan");
  custom = signal("");
  customTemplateStarted = signal(false);
  currentSite: URL | null = null;
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
  #autoStart = false;

  override render() {
    this.effect(() => {
      const events = listen(this.best30 as HTMLElement);
      const unsubscribe = events("dblclick", () => {
        this.best30.requestFullscreen({
          navigationUI: "hide",
        });
      });
      return () => {
        unsubscribe();
        this.stopConnection();
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
      this.preference.update({
        template: {
          custom: isCustomTemplate,
          url: url || undefined,
        },
      });
      this.router.updateQuery<B30Params>({
        template: isCustomTemplate ? template : null,
        url: url || null,
      });
    });
    return <Future promise={this.#init()}>{(chartStats) => this._render(chartStats)}</Future>;
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
              if (this.#autoStart) {
                this.#autoStart = false;
                queueMicrotask(() => this.startConnection());
              }
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
    let siteURL: URL;
    if (custom) {
      try {
        siteURL = new URL(custom);
      } catch {
        alert("地址格式不正确");
        return;
      }
    } else {
      siteURL = new URL(process.env.ARCAEA_TOOLBELT_AOL_B30, process.env.BASE_URI);
    }
    this.currentSite = siteURL;
    const site = siteURL.href;
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
    this.currentSite = null;
  }

  pickImage = async <T extends ImageCandidate>(candidates: T[], options: PickImageOptions) => {
    const { currentSite } = this;
    if (!currentSite) {
      throw new Error("Site not connected");
    }
    const { display, title, custom, defaultSelected } = options;
    const { height, columns, width } = display;
    const cleanups: CleanUpFunc[] = [];
    const objURL = (blob: Blob) => {
      const url = URL.createObjectURL(blob);
      cleanups.push(() => URL.revokeObjectURL(url));
      return url;
    };

    try {
      const customImage = signal<CustomImageResult | null>(null);
      const getCustomImage = async () => {
        if (custom) {
          const single = custom.single;
          if (single != null) {
            const url = this.fs.createURL(currentSite, single);
            const uploadedFile = await this.fs.read(url);
            if (uploadedFile) {
              const { blob } = uploadedFile;
              const blobURL = objURL(blob);
              const image: ImageFile = {
                blob: uploadedFile.blob,
                blobURL,
                // TODO 自定义图片的 dist URL 处理
                distURL: url.toString(),
                filename: single,
                resourceURL: url,
              };
              customImage.set({
                type: "custom",
                image,
              });
              return image;
            }
          }
        }
        customImage.set(null);
        return null;
      };

      const candidateImages = await loading(
        (async () => {
          const imageFiles = await this.host.getImages(candidates.map((candidate) => candidate.url));
          return imageFiles.map<CandidateResult<T>>((file, i) => ({
            type: "basic",
            candidate: candidates[i]!,
            image: file,
          }));
        })(),
        <div>正在下载图片……</div>
      );
      await getCustomImage();
      const savedCustomImage = customImage();
      const selectedBasicImage =
        candidateImages.find((item) => item.candidate.url.href === defaultSelected?.href) ?? null;
      const selectedURL = defaultSelected?.href;
      const selected = signal<PickImageResult<T> | null>(
        selectedURL
          ? savedCustomImage?.image?.resourceURL.href === selectedURL
            ? savedCustomImage
            : selectedBasicImage
          : null
      );

      const renderPickImageItem = (pickResult: PickImageResult<T>) => (
        <div
          class="item"
          class:selected={computed(() => selected() === pickResult)}
          onClick={() => {
            selected.set(pickResult);
          }}
        >
          <img src={pickResult.image.blobURL}></img>
        </div>
      );
      const renderCustomPicker = (custom: CustomImageOptions) => {
        const clipper = new ImageClipper();
        const { single, clip } = custom;
        const renderSinglePicker = (path: string) => {
          const input = element("input");
          const handleChange = async () => {
            let file: Blob | null | undefined = input.files?.item(0);
            if (!file) {
              return;
            }
            if (clip) {
              const bitmap = await createImageBitmap(file);
              file = await clipper.clip(bitmap, clip.config, clip.canvas);
              bitmap.close();
            }
            const url = this.fs.createURL(currentSite, path);
            await this.fs.upload(file, url);
            await getCustomImage();
            selected.set(customImage());
          };
          return (
            <div>
              <h3>自定义图片</h3>
              {clipper}
              <div class="row">
                <div class="col">
                  <input type="file" ref={input} class="form-control" accept="image/*" onChange={handleChange}></input>
                </div>
              </div>
              <Show when={customImage} fallback={() => <div>（在上面选择文件添加自定义图片）</div>}>
                {(result) => {
                  return (
                    <div
                      class="custom-image cells"
                      var:item-height={`${height}px`}
                      var:grid-columns={`${columns}`}
                      var:item-width={`${width}px`}
                    >
                      {renderPickImageItem(result)}
                    </div>
                  );
                }}
              </Show>
            </div>
          );
        };

        if (single) {
          return renderSinglePicker(single);
        }
        return nil;
      };

      const renderImages = () => {
        const items = candidateImages.map(renderPickImageItem);
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

      const imageFile = await this.imagePicker.showPicker<PickImageResult<T>>((done, cancel) => {
        return [
          <div slot="content">
            <h2>{title}</h2>
            {custom ? (
              <>
                {renderCustomPicker(custom)}
                <h3>基本图片</h3>
              </>
            ) : (
              nil
            )}
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
      return imageFile;
    } finally {
      cleanups.forEach((clean) => clean());
    }
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

  async #init() {
    let { template, url } = this.router.parseQuery<B30Params>();
    const {
      template: { url: templateURL, custom },
    } = await this.preference.get();
    url ??= templateURL;
    if (template === "custom-template" || custom) {
      this.template.set("custom-template");
      this.#autoStart = true;
    }
    if (url) {
      this.custom.set(url);
    }
    queueMicrotask(this.computeConditionalB30);
    const stats = await this.chart.getStatistics();
    return stats;
  }
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
