import characters from "../../../data/character-data.json";
import { sheet } from "./style.css.js";
import { bootstrap } from "../../styles";
import { Inject } from "../../../services/di";
import { $CrossSiteScriptPluginService, CrossSiteScriptPluginService } from "../../../services/declarations";
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
              const { display_name, rating, join_date } = profile;
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

const style = css`
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
      <style>{style}</style>
    </>
  );
};
