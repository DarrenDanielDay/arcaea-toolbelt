import loadingImg from "../../../assets/loading.gif";
import { Component, HyplateElement, cssVar, listen, signal } from "hyplate";
import { $ProfileService, ProfileService } from "../../../services/declarations";
import { Inject } from "../../../services/di";
import { Best30 } from "../../components/b30";
import { alert } from "../../components/global-message";
import { Route } from "../router";
import { download } from "../../../utils/download";
import { bootstrap } from "../../styles/index";
import { loading } from "../../components/loading";

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
    const exportNode = this.best30.getExportNode();
    const profile = await this.profileService.getProfile();
    if (!exportNode || !profile) return;
    await loading(
      (async () => {
        // @ts-expect-error parcel ESM default
        const html2canvas: typeof import("html2canvas").default = await import("html2canvas");
        const canvas = await html2canvas(exportNode);
        await new Promise<void>((resolve, reject) => {
          canvas.toBlob((blob) => {
            if (blob) {
              const now = new Date();
              const pad2 = (n: number) => `${n}`.padStart(2, "0");
              resolve();
              download(
                URL.createObjectURL(blob),
                `b30 ${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())} ${pad2(
                  now.getHours()
                )}-${pad2(now.getMinutes())}-${pad2(now.getSeconds())}.jpg`
              );
            } else {
              reject();
            }
          }, "image/jpeg");
        });
      })(),
      <div>
        <p>正在导出...</p>
        <img src={loadingImg} width="100" height="100"></img>
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
