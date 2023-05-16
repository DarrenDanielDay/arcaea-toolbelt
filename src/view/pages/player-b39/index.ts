import { $ProfileService, ProfileService } from "../../../services/declarations";
import { Inject } from "../../../services/di";
import { Component, OnConnected } from "../../../utils/component";
import { Best30 } from "../../components/b30";
import { alert } from "../../components/global-message";
import { Route } from "../router";

@Component({
  selector: "player-b30",
})
class PlayerB39 extends HTMLElement implements OnConnected {
  @Inject($ProfileService)
  accessor profileService!: ProfileService;

  connectedCallback(): void {
    if (!this.profileService.profile) {
      alert("未选择存档");
    }
    const b30Card = new Best30();
    this.shadowRoot!.appendChild(b30Card);
  }
}

export const PlayerB30Route: Route = {
  path: "/b30",
  title: "b30",
  setup() {
    const page = new PlayerB39();
    const width = window.innerWidth;
    if (width < 800) {
      document.body.style.setProperty("--inner-width", `${width}`);
    }
    return page;
  },
};
