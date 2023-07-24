import characters from "../../../data/character-data.json";
import { sheet } from "./style.css.js";
import { bootstrap } from "../../styles";
import { Inject } from "../../../services/di";
import {
  $CrossSiteScriptPluginService,
  $WorldModeService,
  CrossSiteScriptPluginService,
  WorldModeService,
} from "../../../services/declarations";
import * as lowiro from "../../../services/web-api";
import { Profile } from "../../../models/profile";
import { alert } from "../global-message";
import type { FC } from "hyplate/types";
import { computed, signal, For, Show, create, HyplateElement, Component, element } from "hyplate";
import { css } from "../../../utils/component";

export
@Component({
  tag: "arcaea-toolbelt-plugin-panel",
  styles: [bootstrap, sheet],
})
class ToolPanel extends HyplateElement {
  @Inject($CrossSiteScriptPluginService)
  accessor service!: CrossSiteScriptPluginService;
  @Inject($WorldModeService)
  accessor world!: WorldModeService;
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
      alert(create(<CharacterList stats={profile.character_stats}></CharacterList>));
    };
    const refresh = () => {
      initProfile();
    };
    const syncMe = async (profile: lowiro.UserProfile) => {
      await this.service.syncMe(profile);
      alert("同步成功");
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
      alert(`存档${profiles.map((p) => p.username).join("，")}同步成功`);
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
              const players = computed(() => {
                const profile = profile$();
                return profile ? [profile, ...profile.friends] : [];
              });
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
                        onClick={() => syncMe(profile)}
                      >
                        同步
                      </button>
                    </div>
                  </div>
                  <header>
                    <h2>查分</h2>
                  </header>
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
                            <For of={players}>{(friend) => <option value={friend.name}>{friend.name}</option>}</For>
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
                          onClick={syncBests}
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
      </div>
    );
  }
}

const characterMap: Record<number, (typeof characters)[number]> = Object.fromEntries(characters.map((c) => [c.id, c]));

const characterListStyle = css`
  div.modal-root {
    width: 80vw;
  }
  thead th,
  tbody td {
    border: var(--bs-border-width) var(--bs-border-color) solid;
    border-collapse: collapse;
    padding: 0.25em;
  }
`;

const CharacterList: FC<{
  stats: lowiro.UserProfile["character_stats"];
}> = ({ stats }) => {
  const notFound = stats.find((s) => !characterMap[s.character_id]);
  if (notFound) {
    return (
      <p>
        搭档 {notFound.display_name["zh-Hans"]}（id为{notFound.character_id}） 未找到，可能是Arcaea
        Toolbelt暂无数据的新搭档
      </p>
    );
  }
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
            const character = characterMap[status.character_id]!;
            return (
              <tr>
                <td>{status.character_id}</td>
                <td>
                  <img
                    src={
                      status.is_uncapped // 觉醒
                        ? status.is_uncapped_override // 觉醒了但切换回觉醒前立绘
                          ? character.image
                          : character.awakenImage ?? character.image // 光&对立觉醒立绘和初始立绘一样
                        : character.image
                    }
                  ></img>
                </td>
                <td>{character.name.zh}</td>
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
      <style>{characterListStyle}</style>
    </>
  );
};
