import { $ProfileService, ProfileService } from "../../../services/declarations";
import { Inject } from "../../../services/di";
import { Component, OnConnected, element } from "../../../utils/component";
import { PlayResultForm } from "../../components/play-result-form";
import { Route } from "../router";

@Component({
  selector: "chart-potential",
  html: `\
<play-result-form></play-result-form>
<div class="row">
  <div class="col m-3">
    <button type="button" class="btn btn-primary">添加成绩</button>
  </div>
</div>
  `,
})
class ChartPotentialPage extends HTMLElement implements OnConnected {
  @Inject($ProfileService)
  accessor profileService!: ProfileService;

  connectedCallback(): void {
    const shadow = this.shadowRoot!;
    const form = shadow.querySelector<PlayResultForm>("play-result-form")!;
    const row = shadow.querySelector("div.row")!;
    const add = row.querySelector("button")!;
    add.onclick = () => {
      const res = form.getPlayResult();
      if (res) {
        this.profileService.addResult(res);
        form.chartSelect.searchInput.focus();
      }
    };
    this.appendChild(row);
  }
}

export const AddResultRoute: Route = {
  path: "/chart-ptt",
  title: "单曲ptt",
  setup() {
    return new ChartPotentialPage();
  },
};
