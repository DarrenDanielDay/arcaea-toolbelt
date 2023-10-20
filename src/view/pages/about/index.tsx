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
  $AssetsService,
  AssetsService,
} from "../../../services/declarations";
import { Best30YukiChan } from "../../components/b30-yukichan";
import { FancyDialog, alert, confirm } from "../../components/fancy-dialog";
import { B30Response } from "../../../models/profile";
import { JSXChildNode } from "hyplate/types";
import { HelpTip } from "../../components/help-tip";
import { formatSize } from "../../../utils/format";
~HelpTip;
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
  @Inject($AssetsService)
  accessor assets!: AssetsService;
  @Inject($ChartService)
  accessor chart!: ChartService;
  @Inject($MusicPlayService)
  accessor musicPlay!: MusicPlayService;
  @Inject($ProfileService)
  accessor profile!: ProfileService;

  b30Dialog = new FancyDialog();
  b30Panel = new Best30YukiChan();

  override render() {
    return <Future promise={this.init()}>{(args) => this._render(...args)}</Future>;
  }

  _render(
    chartStats: ChartStatistics,
    musicPlayStats: MusicPlayStatistics,
    maxB30: B30Response,
    baseB30: B30Response,
    freeB30: B30Response
  ) {
    const COMMIT_SHA = process.env.COMMIT_SHA;
    const maxPotentialStats: Parameters<About["renderMaxPtt"]>[] = [
      ["理论最大潜力值", musicPlayStats.maximumPotential, maxB30],
      ["仅基础包（Arcaea）最大潜力值", baseB30.maxPotential, baseB30],
      [
        <>
          无氪<help-tip>仅考虑{this.chart.freePacks.join("、")}曲包</help-tip>最大潜力值
        </>,
        freeB30.maxPotential,
        freeB30,
      ],
    ];
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
          </a>{" "}
          <a target="_blank" href="https://webapi.lowiro.com/webapi/serve/static/bin/arcaea/apk">
            获取最新版本
          </a>
        </p>
        <h3>统计信息</h3>
        <h4>潜力值统计</h4>
        {maxPotentialStats.map((args) => this.renderMaxPtt(...args))}
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
        <h3>杂项</h3>
        <div class="my-3">
          <button
            class="btn btn-outline-danger"
            onClick={async () => {
              const byteSize = await this.assets.cacheUsage();
              if (await confirm(<div>当前图片缓存占用空间为{formatSize(byteSize)}，是否确认全部清除？</div>)) {
                await this.assets.clearCache();
                alert("图片缓存清除完毕。");
              }
            }}
          >
            清除图片缓存
          </button>
          <help-tip class="mx-2">
            <p>为了减少重复的图片下载带来的体验不佳问题，一些图片（主要是曲绘）会在下载后缓存在浏览器内。</p>
            <p>如果这些图片占用了过多的存储空间，您可以在此清空他们。本工具再次需要这些图片时，将会重新下载他们。</p>
          </help-tip>
        </div>
        <h3>问题反馈</h3>
        <div>
          <p>
            如果您在使用本工具时遇到问题，欢迎提交
            <a href="https://github.com/DarrenDanielDay/arcaea-toolbelt/issues" target="_blank">
              issues
            </a>
            进行反馈。
          </p>
        </div>
        {this.b30Dialog}
      </div>
    );
  }

  async init() {
    const chartStats = await this.chart.getStatistics();
    const musicPlayStats = await this.musicPlay.getStatistics();
    const profile = await this.profile.generateMaxProfile();
    const maxB30 = await this.profile.b30(profile);
    const baseB30 = await this.profile.b30(profile, { packs: this.chart.freePacks.slice(0, 1) });
    const freeB30 = await this.profile.b30(profile, { packs: this.chart.freePacks });
    return [chartStats, musicPlayStats, maxB30, baseB30, freeB30] as const;
  }

  renderMaxPtt(info: JSXChildNode, potential: number, b30: B30Response) {
    return (
      <div>
        <div>
          {/* 最大潜力值一定是0.1 / 40 = 0.0025的倍数，因此最多只有4位小数 */}
          {info}：{potential.toFixed(4)}
        </div>
        <div style="display: flex; align-items: center;">
          <potential-badge potential={potential}></potential-badge>
          <button class="btn btn-secondary mx-3" onClick={() => this.showB30(b30)}>
            b30
          </button>
        </div>
      </div>
    );
  }

  showB30(b30: B30Response) {
    this.b30Panel.b30.set(b30);
    this.b30Dialog.showAlert(<div var:inner-width="800px">{this.b30Panel}</div>);
  }
}
