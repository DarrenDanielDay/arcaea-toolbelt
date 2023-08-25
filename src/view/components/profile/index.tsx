import { bootstrap } from "../../styles";
import { sheet } from "./style.css.js";
import { Inject } from "../../../services/di";
import { $ChartService, $ProfileService, ChartService, ProfileService } from "../../../services/declarations";
import { alert, confirm } from "../global-message";
import { Component, HyplateElement, computed, element, signal } from "hyplate";
import { Profile } from "../../../models/profile";
import { loading } from "../loading";
import { delay } from "../../../utils/delay";
import { clearImages } from "../../../assets/play-result";
export
@Component({
  tag: "profile-page",
  styles: [bootstrap, sheet],
})
class ProfilePage extends HyplateElement {
  @Inject($ProfileService)
  accessor profileService!: ProfileService;
  @Inject($ChartService)
  accessor chartService!: ChartService;

  createProfileDialog = element("dialog");
  editProfileDialog = element("dialog");
  switchProfileDialog = element("dialog");
  importProfileDialog = element("dialog");
  importSt3Dialog = element("dialog");
  editPtt = element("input");

  greet = signal<Profile | null>(null);

  override render() {
    this.updateGreet();
    return (
      <>
        <div class="row m-3" id="greet">
          {computed(() => {
            const profile = this.greet();
            return profile ? `当前存档：${profile.username}（${profile.potential}）` : "未选择存档";
          })}
        </div>
        <div class="row m-3">
          <button type="button" class="btn btn-outline-secondary create-profile" onClick={this.createProfile}>
            创建存档
          </button>
          <button type="button" class="btn btn-outline-secondary switch-profile" onClick={this.switchProfile}>
            选择存档
          </button>
          <button type="button" class="btn btn-outline-secondary update-profile" onClick={this.updateProfile}>
            修改存档
          </button>
          <button type="button" class="btn btn-outline-secondary import-scores" onClick={this.importSt3}>
            导入st3
          </button>
          <button type="button" class="btn btn-outline-secondary import-profile" onClick={this.importProfile}>
            导入JSON存档
          </button>
          <button type="button" class="btn btn-outline-secondary export-profile" onClick={this.exportProfile}>
            导出当前存档为JSON
          </button>
        </div>
        <div class="row m-3">
          <p>
            关于如何获取本地存档<code>st3</code>文件，可参考
            <a href="docs/mumu-adb.html" target="_blank">
              使用MuMu模拟器和adb获取存档
            </a>
            。
          </p>
          <p>
            本工具有一个配套的脚本，可以用于在{this.renderArcaeaOfficialLink()}
            获取一些信息，包括获取搭档数据、Web API查分（需订阅Arcaea Online）等。
          </p>
          <p>
            关于此脚本更详细的使用方法，请参考
            <a href="docs/plugin-usage.html" target="_blank">
              使用说明
            </a>
            ，下面是简单的使用说明：
          </p>
          <p>
            在电脑上，使用<code>Chrome/Edge</code>浏览器打开
            {this.renderArcaeaOfficialLink()}
            并登录，按F12打开开发者工具，找到控制台（Console），复制并执行以下脚本代码即可调用此脚本。
          </p>
          <div>
            <blockquote id="the-script">
              import("{new URL("services/cross-site-script.js", document.baseURI).href}");
            </blockquote>
          </div>
          <p>
            脚本执行后左下角会出现一个悬浮按钮，点击按钮弹出插件弹框，根据弹框内提示操作即可。关闭弹框后可通过
            <kbd>Ctrl + B</kbd>重新唤起弹框。
          </p>
          <p>若需要频繁使用此脚本，可以使用油猴插件实现在访问Arcaea官网时自动执行。</p>
          <p>若要在手机上执行此脚本，可以参考这篇文章：</p>
          <p>
            <a href="https://www.zhihu.com/question/411017015" target="_blank">
              https://www.zhihu.com/question/411017015
            </a>
          </p>
        </div>
        <dialog ref={this.createProfileDialog} id="create-profile">
          <form>
            <div class="h4">创建存档</div>
            <div class="mb-3">
              <label for="username" class="form-label">
                用户名（仅用于区分存档和b30生成）
              </label>
              <input class="form-control" id="username" name="username" required autofocus />
            </div>
            <div class="mb-3">
              <label for="potential" class="form-label">
                潜力值
              </label>
              <input
                class="form-control"
                id="potential"
                name="potential"
                type="number"
                step="0.01"
                min={0}
                max={this.chartService.maximumPotential.toFixed(2)}
                required
              />
            </div>
            {this.renderFooter()}
          </form>
        </dialog>
        <dialog ref={this.editProfileDialog} id="edit-profile">
          <form>
            <div class="h4">修改存档</div>
            <div class="mb-3">
              <label for="ptt" class="form-label">
                潜力值
              </label>
              <input
                ref={this.editPtt}
                class="form-control"
                id="ptt"
                name="ptt"
                type="number"
                step="0.01"
                min={0}
                max={this.chartService.maximumPotential.toFixed(2)}
                required
                autofocus
              />
            </div>
            {this.renderFooter()}
          </form>
        </dialog>
        <dialog ref={this.switchProfileDialog} id="switch-profile">
          <form>
            <div class="h4">选择存档</div>
            <div class="row">
              <div class="col">
                <select class="form-select" name="profile" required></select>
              </div>
            </div>
            {this.renderFooter()}
          </form>
        </dialog>
        <dialog ref={this.importProfileDialog} id="import-profile">
          <form>
            <div class="h4">导入存档</div>
            <div class="row">
              <div class="col">
                <input type="file" class="form-control" accept=".json" name="file" />
              </div>
            </div>
            {this.renderFooter()}
          </form>
        </dialog>
        <dialog ref={this.importSt3Dialog} id="import-scores">
          <form>
            <div class="h4">从Arcaea本地存档st3文件导入成绩</div>
            <div class="row">
              <div class="col">
                <input type="file" class="form-control" name="file" />
              </div>
            </div>
            <div class="row">
              <div class="col-auto">
                <span class="form-text">
                  已知的小问题：st3内只有谱面最高等级的通关类型信息，没有最佳成绩当次的通关类型信息。通关类型从高到低的顺序是：
                </span>
              </div>
            </div>
            <div class="row">
              <div class="col">
                <span class="form-text">
                  {this.renderInlineImg(clearImages.PM)}
                  {">"}
                  {this.renderInlineImg(clearImages.FR)}
                  {">"}
                  {this.renderInlineImg(clearImages.HC)}
                  {">"}
                  {this.renderInlineImg(clearImages.NC)}
                  {">"}
                  {this.renderInlineImg(clearImages.EC)}
                  {">"}
                  {this.renderInlineImg(clearImages.TL)}
                </span>
              </div>
            </div>
            <div class="row">
              <div class="col-auto">
                <span class="form-text">
                  例如有一个谱面最佳成绩是9990000分0-1，实际通关类型应当为NC（
                  {this.renderInlineImg(clearImages.NC)}
                  ），但先前曾经9980000分4-0全连过，st3存档内的数据将会是FR（
                  {this.renderInlineImg(clearImages.FR)}
                  ），从而可能导致b30里的通关显示存在一些小瑕疵。
                </span>
              </div>
            </div>
            {this.renderFooter()}
          </form>
        </dialog>
      </>
    );
  }

  createProfile = () => {
    this.openFormModal(this.createProfileDialog, async (data) => {
      const username = data.get("username") as string;
      const ptt = +data.get("potential")!;
      if (!isNaN(ptt)) {
        await this.profileService.createOrUpdateProfile(username, ptt);
        if (!(await this.profileService.getProfile())) {
          await this.profileService.useProfile(username);
          this.updateGreet();
        }
      }
    });
  };

  updateProfile = async () => {
    const currentProfile = await this.profileService.getProfile();
    if (!currentProfile) {
      alert("未选择存档");
      return;
    }
    this.editPtt.value = currentProfile.potential;
    this.openFormModal(this.editProfileDialog, async (data) => {
      const ptt = +data.get("ptt")!;
      if (!isNaN(ptt)) {
        await this.profileService.createOrUpdateProfile(currentProfile.username, ptt);
      }
      this.updateGreet();
    });
  };

  switchProfile = async () => {
    const profiles = await this.profileService.getProfileList();
    if (!profiles.length) {
      if (await confirm("当前没有存档，是否前往创建？")) {
        this.createProfile();
      }
      return;
    }
    const profile = await this.profileService.getProfile();
    const select = this.switchProfileDialog.querySelector('select[name="profile"]')!;
    select.innerHTML = profiles.map((p) => `<option>${p}</option>`).join("");
    select.value = profile?.username ?? "";
    this.openFormModal(this.switchProfileDialog, async (data) => {
      const profile = data.get("profile");
      if (profile && typeof profile === "string") {
        await this.profileService.useProfile(profile);
        this.updateGreet();
      }
    });
  };

  exportProfile = async () => {
    await this.profileService.exportProfile();
  };

  importProfile = () => {
    this.openFormModal(this.importProfileDialog, async (data) => {
      const file = data.get("file");
      if (file instanceof File) {
        await this.profileService.importProfile(file);
      }
    });
  };

  importSt3 = async () => {
    const profile = await this.profileService.getProfile();
    if (!profile) {
      return alert(`需要选择存档才能导入成绩`);
    }
    this.openFormModal(this.importSt3Dialog, async (data) => {
      const file = data.get("file");
      if (file instanceof File) {
        try {
          await loading(
            (async () => {
              await delay(300);
              await this.profileService.importDB(file, profile);
            })(),
            <div>正在导入成绩……</div>
          );
          alert("导入成绩成功");
        } catch (error) {
          alert(`${error}`);
        }
      }
    });
  };

  private renderInlineImg(url: string) {
    return <img src={url} class="inline-img"></img>;
  }

  private renderArcaeaOfficialLink() {
    return (
      <a href="https://arcaea.lowiro.com/zh/" target="_blank">
        Arcaea官网
      </a>
    );
  }

  private renderFooter() {
    return (
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary cancel">
          取消
        </button>
        <button type="button" class="btn btn-primary confirm">
          确认
        </button>
      </div>
    );
  }

  private openFormModal(modal: HTMLDialogElement, onConfirm: (data: FormData) => Promise<void>) {
    modal.querySelector("button.cancel")!.onclick = () => {
      modal.close();
    };

    modal.querySelector("button.confirm")!.onclick = async () => {
      const form = modal.querySelector("form")!;
      if (!form.reportValidity()) {
        return;
      }
      await onConfirm(new FormData(form));
      modal.close();
    };
    modal.showModal();
  }

  private async updateGreet() {
    const profile = await this.profileService.getProfile();
    this.greet.set(profile);
  }
}
