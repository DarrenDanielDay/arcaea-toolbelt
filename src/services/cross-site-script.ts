import { create } from "sheetly";
import data from "../data/chart-data.json";
import { Chart, ClearRank, Difficulty, PlayResult, SongData } from "../models/music-play";
import { Profile } from "../models/profile";
import { $CrossSiteScriptPluginService, CrossSiteScriptPluginService, MusicPlayService } from "./declarations";
import { MusicPlayServiceImpl } from "./music-play";
import * as lowiro from "./web-api";
import { ToolPanel } from "../view/components/plugin-panel";
import { addSheet } from "sheetly";
import { bootstrap } from "../view/styles";
import { sheet as dialogSheet } from "../view/components/global-message/style.css.js";
import { provide } from "./di";
import { element } from "hyplate";

const musicPlay: MusicPlayService = new MusicPlayServiceImpl();
const flattenData = (data as SongData[])
  .flatMap((song) =>
    song.charts.map((chart) => ({
      song,
      chart,
    }))
  )
  .sort((a, b) => b.chart.constant - a.chart.constant);

let cookie = "";

export function setCookie(value: string) {
  cookie = value;
}

function api(path: string) {
  return new URL(path, "https://webapi.lowiro.com/webapi/");
}

async function get<T>(path: string): Promise<T> {
  const fetchOptions: RequestInit = {
    credentials: "include",
    mode: "cors",
  };
  const url = api(path);
  function handleResult(json: any) {
    if (!json.success) {
      console.error(json);
      throw new Error(`请求接口 ${url.toString()} 失败`);
    }
    return json.value;
  }
  if (typeof window !== "undefined") {
    // Browser
    const response = await fetch(url, fetchOptions);
    return handleResult(await response.json());
  }
  // TODO nodejs implementation
  const response = await fetch(url, {
    headers: {
      Cookie: cookie,
    },
  });
  return handleResult(await response.json());
}

export async function getSelfProfile() {
  const promise = xhrProxy.waitForRequest<{ value: lowiro.UserProfile }>("user/me");
  window.dispatchEvent(new FocusEvent("focus"));
  const { value } = await promise;
  return value;
}

export async function getFriendsBest(sid: string, difficulty: number) {
  try {
    return await get<lowiro.FriendBestInfo[]>(
      `score/song/friend?song_id=${sid}&difficulty=${difficulty}&start=0&limit=26`
    );
  } catch (error) {
    console.error(error);
    return null;
  }
}

function mapDifficulty(d: Difficulty) {
  switch (d) {
    case Difficulty.Past:
      return 0;
    case Difficulty.Present:
      return 1;
    case Difficulty.Future:
      return 2;
    case Difficulty.Beyond:
      return 3;
  }
}

function mapClearType(clear: number, shiny_perfect: number, chart: Chart): ClearRank {
  if (shiny_perfect === chart.note) {
    return ClearRank.Maximum;
  }
  switch (clear) {
    case 0:
      return ClearRank.TrackLost;
    case 1:
      return ClearRank.NormalClear;
    case 2:
      return ClearRank.FullRecall;
    case 3:
      return ClearRank.PureMemory;
    case 4:
      return ClearRank.EasyClear;
    case 5:
      return ClearRank.HardClear;
  }
  throw new Error(`未知clear_type: ${clear}`);
}

type QueryBests = {
  [username: string]: {
    [chartId: string]: PlayResult;
  };
};

async function queryBest(
  profile: lowiro.UserProfile,
  usernames: string[],
  onProgress: (msg: string) => void,
  signal: AbortSignal,
  limit: number = 39
): Promise<Profile[]> {
  const friends = profile.friends;
  const names = new Set(usernames);
  const queryPlayers = [...friends, profile].filter((p) => names.has(p.name));
  console.log(
    `查询目标玩家：`,
    queryPlayers.map((p) => p.name)
  );
  const friendBestsMinPtt = new Map(queryPlayers.map((f) => [f.name, -Infinity]));
  interface PlayResultWithPtt {
    result: PlayResult;
    ptt: number;
  }
  let aborted = false;
  const handleAbort = () => {
    aborted = true;
  };
  const message = (msg: string) => {
    console.log(msg);
    onProgress(msg);
  };
  signal.addEventListener("abort", handleAbort);
  const friendsPlayResults = Object.fromEntries(queryPlayers.map<[string, PlayResultWithPtt[]]>((f) => [f.name, []]));
  for (const { song, chart } of flattenData) {
    if (aborted) {
      throw new Error(`用户取消。`);
    }
    message(
      `正在查询 ${chart.byd?.song ?? song.name} 的 ${chart.difficulty}难度（${chart.constant.toFixed(1)}）好友榜……`
    );
    const friendBests = await getFriendsBest(song.sid, mapDifficulty(chart.difficulty));
    if (!friendBests) {
      throw new Error(`寄了，接口改了，需要订阅Arcaea Online才能用`);
    }
    const pttPM = chart.constant + 2;
    const restFriends = friendBests.filter((b) => friendBestsMinPtt.get(b.name)! < pttPM);
    if ([...friendBestsMinPtt.entries()].every(([, min]) => min > pttPM)) {
      break;
    }
    for (const best of restFriends) {
      const friendName = best.name;
      const playResult: PlayResult = best.perfect_count
        ? {
            type: "note",
            chartId: chart.id,
            // clear_type是最高分那次的，best_clear_type是排行榜显示的通关类型
            clear: mapClearType(best.clear_type, best.shiny_perfect_count, chart),
            result: {
              pure: best.perfect_count,
              perfect: best.shiny_perfect_count,
              far: best.near_count,
              lost: best.miss_count,
            },
          }
        : {
            // 接口字段也删了点，没有note判定信息
            type: "score",
            chartId: chart.id,
            clear: null,
            score: best.score,
          };
      const ptt = musicPlay.computePotential(best.score, chart);
      const oneFriendBests = friendsPlayResults[friendName];
      if (!oneFriendBests) {
        throw new Error(`这种情况应该是查询中途加了好友……`);
      }
      oneFriendBests.push({
        result: playResult,
        ptt,
      });
      oneFriendBests.sort((a, b) => b.ptt - a.ptt);
      if (oneFriendBests.length > limit) {
        oneFriendBests.pop();
      }
      if (oneFriendBests.length === limit) {
        friendBestsMinPtt.set(friendName, oneFriendBests.at(-1)!.ptt);
      }
    }
  }
  signal.removeEventListener("abort", handleAbort);
  const result: QueryBests = Object.fromEntries(
    queryPlayers.map((friend) => [
      friend.name,
      friendsPlayResults[friend.name]!.reduce<{ [chartId: string]: PlayResult }>((map, curr) => {
        map[curr.result.chartId] = curr.result;
        return map;
      }, {}),
    ])
  );
  return Object.entries(result).map(([name, best]) => ({
    best,
    username: name,
    version: 1,
    potential: (queryPlayers.find((f) => f.name === name)!.rating / 100).toFixed(2),
  }));
}

class CrossSiteScriptPluginServiceImpl implements CrossSiteScriptPluginService {
  private iframe: HTMLIFrameElement | null = null;

  async getProfile(): Promise<lowiro.UserProfile> {
    return await getSelfProfile();
  }
  startQueryBests(
    profile: lowiro.UserProfile,
    targetPlayers: string[],
    onProgress: (message: string) => void,
    onResult: (profiles: Profile[]) => void,
    onError?: (message: string) => void
  ): AbortController {
    const controller = new AbortController();
    queryBest(profile, targetPlayers, onProgress, controller.signal)
      .then(onResult)
      .catch((error) => {
        if (error instanceof Error) {
          onError?.(error.message);
        } else {
          onError?.(`${error}`);
        }
      });
    return controller;
  }

  private createOrGetIFrame(): Promise<HTMLIFrameElement> {
    return new Promise<HTMLIFrameElement>((resolve, reject) => {
      if (this.iframe) {
        return resolve(this.iframe);
      }
      // TODO 支持打包成ESM直接用import.meta.url，不再需要环境变量
      // const baseURI = new URL("..", import.meta.url);
      const baseURI = process.env.BASE_URI;
      const targetURL = new URL("services/cross-site-frame.html", baseURI);
      const iframe = element("iframe");
      iframe.style.display = "none";
      document.body.appendChild(iframe);
      iframe.src = targetURL.toString();
      iframe.onload = () => {
        this.iframe = iframe;
        resolve(iframe);
      };
    });
  }

  private async postMessage(type: string, payload: unknown): Promise<void> {
    const iframe = await this.createOrGetIFrame();
    return new Promise<void>((resolve, reject) => {
      const win = iframe.contentWindow!;
      win.postMessage({ type, payload }, "*");
      window.addEventListener("message", function handler(e) {
        const message = e.data;
        switch (message.type) {
          case `${type}-success`:
            resolve();
            break;
          case `${type}-error`:
            reject(message.error);
            break;
        }
        window.removeEventListener("message", handler);
      });
      iframe.onerror = reject;
    });
  }

  syncProfiles(profiles: Profile[]): Promise<void> {
    return this.postMessage("sync-profiles", profiles);
  }
  syncMe(profile: lowiro.UserProfile): Promise<void> {
    const myProfile: Partial<Profile> = {
      username: profile.display_name,
      potential: (profile.rating / 100).toFixed(2),
      characters: profile.character_stats.map((c) => ({
        exp: c.exp,
        factors: {
          frag: c.frag,
          over: c.overdrive,
          step: c.prog,
        },
        id: c.character_id,
        level: c.level,
      })),
    };
    return this.postMessage("sync-me", myProfile);
  }
}

const createOrGetDialog = (() => {
  let dialog: HTMLDialogElement | null = null;
  let panel: ToolPanel | null = null;
  return () => {
    if (!dialog || !panel) {
      dialog = element("dialog");
      document.body.appendChild(dialog);
      const container = element("div");
      provide($CrossSiteScriptPluginService, container, new CrossSiteScriptPluginServiceImpl());
      document.body.appendChild(container);
      const wrapper = container.attachShadow({ mode: "open" });
      addSheet(bootstrap, wrapper);
      addSheet(dialogSheet, wrapper);
      panel = new ToolPanel();
      panel.addEventListener("panel-close", () => {
        dialog?.close();
      });
      wrapper.appendChild(dialog);
      dialog.appendChild(panel);
    }
    return dialog;
  };
})();

class XHRProxy extends EventTarget {
  waitForRequest<T>(path: string): Promise<T> {
    const that = this;
    return new Promise<T>((resolve, reject) => {
      this.addEventListener("XHR Response", function hander(e) {
        if (e instanceof CustomEvent) {
          const xhr: HackedXHR = e.detail;
          if (new URL(xhr.responseURL).pathname.includes(path)) {
            const response = xhr.response;
            if (typeof response === "string") {
              resolve(JSON.parse(response));
              that.removeEventListener("XHR Response", hander);
            } else {
              reject(new Error(`Unknown response type`));
            }
          }
        }
      });
    });
  }
}
const xhrProxy = new XHRProxy();

class HackedXHR extends XMLHttpRequest {
  constructor() {
    super();
    this.addEventListener("loadend", () => {
      queueMicrotask(() => {
        xhrProxy.dispatchEvent(new CustomEvent("XHR Response", { detail: this }));
      });
    });
  }
}

async function main() {
  window.XMLHttpRequest = HackedXHR;
  window.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key.toUpperCase() === "B") {
      createOrGetDialog().showModal();
    }
  });
  createOrGetDialog().showModal();
}

main();
