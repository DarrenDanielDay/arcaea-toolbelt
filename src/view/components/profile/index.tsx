import { bootstrap } from "../../styles";
import { sheet } from "./style.css.js";
import { Inject } from "../../../services/di";
import { $ProfileService, ProfileService } from "../../../services/declarations";
import { alert } from "../global-message";
import { Component, For, HyplateElement, computed, element, signal } from "hyplate";
import { Profile } from "../../../models/profile";
export
@Component({
  tag: "profile-page",
  styles: [bootstrap, sheet],
})
class ProfilePage extends HyplateElement {
  @Inject($ProfileService)
  accessor profileService!: ProfileService;

  createProfileDialog = element("dialog");
  editProfileDialog = element("dialog");
  switchProfileDialog = element("dialog");
  importProfileDialog = element("dialog");
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
            切换存档
          </button>
          <button type="button" class="btn btn-outline-secondary update-profile" onClick={this.updateProfile}>
            修改存档
          </button>
          <button type="button" class="btn btn-outline-secondary export-profile" onClick={this.exportProfile}>
            导出当前存档
          </button>
          <button type="button" class="btn btn-outline-secondary import-profile" onClick={this.importProfile}>
            导入存档
          </button>
        </div>
        <div class="row m-3">
          <p>b30相关的功能主要是手动录入成绩进行计算并生成看板，类似excel算分表格的在线版。</p>
          <p>
            为了减少手动录入成绩的麻烦，下面也提供一个自助查分脚本工具，可用于在Arcaea官网爬取这些成绩数据，并生成存档同步至本站。
            所有的查分操作都会在浏览器内进行，数据也存在浏览器内。查分原理和
            <code>Arcaea Unlimited API</code>
            一样是查好友榜，并且可以同时查多个玩家。
            <strong>
              目前，616对好友榜查询的Web API添加了限制，此功能需要订阅<code>Arcaea Online</code>
              才能使用，使用此功能的封号风险请自行承担
            </strong>
            。
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
            <a href="https://arcaea.lowiro.com/zh/" target="_blank">
              Arcaea官网
            </a>
            并登录，按F12打开开发者工具，找到控制台（Console），复制并执行以下脚本代码即可调用此脚本。
          </p>
          <div>
            <blockquote id="the-script">
              import("{new URL("services/cross-site-script.js", document.baseURI).href}");
            </blockquote>
          </div>
          <p>
            脚本执行后会弹出一个弹框，根据弹框内提示操作即可。关闭弹框后可通过<kbd>Ctrl + B</kbd>重新唤起弹框。
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
              <input class="form-control" id="potential" name="potential" required />
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary cancel">
                取消
              </button>
              <button type="button" class="btn btn-primary confirm">
                确认
              </button>
            </div>
          </form>
        </dialog>
        <dialog ref={this.editProfileDialog} id="edit-profile">
          <form>
            <div class="h4">修改存档</div>
            <div class="mb-3">
              <label for="ptt" class="form-label">
                潜力值
              </label>
              <input class="form-control" id="ptt" name="ptt" required autofocus />
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary cancel">
                取消
              </button>
              <button type="button" class="btn btn-primary confirm">
                确认
              </button>
            </div>
          </form>
        </dialog>
        <dialog ref={this.switchProfileDialog} id="switch-profile">
          <form>
            <div class="h4">切换存档</div>
            <div class="row">
              <div class="col">
                <select class="form-select" name="profile" required></select>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary cancel">
                取消
              </button>
              <button type="button" class="btn btn-primary confirm">
                确认
              </button>
            </div>
          </form>
        </dialog>
        <dialog ref={this.importProfileDialog} id="import-profile">
          <form>
            <div class="h4" style:user-select="none" onDblclick={this.importDB}>
              导入存档
            </div>
            <div class="row">
              <div class="col">
                <input type="file" class="form-control" accept=".json" name="file" />
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary cancel">
                取消
              </button>
              <button type="button" class="btn btn-primary confirm">
                确认
              </button>
            </div>
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
        this.profileService.createOrUpdateProfile(username, ptt);
      }
    });
  };

  updateProfile = async () => {
    const currentProfile = this.profileService.profile;
    if (!currentProfile) {
      alert("未选择存档");
      return;
    }
    this.openFormModal(this.editProfileDialog, async (data) => {
      const ptt = +data.get("ptt")!;
      if (!isNaN(ptt)) {
        await this.profileService.createOrUpdateProfile(currentProfile.username, ptt);
      }
      this.updateGreet();
    });
  };

  switchProfile = async () => {
    const select = this.switchProfileDialog.querySelector('select[name="profile"]')!;
    const profiles = await this.profileService.getProfileList();
    select.innerHTML = profiles.map((p) => `<option>${p}</option>`).join("");
    select.value = this.profileService.profile?.username ?? "";
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

  importDB = async () => {
    const profile = this.profileService.profile;
    if (!profile) {
      return alert(`需要选择存档才能导入成绩`);
    }
    // @ts-expect-error non-standard method
    const [filehandle] = (await showOpenFilePicker({
      types: [
        {
          description: "Arcaea Profile Database",
        },
      ],
      multiple: false,
    })) as [FileSystemHandle];
    this.importProfileDialog.close();
    // @ts-expect-error do not have type declaration
    const file: File = await filehandle.getFile();
    try {
      await this.profileService.importDB(file, profile);
      alert("导入成绩成功");
    } catch (error) {
      alert(`${error}`);
    }
  };

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

  private updateGreet() {
    const profile = this.profileService.profile;
    this.greet.set(profile);
  }
}
