import icon from "../../../favicon.ico";
import meta from "../../../data/meta.json";
import { Component, Future, HyplateElement } from "hyplate";
import { bootstrap } from "../../styles";
import { Route } from "../router";
import { Inject } from "../../../services/di";
import {
  $ChartService,
  ChartService,
  $MusicPlayService,
  MusicPlayService,
  $ProfileService,
  ProfileService,
  ChartStatistics,
  MusicPlayStatistics,
} from "../../../services/declarations";
import { Best30 } from "../../components/b30";
import { FancyDialog } from "../../components/fancy-dialog";

export const AboutRoute: Route = {
  path: "/about",
  title: "关于",
  setup() {
    return new About();
  },
};

@Component({
  tag: "about-arcaea-toolbelt",
  styles: [bootstrap],
})
class About extends HyplateElement {
  @Inject($ChartService)
  accessor chart!: ChartService;
  @Inject($MusicPlayService)
  accessor musicPlay!: MusicPlayService;
  @Inject($ProfileService)
  accessor profile!: ProfileService;

  b30Dialog = new FancyDialog();

  override render() {
    return (
      <Future promise={this.init()}>
        {({ chartStats, musicPlayStats }) => this._render(chartStats, musicPlayStats)}
      </Future>
    );
  }

  _render(chartStats: ChartStatistics, musicPlayStats: MusicPlayStatistics) {
    const COMMIT_SHA = process.env.COMMIT_SHA;
    return (
      <div class="m-3">
        <h2>关于 Arcaea Toolbelt</h2>
        <div>
          <img src={icon}></img>
        </div>
        <p>
          commit SHA: <span title={COMMIT_SHA}>{COMMIT_SHA?.slice(0, 8)}</span>
        </p>
        <p>数据更新时间：{new Date(meta.time).toLocaleString()}</p>
        <p>
          Arcaea版本: {meta.version}{" "}
          <a target="_blank" href={meta.apk}>
            下载链接
          </a>
        </p>
        <h3>统计信息</h3>
        {/* 最大潜力值一定是0.1 / 40 = 0.0025的倍数，因此最多只有4位小数 */}
        <p>
          最大潜力值:
          {musicPlayStats.maximumPotential.toFixed(4)}
          <button
            class="btn btn-secondary mx-3"
            onClick={async () => {
              const b30 = await this.profile.b30(await this.profile.generateAlienProfile());
              const best30 = new Best30();
              best30.b30.set(b30);
              this.b30Dialog.showAlert(<div>{best30}</div>);
            }}
          >
            b30
          </button>
        </p>
        <h4>谱面统计</h4>
        <div>
          {Object.entries(chartStats.difficulties).map(([difficulty, { count, notes }]) => {
            return (
              <div>
                <strong style:color={`var(--${difficulty})`}>{difficulty.toUpperCase()}</strong>:{count}个谱面，总物量
                {notes}
              </div>
            );
          })}
        </div>
        {this.b30Dialog}
      </div>
    );
  }

  async init() {
    const chartStats = await this.chart.getStatistics();
    const musicPlayStats = await this.musicPlay.getStatistics();
    return {
      chartStats,
      musicPlayStats,
    };
  }
}
