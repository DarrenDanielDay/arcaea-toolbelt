import { Component, HyplateElement, cssVar } from "hyplate";
import { $ProfileService, ProfileService } from "../../../services/declarations";
import { Inject } from "../../../services/di";
import { Best30 } from "../../components/b30";
import { alert } from "../../components/global-message";
import { Route } from "../router";

@Component({
  tag: "player-b30",
})
class PlayerB39 extends HyplateElement {
  @Inject($ProfileService)
  accessor profileService!: ProfileService;

  override render() {
    if (!this.profileService.profile) {
      alert("未选择存档");
    }
    return <>{new Best30()}</>;
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
