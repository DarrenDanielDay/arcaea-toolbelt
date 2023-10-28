import { sheet } from "./style.css.js";
import { sheet as app } from "../../app.css.js";
import { bootstrap } from "../../styles";
import { Inject } from "../../../services/di";
import {
  $AssetsResolver,
  $ChartService,
  $CrossSiteScriptPluginService,
  $MusicPlayService,
  $WorldModeService,
  AssetsResolver,
  ChartService,
  CrossSiteScriptPluginService,
  MusicPlayService,
  WorldModeService,
} from "../../../services/declarations";
import * as lowiro from "../../../services/web-api";
import type { Profile } from "../../../models/profile";
import { FancyDialog } from "../fancy-dialog";
import type { FC } from "hyplate/types";
import { computed, signal, Show, HyplateElement, Component, element } from "hyplate";
import { ResultCard } from "../result-card";
import { NoteResult } from "../../../models/music-play";
import { PotentialBadge } from "../potential-badge";
import { formatError } from "../../../utils/format";
import { CharacterImageKind, CharacterStatus } from "../../../models/character";

export
@Component({
  tag: "arcaea-toolbelt-plugin-panel",
  styles: [bootstrap, sheet, app],
})
class ToolPanel extends HyplateElement {
  @Inject($AssetsResolver)
  accessor resolver!: AssetsResolver;
  @Inject($CrossSiteScriptPluginService)
  accessor service!: CrossSiteScriptPluginService;
  @Inject($WorldModeService)
  accessor world!: WorldModeService;
  @Inject($ChartService)
  accessor chart!: ChartService;
  @Inject($MusicPlayService)
  accessor music!: MusicPlayService;

  characterList = new FancyDialog();
  recentList = new FancyDialog();
  message = new FancyDialog();

  override render(): JSX.Element {
    const profile$ = signal<lowiro.UserProfile | null>(null);
    const querying$ = signal(false);
    const logging$ = signal("");
    const profiles$ = signal<Profile[]>([]);
    const selectRef = element("select");
    let controller = new AbortController();
    const initProfile = async () => {
      profile$.set(await this.service.getProfile());
    };
    const openCharacterStatus = (profile: lowiro.UserProfile) => {
      this.characterList.showAlert(
        <div slot="content">
          <CharacterList resolver={this.resolver} stats={profile.character_stats}></CharacterList>
        </div>,
        true
      );
    };
    const withErrorHandle = (handler: () => Promise<void>) => async () => {
      try {
        await handler();
      } catch (error) {
        this.message.showAlert(formatError(error));
      }
    };
    const refresh = () => {
      initProfile();
    };
    const syncMe = async (profile: lowiro.UserProfile) => {
      await this.service.syncMe(profile);
      this.message.showAlert("同步成功");
    };
    const go = async (profile: lowiro.UserProfile) => {
      const querying = !querying$();
      querying$.set(querying);
      if (querying) {
        const targets = Array.from(selectRef.querySelectorAll("option"))
          .filter((o) => o.selected)
          .map((o) => o.value);
        controller = this.service.startQueryBests(
          profile,
          targets,
          (msg) => {
            logging$.set(msg);
          },
          (profiles) => {
            querying$.set(false);
            profiles$.set(profiles);
            logging$.set("查询完毕");
          },
          (err) => {
            logging$.set(err);
            querying$.set(false);
          }
        );
      } else {
        controller.abort();
      }
    };
    const close = () => {
      this.dispatchEvent(new CustomEvent("panel-close", { bubbles: true, cancelable: false }));
    };
    const syncBests = async () => {
      const profiles = profiles$();
      await this.service.syncProfiles(profiles);
      logging$.set("");
      this.message.showAlert(`存档${profiles.map((p) => p.username).join("，")}同步成功`);
    };
    queueMicrotask(initProfile);
    return (
      <div class="modal-root m-3">
        <header>
          <h1>Arcaea Toolbelt Plugin</h1>
        </header>
        <main class="content">
          <Show when={profile$}>
            {(profile) => {
              const { display_name, rating, join_date, beyond_boost_gauge, recent_score } = profile;
              const chart = recent_score[0];
              const { score = 0, difficulty = -1, song_id = "-" } = chart ?? {};
              const key = "arcaea_toolbelt_last_beyond_boost_gauge";
              const stored = sessionStorage.getItem(key);
              const lastGauge = stored ? +stored : NaN;
              const difference = beyond_boost_gauge - lastGauge;
              if (isNaN(lastGauge) || difference) {
                sessionStorage.setItem(key, `${beyond_boost_gauge}`);
              }
              const players = [profile, ...profile.friends];
              const isProfile = (p: unknown): p is lowiro.UserProfile => p === profile;

              return (
                <main>
                  <header>
                    <h2>账号信息</h2>
                  </header>
                  <div class="my-1">玩家名：{display_name}</div>
                  <div class="my-1">潜力值：{rating > 0 ? (rating / 100).toFixed(2) : "-"}</div>
                  <div class="my-1">注册时间：{new Date(join_date).toLocaleString()}</div>
                  <div>
                    <div class="my-1 actions">
                      <button
                        type="button"
                        class="btn btn-primary"
                        name="character-status"
                        onClick={() => openCharacterStatus(profile)}
                      >
                        查看搭档数据
                      </button>
                      <button type="button" class="btn btn-outline-secondary" name="refresh" onClick={refresh}>
                        重新获取
                      </button>
                      <button
                        type="button"
                        class="btn btn-primary"
                        name="sync-characters"
                        onClick={withErrorHandle(() => syncMe(profile))}
                      >
                        同步
                      </button>
                    </div>
                  </div>
                  <header>
                    <h2>好友最近游玩</h2>
                  </header>
                  <div class="my-1">
                    <button
                      type="button"
                      class="btn btn-primary"
                      onClick={async () => {
                        const songs = await this.chart.getSongIndex();
                        this.recentList.showAlert(
                          <div slot="content">
                            <div class="panel">
                              {players.flatMap((player) =>
                                player.recent_score.map((recent) => {
                                  const isProfileRecent = (
                                    p: unknown
                                  ): p is lowiro.UserProfile["recent_score"][number] => isProfile(player);
                                  const { difficulty, song_id, time_played, score } = recent;
                                  const { character, rating } = player;
                                  const status = isProfile(player)
                                    ? player.character_stats.find((s) => s.character_id === character)!
                                    : {
                                        is_uncapped: player.is_char_uncapped,
                                        is_uncapped_override: player.is_char_uncapped_override,
                                      };

                                  return (
                                    <>
                                      <div class="user">
                                        <Avatar resolver={this.resolver} id={character} status={status}></Avatar>
                                        <PotentialBadge potential={rating / 100}></PotentialBadge>
                                        <div class="username">{player.name}</div>
                                        <div class="play-time">{new Date(time_played).toLocaleString()}</div>
                                      </div>
                                      {(() => {
                                        const song = songs[song_id];
                                        if (song) {
                                          const chart = song.charts.find(
                                            (c) => this.music.mapDifficulty(c.difficulty) === difficulty
                                          );
                                          if (chart) {
                                            const card = new ResultCard();
                                            card.setChart(song, chart);
                                            if (isProfileRecent(recent)) {
                                              const noteResult: NoteResult = {
                                                perfect: recent.shiny_perfect_count,
                                                pure: recent.perfect_count,
                                                far: recent.near_count,
                                                lost: recent.miss_count,
                                              };
                                              card.setResult(
                                                noteResult,
                                                this.music.computeScoreResult(score, chart),
                                                this.music.mapClearType(
                                                  recent.clear_type,
                                                  recent.shiny_perfect_count,
                                                  chart
                                                )
                                              );
                                            } else {
                                              const noteResult = this.music.inferNoteResult(
                                                chart,
                                                null,
                                                null,
                                                null,
                                                score
                                              );
                                              card.setResult(
                                                noteResult,
                                                this.music.computeScoreResult(score, chart),
                                                noteResult ? this.music.computeClearRank(noteResult, chart, null) : null
                                              );
                                            }
                                            return card;
                                          }
                                        }
                                        return (
                                          <div>
                                            <p>未知曲目或谱面难度</p>
                                            <p>
                                              曲目ID = {song_id}，难度 = {difficulty}
                                            </p>
                                            <p>分数{score}</p>
                                          </div>
                                        );
                                      })()}
                                    </>
                                  );
                                })
                              )}
                            </div>
                          </div>,
                          true
                        );
                      }}
                    >
                      查看
                    </button>
                  </div>
                  <header>
                    <h2>查分（需订阅）</h2>
                  </header>
                  <div>
                    <p style:color="var(--bs-danger)">
                      注意！此查分功能的原理和查分bot一样，是遍历查询好友榜，需要大量调用Web
                      API，可能导致被shadowban甚至封号，请谨慎使用（如想尝试建议用小号）！
                    </p>
                  </div>
                  <div>
                    <form>
                      <div class="row">
                        <label for="query-targets" class="form-label">
                          选择要查的玩家（可多选，电脑是按住ctrl选）：
                        </label>
                      </div>
                      <div class="row">
                        <div class="col">
                          <select id="query-targets" name="query-targets" multiple class="form-select" ref={selectRef}>
                            {players.map((friend) => (
                              <option value={friend.name}>{friend.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div class="my-3 logging">{logging$}</div>
                      <div class="my-3 actions">
                        <button
                          type="button"
                          class="btn btn-primary sync-control"
                          name="sync-control"
                          disabled={computed(() => !profiles$().length)}
                          onClick={withErrorHandle(syncBests)}
                        >
                          同步
                        </button>
                        <button
                          type="button"
                          class={computed(() => `btn query-control ${querying$() ? "btn-danger" : "btn-primary"}`)}
                          name="query-control"
                          onClick={() => go(profile)}
                        >
                          {computed(() => (querying$() ? "停止" : "开查"))}
                        </button>
                      </div>
                    </form>
                  </div>
                  <header>
                    <h2>定数测算</h2>
                  </header>
                  <div>
                    <details>
                      <summary>原理和用法</summary>
                      <div>参考中文Wiki上的公式，beyond能量槽的填充进度为</div>
                      <math display="block">
                        <mn>27</mn>
                        <mo>+</mo>
                        <mn>2.45</mn>
                        <msqrt>
                          <ms>单曲潜力值</ms>
                        </msqrt>
                      </math>
                      <div>根据接口返回的beyond能量变化值可逆算单曲潜力值，结合最近游玩的分数可逆算出定数。</div>
                      <div>
                        使用方法：先打开此面板获取一次当前beyond能量值，然后去游戏内爬梯打待测谱面。打完结算后再点击
                        <code>账号信息</code>的<code>重新获取</code>按钮即可自动测算。
                      </div>
                      <div>如果打完谱面后能量溢出（超过200%），测定结果可能会不准确。</div>
                    </details>
                    <div class="row">
                      <div class="col-auto">上一次beyond能量：{isNaN(lastGauge) ? "-" : lastGauge}</div>
                    </div>
                    <div class="row">
                      <div class="col-auto">当前beyond能量：{beyond_boost_gauge}</div>
                    </div>
                    <div class="row">
                      <div class="col-auto">差值：{difference || "-"}</div>
                    </div>
                    <div class="row">
                      <div class="col-auto">最近游玩曲目Id：{song_id}</div>
                    </div>
                    <div class="row">
                      <div class="col-auto">难度：{["pst", "prs", "ftr", "byd"][difficulty] ?? "-"}</div>
                    </div>
                    <div class="row">
                      <div class="col-auto">分数：{score || "-"}</div>
                    </div>
                    <div class="row">
                      <div class="col-auto">
                        推测定数：{difference ? this.world.inverseBeyondBoost(difference, score) : "-"}
                      </div>
                    </div>
                  </div>
                </main>
              );
            }}
          </Show>
        </main>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" name="close" onClick={close}>
            关闭
          </button>
        </div>
        <fancy-dialog ref={this.characterList} id="character-list"></fancy-dialog>
        <fancy-dialog ref={this.recentList} id="recent-list"></fancy-dialog>
        <fancy-dialog ref={this.message} id="plugin-message"></fancy-dialog>
      </div>
    );
  }
}

const CharacterList: FC<{
  resolver: AssetsResolver;
  stats: lowiro.UserProfile["character_stats"];
}> = ({ resolver, stats }) => {
  const renderNumber = (value: number) => {
    const rawValue = value.toString();
    const fixedValue = value.toFixed(4);
    return (
      <span title={rawValue} data-value={rawValue}>
        {rawValue.length < fixedValue.length ? rawValue : fixedValue}
      </span>
    );
  };
  return (
    <>
      <table>
        <thead>
          <tr>
            <th>id</th>
            <th>图标</th>
            <th>名称</th>
            <th>等级</th>
            <th>经验值</th>
            <th>frag</th>
            <th>step</th>
            <th>over</th>
            <th>技能</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((status) => {
            return (
              <tr>
                <td>{status.character_id}</td>
                <td>
                  <Avatar resolver={resolver} status={status} id={status.character_id}></Avatar>
                </td>
                <td>{status.display_name["zh-Hans"]}</td>
                <td>{renderNumber(status.level)}</td>
                <td>{renderNumber(status.exp)}</td>
                <td>{renderNumber(status.frag)}</td>
                <td>{renderNumber(status.prog)}</td>
                <td>{renderNumber(status.overdrive)}</td>
                <td>{status.skill_id_text?.["zh-Hans"] ?? "-"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
};

const Avatar: FC<{
  resolver: AssetsResolver;
  status: Pick<lowiro.UserProfile["character_stats"][number], "is_uncapped" | "is_uncapped_override">;
  id: number;
}> = ({ status, id, resolver }) => {
  const charStatus = status.is_uncapped
    ? status.is_uncapped_override
      ? CharacterStatus.Initial
      : CharacterStatus.Awaken
    : CharacterStatus.Initial;
  return (
    <img
      class="avatar"
      onError={function () {
        const unknown = resolver.resoveCharacterImage({
          id: -1,
          kind: CharacterImageKind.Icon,
          status: CharacterStatus.Initial,
        }).href;
        if (this.src !== unknown) this.src = unknown;
      }}
      src={
        resolver.resoveCharacterImage({
          id,
          status: charStatus,
          kind: CharacterImageKind.Icon,
        }).href
      }
    ></img>
  );
};
