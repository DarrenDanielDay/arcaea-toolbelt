import { Component, HyplateElement } from "hyplate";
import { $ProfileService, ProfileService } from "../../../services/declarations";
import { Inject } from "../../../services/di";
import { PlayResultForm } from "../../components/play-result-form";
import { bootstrap } from "../../styles";
import { Route } from "../router";

@Component({
  tag: "chart-potential",
  styles: [bootstrap],
})
class ChartPotentialPage extends HyplateElement {
  @Inject($ProfileService)
  accessor profileService!: ProfileService;
  form = new PlayResultForm();

  override render() {
    return (
      <>
        {this.form}
        <div class="m-3">
          <button type="button" class="btn btn-primary" name="add-result" onClick={this.addResult}>
            添加成绩
          </button>
        </div>
      </>
    );
  }

  addResult = () => {
    const res = this.form.getPlayResult();
    if (res) {
      this.profileService.addResult(res);
      this.form.chartSelect.searchInput.focus();
    }
  };
}

export const AddResultRoute: Route = {
  path: "/chart-ptt",
  title: "单曲ptt",
  setup() {
    return new ChartPotentialPage();
  },
};
