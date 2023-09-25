import { AutoRender, Component, HyplateElement, Show, signal } from "hyplate";
import { $MusicPlayService, $ProfileService, MusicPlayService, ProfileService } from "../../../services/declarations";
import { Inject } from "../../../services/di";
import { PlayResultForm } from "../../components/play-result-form";
import { bootstrap } from "../../styles";
import { Route } from "../router";
import { ResultCard } from "../../components/result-card";
import { PlayResult } from "../../../models/music-play";
import { confirm } from "../../components/fancy-dialog";

@Component({
  tag: "chart-potential",
  styles: [bootstrap],
})
class ChartPotentialPage extends HyplateElement {
  @Inject($ProfileService)
  accessor profileService!: ProfileService;
  @Inject($MusicPlayService)
  accessor musicPlay!: MusicPlayService;

  form = new PlayResultForm();
  existingResultCard = new ResultCard();
  currentResult = signal<PlayResult | null>(null);
  override render() {
    this.autorun(() => {
      const selected = this.form.chartSelect.selectedItem();
      if (!selected) {
        this.currentResult.set(null);
        return;
      }
      const { chart } = selected;
      this.profileService.getProfile().then((profile) => {
        const best = profile?.best?.[chart.id];
        this.currentResult.set(best ?? null);
        this.existingResultCard.setPlayResult(best ?? null);
      });
    });
    return (
      <>
        {this.form}
        <div class="m-3">
          <button type="button" class="btn btn-primary" name="add-result" onClick={this.addResult}>
            添加成绩
          </button>
        </div>
        <Show when={this.currentResult}>
          {(result) => {
            return (
              <div class="m-3">
                <div class="my-2">
                  <p>已有成绩：</p>
                  {this.existingResultCard}
                </div>
                <div class="my-2">
                  <button
                    type="button"
                    class="btn btn-danger"
                    name="add-result"
                    onClick={() => this.removeResult(result)}
                  >
                    删除成绩
                  </button>
                </div>
              </div>
            );
          }}
        </Show>
      </>
    );
  }

  addResult = async () => {
    const res = this.form.getPlayResult();
    if (res) {
      await this.profileService.addResult(res);
      this.currentResult.set(res);
      this.existingResultCard.setPlayResult(res);
      this.form.chartSelect.searchInput.focus();
    }
  };

  removeResult = async (result: PlayResult) => {
    if (!(await confirm("确认删除此谱面成绩？"))) {
      return;
    }
    await this.profileService.removeResult(result.chartId);
    this.currentResult.set(null);
    this.form.chartSelect.searchInput.focus();
  };
}

export const AddResultRoute: Route = {
  path: "/chart-ptt",
  title: "单曲ptt",
  setup() {
    return new ChartPotentialPage();
  },
};
