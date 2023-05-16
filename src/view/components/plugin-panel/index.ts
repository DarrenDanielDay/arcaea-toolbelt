import html from "bundle-text:./template.html";
import { sheet } from "./style.css.js";
import { Component, OnConnected, clone, element, fragment, query, textContent } from "../../../utils/component";
import { bootstrap } from "../../styles";
import { Inject } from "../../../services/di";
import { $CrossSiteScriptPluginService, CrossSiteScriptPluginService } from "../../../services/declarations";
import * as lowiro from "../../../services/web-api";
import { Profile } from "../../../models/profile";
import { alert } from "../global-message";
const templates = query({
  panel: "template#panel",
} as const)(fragment(html));

const getPanelRefs = query({
  username: "span.username",
  ptt: "span.potential",
  targets: `select[name="query-targets"]`,
  refresh: `button[name="refresh"]`,
  go: `button[name="query-control"]`,
  sync: `button[name="sync-control"]`,
  close: `button[name="close"]`,
  logging: `div.logging`,
} as const);

export
@Component({
  selector: "arcaea-toolbelt-plugin-panel",
  html: templates.panel,
  css: [bootstrap, sheet],
})
class ToolPanel extends HTMLElement implements OnConnected {
  @Inject($CrossSiteScriptPluginService)
  accessor service!: CrossSiteScriptPluginService;
  initialized = false;
  connectedCallback(): void {
    if (!this.initialized) {
      this.setup();
      this.initialized = true;
    }
  }
  setup(): void {
    const shadow = this.shadowRoot!;
    const panel = getPanelRefs(shadow);
    const { targets: select, go, sync, logging, refresh, close } = panel;
    let profiles: Profile[] = [];
    let querying = false;
    let profile: lowiro.UserProfile | null = null;
    let controller = new AbortController();
    const initProfile = async () => {
      profile = await this.service.getProfile();
      textContent(panel, {
        username: profile.name,
        ptt: (profile.rating / 100).toFixed(2),
      });
      select.innerHTML = "";
      for (const friend of [profile, ...profile.friends]) {
        const option = element("option");
        option.textContent = friend.name;
        option.value = friend.name;
        select.appendChild(option);
      }
    };

    const setQuerying = (value: boolean) => {
      querying = value;
      go.textContent = querying ? "停止" : "开查";
      const classList = go.classList;
      classList.toggle("btn-danger", querying);
      classList.toggle("btn-primary", !querying);
    };
    const setProfiles = (value: Profile[]) => {
      profiles = value;
      sync.disabled = !value.length;
    };

    refresh.onclick = () => {
      initProfile();
    };
    go.onclick = async () => {
      if (!profile) {
        await initProfile();
        if (!profile) {
          throw new Error(`获取用户信息失败`);
        }
      }
      setQuerying(!querying);
      if (querying) {
        const targets = Array.from(select.querySelectorAll("option"))
          .filter((o) => o.selected)
          .map((o) => o.value);
        controller = this.service.startQueryBests(
          profile,
          targets,
          (msg) => {
            logging.textContent = msg;
          },
          (profiles) => {
            setQuerying(false);
            setProfiles(profiles);
            logging.textContent = "查询完毕";
          }
        );
      } else {
        controller.abort();
      }
    };
    close.onclick = () => {
      this.dispatchEvent(new CustomEvent("panel-close", { bubbles: true, cancelable: false }));
    };
    sync.onclick = async () => {
      await this.service.syncProfiles(profiles);
      logging.textContent = "";
      alert(`存档${profiles.map((p) => p.username).join("，")}同步成功`);
    };
    setQuerying(false);
    setProfiles([]);
    initProfile();
  }
}
