import { Component, OnConnected } from "../../../utils/component";
import html from "bundle-text:./template.html";
import { sheet as bootstrap } from "../../styles/bootstrap.part.css.js";
import { sheet } from "./style.css.js";
import { Inject } from "../../../services/di";
import { $ProfileService, ProfileService } from "../../../services/declarations";

export
@Component({
  selector: "profile-page",
  html,
  css: [bootstrap, sheet],
})
class ProfilePage extends HTMLElement implements OnConnected {
  @Inject($ProfileService)
  accessor profileService!: ProfileService;

  createProfileDialog!: HTMLDialogElement;
  editProfileDialog!: HTMLDialogElement;
  switchProfileDialog!: HTMLDialogElement;
  importProfileDialog!: HTMLDialogElement;
  greet!: HTMLDivElement;
  connectedCallback(): void {
    const shadow = this.shadowRoot!;
    this.greet = shadow.querySelector("div#greet")!;
    this.createProfileDialog = shadow.querySelector("dialog#create-profile")!;
    this.editProfileDialog = shadow.querySelector("dialog#edit-profile")!;
    this.switchProfileDialog = shadow.querySelector("dialog#switch-profile")!;
    this.importProfileDialog = shadow.querySelector("dialog#import-profile")!;

    shadow.querySelector("button.create-profile")!.onclick = () => {
      this.openFormModal(this.createProfileDialog, async (data) => {
        const username = data.get("username") as string;
        const ptt = +data.get("potential")!;
        if (!isNaN(ptt)) {
          this.profileService.createOrUpdateProfile(username, ptt);
        }
      });
    };
    shadow.querySelector("button.update-profile")!.onclick = async () => {
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
      });
    };
    shadow.querySelector("button.switch-profile")!.onclick = async () => {
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

    shadow.querySelector("button.export-profile")!.onclick = async () => {
      await this.profileService.exportProfile();
    };

    shadow.querySelector("button.import-profile")!.onclick = () => {
      this.openFormModal(this.importProfileDialog, async (data) => {
        const file = data.get("file");
        if (file instanceof File) {
          await this.profileService.importProfile(file);
        }
      });
    };
    shadow.querySelector("blockquote#friends-and-me")!.textContent = this.getScript("both");
    shadow.querySelector("blockquote#friends-only")!.textContent = this.getScript("friendonly");
    shadow.querySelector("blockquote#self-only")!.textContent = this.getScript("selfonly");

    this.updateGreet();
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

  private updateGreet() {
    const profile = this.profileService.profile;
    if (profile) {
      this.greet.textContent = `当前存档：${profile.username}（${profile.potential}）`;
    } else {
      this.greet.textContent = "未选择存档";
    }
  }

  private getScript(type: string, only?: string) {
    const url = new URL("./services/cross-site-script.js", location.href);
    const searchParams = url.searchParams;
    if (only) {
      searchParams.set("only", only);
    } else {
      searchParams.set("type", type);
    }
    return `import("${url}")`;
  }

  protected updatePlayerQuery(name: string) {
    const onlyCode = this.shadowRoot!.querySelector("blockquote#only")!;
    if (name) {
      onlyCode.textContent = this.getScript("", name);
    } else {
      onlyCode.textContent = "（请先输入）";
    }
  }
}
