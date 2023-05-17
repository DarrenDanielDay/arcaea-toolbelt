import { $ProfileService, ProfileService } from "../../../services/declarations";
import { Inject } from "../../../services/di";
import { Component, OnConnected } from "../../../utils/component";
import { PlayResultForm } from "../../components/play-result-form";
import { bootstrap } from "../../styles";
import { Route } from "../router";

@Component({
  selector: "chart-potential",
  css: [bootstrap],
  html: `\
<play-result-form></play-result-form>
<div class="m-3">
  <button type="button" class="btn btn-primary" name="add-result">添加成绩</button>
</div>
  `,
})
class ChartPotentialPage extends HTMLElement implements OnConnected {
  @Inject($ProfileService)
  accessor profileService!: ProfileService;

  connectedCallback(): void {
    const shadow = this.shadowRoot!;
    const form = shadow.querySelector<PlayResultForm>("play-result-form")!;
    const add = shadow.querySelector(`button[name="add-result"]`)!;
    add.onclick = () => {
      const res = form.getPlayResult();
      if (res) {
        this.profileService.addResult(res);
        form.chartSelect.searchInput.focus();
      }
    };
  }
}

export const AddResultRoute: Route = {
  path: "/chart-ptt",
  title: "单曲ptt",
  setup() {
    return new ChartPotentialPage();
  },
};
