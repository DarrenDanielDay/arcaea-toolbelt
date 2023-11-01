import { bootstrap } from "../../styles";
import { sheet } from "./style.css.js";
import { Inject } from "../../../services/di";
import {
  $ChartService,
  $MusicPlayService,
  $ProfileService,
  BestStatistics,
  ChartService,
  MusicPlayService,
  ProfileService,
} from "../../../services/declarations";
import { FancyDialog, alert, confirm } from "../fancy-dialog";
import { AutoRender, Component, Future, HyplateElement, computed, effect, element, nil, signal } from "hyplate";
import { Profile } from "../../../models/profile";
import { loading } from "../loading";
import { delay } from "../../../utils/time";
import { clearImages } from "../../../assets/play-result";
import type { FC } from "hyplate/types";
import { Difficulty, formatRating, parseRating } from "../../../models/music-play";
import { PotentialBadge } from "../potential-badge";
import { RouteLink } from "../route-link";
~RouteLink;
export
@Component({
  tag: "profile-page",
  styles: [bootstrap, sheet],
})
class ProfilePage extends HyplateElement {
  @Inject($ProfileService)
  accessor profileService!: ProfileService;
  @Inject($ChartService)
  accessor chart!: ChartService;
  @Inject($MusicPlayService)
  accessor musicPlay!: MusicPlayService;

  createProfileDialog = element("dialog");
  editProfileDialog = element("dialog");
  switchProfileDialog = element("dialog");
  importProfileDialog = element("dialog");
  importSt3Dialog = element("dialog");
  editPtt = element("input");
  profileStats = new FancyDialog();

  greet = signal<Profile | null>(null);

  override render() {
    this.updateGreet();
    return (
      <Future promise={this.musicPlay.getStatistics()}>
        {({ maximumPotential }) => {
          return this._render(maximumPotential);
        }}
      </Future>
    );
  }
  _render(maximumPotential: number) {
    return (
      <>
        <AutoRender>
          {() => {
            const profile = this.greet();
            return (
              <>
                <div class="row m-3" id="greet">
                  <div class="col">
                    {profile
                      ? [
                          `当前存档：${profile.username}`,
                          <PotentialBadge potential={+profile.potential}></PotentialBadge>,
                        ]
                      : "未选择存档"}
                  </div>
                </div>
                {profile
                  ? [
                      <div class="row m-3">
                        {this.profileStats}
                        <button type="button" class="btn btn-primary" onClick={() => this.showProfileStats(profile)}>
                          存档统计
                        </button>
                        <button
                          type="button"
                          class="btn btn-outline-secondary update-profile"
                          onClick={() => this.updateProfile(profile)}
                        >
                          修改存档
                        </button>
                        <button
                          type="button"
                          class="btn btn-outline-secondary import-scores"
                          onClick={() => this.importSt3(profile)}
                        >
                          导入st3
                        </button>
                        <button
                          type="button"
                          class="btn btn-outline-secondary export-profile"
                          onClick={() => this.exportProfile(profile)}
                        >
                          导出存档为JSON
                        </button>
                        <button type="button" class="btn btn-danger" onClick={() => this.deleteProfile(profile)}>
                          删除存档
                        </button>
                      </div>,
                    ]
                  : nil}
              </>
            );
          }}
        </AutoRender>
        <div class="row m-3">
          <button type="button" class="btn btn-outline-secondary create-profile" onClick={this.createProfile}>
            创建存档
          </button>
          <button type="button" class="btn btn-outline-secondary switch-profile" onClick={this.switchProfile}>
            选择存档
          </button>
          <button type="button" class="btn btn-outline-secondary import-profile" onClick={this.importProfile}>
            导入JSON存档
          </button>
        </div>
        <div class="row m-3">
          <p>
            存档用于保存谱面成绩，进行
            <route-link path="/b30">b30</route-link>的计算和一些相关统计，以及保存角色数据进行爬梯相关计算。
          </p>
          <p>
            本站支持解析Arcaea本地存档<code>st3</code>文件并导入成绩到存档。关于如何获取<code>st3</code>文件，可参考
            <a href="docs/mumu-adb.html" target="_blank">
              使用MuMu模拟器和adb获取存档
            </a>
            ，或者
            <a href="https://space.bilibili.com/171403897" target="_blank">
              RTE
            </a>
            的视频
            <a href="https://www.bilibili.com/video/BV1kp4y1F7Jw/" target="_blank">
              BV1kp4y1F7Jw
            </a>
            。
          </p>
          <p>
            本站也支持<route-link path="/chart-ptt">手动录入成绩</route-link>。
            <strong>存档的数据全部保存在浏览器内</strong>，在清除浏览器缓存后，存档内的数据将会永远丢失。因此
            <strong>若通过手动录入谱面成绩，请自行定期导出JSON进行备份</strong>
            ，否则可能会出现需要重新录入的麻烦。
          </p>
          <p>
            本工具有一个配套的脚本，可以用于在{this.renderArcaeaOfficialLink()}
            获取一些信息，包括获取搭档数据、Web API查分（需订阅Arcaea Online）等。
          </p>
          <p>
            关于此脚本更详细的使用方法，请参考
            <a href="docs/plugin-usage.html" target="_blank">
              使用说明
            </a>
            ，下面是简单的使用说明：
          </p>
          <p>
            在电脑上，使用<code>Chrome/Edge</code>浏览器打开
            {this.renderArcaeaOfficialLink()}
            并登录，按F12打开开发者工具，找到控制台（Console），复制并执行以下脚本代码即可调用此脚本。
          </p>
          <div>
            <blockquote id="the-script">
              import("{new URL("services/cross-site-script.js", document.baseURI).href}");
            </blockquote>
          </div>
          <p>
            脚本执行后左下角会出现一个悬浮按钮，点击按钮弹出插件弹框，根据弹框内提示操作即可。关闭弹框后可通过
            <kbd>Ctrl + B</kbd>重新唤起弹框。
          </p>
          <p>若需要频繁使用此脚本，可以使用油猴插件实现在访问Arcaea官网时自动执行。</p>
          <p>若要在手机上执行此脚本，可以参考这篇文章：</p>
          <p>
            <a href="https://www.zhihu.com/question/411017015" target="_blank">
              https://www.zhihu.com/question/411017015
            </a>
          </p>
        </div>
        <dialog ref={this.createProfileDialog} id="create-profile">
          <form>
            <div class="h4">创建存档</div>
            <div class="mb-3">
              <label for="username" class="form-label">
                用户名（仅用于区分存档和b30生成）
              </label>
              <input class="form-control" id="username" name="username" required autofocus />
            </div>
            <div class="mb-3">
              <label for="potential" class="form-label">
                潜力值
              </label>
              <input
                class="form-control"
                id="potential"
                name="potential"
                type="number"
                step="0.01"
                min={0}
                max={this.profileService.formatPotential(maximumPotential)}
                required
              />
            </div>
            {this.renderFooter()}
          </form>
        </dialog>
        <dialog ref={this.editProfileDialog} id="edit-profile">
          <form>
            <div class="h4">修改存档</div>
            <div class="mb-3">
              <label for="ptt" class="form-label">
                潜力值
              </label>
              <input
                ref={this.editPtt}
                class="form-control"
                id="ptt"
                name="ptt"
                type="number"
                step="0.01"
                min={0}
                max={this.profileService.formatPotential(maximumPotential)}
                required
                autofocus
              />
            </div>
            {this.renderFooter()}
          </form>
        </dialog>
        <dialog ref={this.switchProfileDialog} id="switch-profile">
          <form>
            <div class="h4">选择存档</div>
            <div class="row">
              <div class="col">
                <select class="form-select" name="profile" required></select>
              </div>
            </div>
            {this.renderFooter()}
          </form>
        </dialog>
        <dialog ref={this.importProfileDialog} id="import-profile">
          <form>
            <div class="h4">导入存档</div>
            <div class="row">
              <div class="col">
                <input type="file" class="form-control" accept=".json" name="file" />
              </div>
            </div>
            {this.renderFooter()}
          </form>
        </dialog>
        <dialog ref={this.importSt3Dialog} id="import-scores">
          <form>
            <div class="h4">从Arcaea本地存档st3文件导入成绩</div>
            <div class="row">
              <div class="col">
                <input type="file" class="form-control" name="file" />
              </div>
            </div>
            <div class="row my-3">
              <div class="col-auto">
                <span class="form-text">
                  已知问题1：st3内只有谱面最高等级的通关类型信息，没有最佳成绩当次的通关类型信息。通关类型从高到低的顺序是：
                </span>
              </div>
            </div>
            <div class="row">
              <div class="col">
                <span class="form-text">
                  {this.renderInlineImg(clearImages.PM)}
                  {">"}
                  {this.renderInlineImg(clearImages.FR)}
                  {">"}
                  {this.renderInlineImg(clearImages.HC)}
                  {">"}
                  {this.renderInlineImg(clearImages.NC)}
                  {">"}
                  {this.renderInlineImg(clearImages.EC)}
                  {">"}
                  {this.renderInlineImg(clearImages.TL)}
                </span>
              </div>
            </div>
            <div class="row">
              <div class="col-auto">
                <span class="form-text">
                  例如有一个谱面最佳成绩是9990000分0-1，实际通关类型应当为NC（
                  {this.renderInlineImg(clearImages.NC)}
                  ），但先前曾经9980000分4-0全连过，st3存档内的数据将会是FR（
                  {this.renderInlineImg(clearImages.FR)}
                  ），从而可能导致b30里的通关显示存在一些小瑕疵。
                </span>
              </div>
            </div>
            <div class="row my-3">
              <div class="col-auto">
                <span class="form-text">
                  已知问题2：st3内的成绩时间并非精确时间戳，而是除以了1000的若干次方的整数部分，和实际时间可能会有最多一百万秒（约11.57天）的差距。
                </span>
              </div>
            </div>
            {this.renderFooter()}
          </form>
        </dialog>
      </>
    );
  }

  createProfile = () => {
    this.openFormModal(this.createProfileDialog, async (data) => {
      const username = data.get("username") as string;
      const ptt = +data.get("potential")!;
      if (!isNaN(ptt)) {
        await this.profileService.createOrUpdateProfile(username, ptt);
        await this.profileService.useProfile(username);
        await this.updateGreet();
      }
    });
  };

  async updateProfile(currentProfile: Profile) {
    this.editPtt.value = currentProfile.potential;
    this.openFormModal(this.editProfileDialog, async (data) => {
      const ptt = +data.get("ptt")!;
      if (!isNaN(ptt)) {
        await this.profileService.createOrUpdateProfile(currentProfile.username, ptt);
      }
      this.updateGreet();
    });
  }

  switchProfile = async () => {
    const profiles = await this.profileService.getProfileList();
    if (!profiles.length) {
      if (await confirm("当前没有存档，是否前往创建？")) {
        this.createProfile();
      }
      return;
    }
    const profile = await this.profileService.getProfile();
    const select = this.switchProfileDialog.querySelector('select[name="profile"]')!;
    select.innerHTML = profiles.map((p) => `<option>${p}</option>`).join("");
    select.value = profile?.username ?? "";
    this.openFormModal(this.switchProfileDialog, async (data) => {
      const profile = data.get("profile");
      if (profile && typeof profile === "string") {
        await this.profileService.useProfile(profile);
        this.updateGreet();
      }
    });
  };

  async exportProfile(profile: Profile) {
    await this.profileService.exportProfile(profile);
  }

  importProfile = () => {
    this.openFormModal(this.importProfileDialog, async (data) => {
      const file = data.get("file");
      if (file instanceof File) {
        await this.profileService.importProfile(file);
      }
    });
  };

  async importSt3(profile: Profile) {
    this.openFormModal(this.importSt3Dialog, async (data) => {
      const file = data.get("file");
      if (file instanceof File) {
        try {
          const message = signal("");
          const result = await loading(
            (async () => {
              const result = await this.profileService.importDB(file, profile, (msg) => message.set(msg));
              await delay(300);
              return result;
            })(),
            <div>{message}</div>
          );
          const { count, difficulties, skipped } = result;
          alert(
            <div>
              <p>
                成功导入：
                {Object.entries(difficulties).map(([key, value]) => (
                  <>
                    {value}个<span style:color={`var(--${key})`}>{key.toUpperCase()}</span>{" "}
                  </>
                ))}
              </p>
              {skipped.length ? <p>跳过：</p> : nil}
              {skipped.map((msg) => (
                <p>{msg}</p>
              ))}
              <p>共{count}个成绩</p>
            </div>
          );
        } catch (error) {
          alert(`${error}`);
        }
      }
    });
  }

  async showProfileStats(profile: Profile) {
    const { ratings } = await this.chart.getStatistics();
    const Desc: FC<{ label: string; content: string | number; style?: string }> = ({ label, content, style }) => {
      return (
        <div class="row" style={style ?? null}>
          <div class="col">{label}</div>
          <div class="col">{content}</div>
        </div>
      );
    };
    type TabDifficulty = Difficulty | null;
    const displayOrder: TabDifficulty[] = [
      Difficulty.Past,
      Difficulty.Present,
      Difficulty.Future,
      Difficulty.Beyond,
      null,
    ];
    const Stat: FC<{ stat: BestStatistics }> = ({ stat }) => {
      const descriptsions = [
        <Desc label="游玩总数" content={stat.total}></Desc>,
        <Desc label="Clear" content={stat.clear}></Desc>,
        <Desc label="Full Recall" content={stat.fr} style="color: #a470b5;"></Desc>,
        <Desc label="Pure Memory" content={stat.pm} style="color: #40c4c5;"></Desc>,
      ];
      if (stat.max) {
        descriptsions.push(<Desc label="理论值" content={stat.max} style="text-shadow: 1px 1px #0f7185dd;"></Desc>);
      }
      const percentage = (rate: number) => (isNaN(rate) ? "-" : `${(rate * 100).toFixed(4)}%`);
      descriptsions.push(
        <Desc label="EX以上P率" content={percentage(stat.acc)}></Desc>,
        <Desc label="大P准度" content={percentage(stat.pacc)}></Desc>
      );
      if (stat.rest <= 1e5 && stat.clear) {
        descriptsions.push(<Desc label="距游玩谱面全理论" content={stat.rest}></Desc>);
      }
      return <div>{descriptsions}</div>;
    };
    const Tab: FC<{ difficulty: TabDifficulty }> = ({ difficulty }) => {
      return (
        <span
          role="tab"
          style="cursor: pointer; margin-right: 0.25em"
          style:color={difficulty && `var(--${difficulty})`}
          style:border-bottom={computed(() =>
            difficulty === currentDifficulty() ? `0.125em solid ${difficulty ? `var(--${difficulty})` : "#000"}` : null
          )}
          onClick={() => currentDifficulty.set(difficulty)}
        >
          {difficulty ? difficulty.toUpperCase() : "全部"}
        </span>
      );
    };
    const currentDifficulty = signal<TabDifficulty>(Difficulty.Future);
    const currentRating = signal("");
    const currentStats = signal<BestStatistics | null>(null);
    const showPotential = signal(true);
    const cleanup = effect(() => {
      const difficulty = currentDifficulty() || undefined;
      const rating = currentRating();
      this.profileService
        .getProfileStatistics(profile, {
          difficulty,
          rating: rating ? parseRating(rating) : void 0,
        })
        .then((stas) => {
          currentStats.set(stas);
        });
    });
    const { potential, username } = profile;
    await this.profileStats.showAlert(
      <div slot="content">
        <h2>存档统计</h2>
        <div class="user">
          {username}
          <potential-badge
            title="点击切换潜力值显示"
            potential={computed(() => (showPotential() ? +potential : -1))}
            onClick={() => showPotential.update((show) => !show)}
          ></potential-badge>
        </div>
        <div class="mb-3">
          {displayOrder.map((difficulty) => (
            <Tab difficulty={difficulty}></Tab>
          ))}
        </div>
        <div class="input-group mb-3">
          <label for="rating" class="input-group-text">
            等级
          </label>
          <select h-model={currentRating} class="form-select" name="rating" id="rating">
            <option value="">全部</option>
            {ratings.map((rating) => {
              const ratingText = formatRating(rating);
              return <option value={ratingText}>{ratingText}</option>;
            })}
          </select>
        </div>
        <div style="height: 200px; width: 300px;">
          <AutoRender>
            {() => {
              const stat = currentStats();
              if (!stat) {
                return nil;
              }
              return <Stat stat={stat}></Stat>;
            }}
          </AutoRender>
        </div>
      </div>,
      true
    );
    cleanup();
  }

  async deleteProfile(profile: Profile) {
    if (!(await confirm("删除操作不可撤销，是否继续？"))) {
      return;
    }
    await this.profileService.deleteProfile(profile.username);
    await this.updateGreet();
  }

  private renderInlineImg(url: string) {
    return <img src={url} class="inline-img"></img>;
  }

  private renderArcaeaOfficialLink() {
    return (
      <a href="https://arcaea.lowiro.com/zh/" target="_blank">
        Arcaea官网
      </a>
    );
  }

  private renderFooter() {
    return (
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary cancel">
          取消
        </button>
        <button type="button" class="btn btn-primary confirm">
          确认
        </button>
      </div>
    );
  }

  private openFormModal(modal: HTMLDialogElement, onConfirm: (data: FormData) => Promise<void>) {
    const form = modal.querySelector("form")!;
    const confirmBtn = modal.querySelector("button.confirm")!;
    const cancelBtn = modal.querySelector("button.cancel")!;
    const handleSubmit = async () => {
      if (!form.reportValidity()) {
        return;
      }
      await onConfirm(new FormData(form));
      modal.close();
    };
    form.onsubmit = (e) => {
      e.preventDefault();
      handleSubmit();
    };
    cancelBtn.onclick = () => {
      modal.close();
    };
    confirmBtn.onclick = handleSubmit;
    modal.showModal();
  }

  private async updateGreet() {
    const migrate = await this.profileService.checkMigration();
    if (migrate) await migrate();
    const profile = await this.profileService.getProfile();
    this.greet.set(profile);
  }
}
