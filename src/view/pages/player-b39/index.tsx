import { Component, HyplateElement, cssVar, listen } from "hyplate";
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
        this.requestFullscreen({
          navigationUI: "hide",
        });
      });
      return () => {
        unsubscribe();
      };
    });
    return <>{this.best30}</>;
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
