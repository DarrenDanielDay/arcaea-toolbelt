import loadingImg from "../../../assets/loading.gif";
import { Component, HyplateElement, Show, cssVar, listen, signal } from "hyplate";
import { $ProfileService, ProfileService } from "../../../services/declarations";
import { Inject } from "../../../services/di";
import { Best30 } from "../../components/b30";
import { alert } from "../../components/fancy-dialog";
import { Route } from "../router";
import { download } from "../../../utils/download";
import { bootstrap } from "../../styles/index";
import { loading } from "../../components/loading";
import { future } from "../../../utils/future";
import { getNow } from "../../../utils/time";

@Component({
  tag: "player-b30",
  styles: [bootstrap],
})
class PlayerB39 extends HyplateElement {
  @Inject($ProfileService)
  accessor profileService!: ProfileService;
  best30 = new Best30();
  override render() {
    this.effect(() => {
      (async () => {
        const profile = await this.profileService.getProfile();
        if (!profile) {
          alert("未选择存档");
          return;
        }
        const b30 = await this.profileService.b30(profile);
        this.best30.b30.set(b30);
      })();
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
    return (
      <div>
        <form class="m-3">
          <div>
            <div class="form-check form-check-inline">
              <input type="checkbox" h-model:boolean={this.best30.hd} name="hd" id="hd" class="form-check-input" />
              <label for="hd" class="form-check-label">
                高清
              </label>
            </div>
            <button class="btn btn-primary" onClick={() => this.exportImg()} type="button">
              导出图片
            </button>
          </div>
        </form>
        <div style:overflow="auto">{this.best30}</div>
      </div>
    );
  }

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
