import { create } from "sheetly";
import data from "../data/chart-data.json";
import { Chart, ClearRank, Difficulty, PlayResult, SongData } from "../models/music-play";
import { Profile } from "../models/profile";
import { MusicPlayService } from "./declarations";
import { MusicPlayServiceImpl } from "./music-play";
import * as lowiro from "./web-api";
import { downloadJSON } from "../utils/download";
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
  return await get<lowiro.UserProfile>("user/me");
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

export async function queryFriendsB39(type: string, only: string | null): Promise<Profile[]> {
  const profile = await getSelfProfile();
  const friends = profile.friends;
  const limit = 39;
  const queryPlayers = (() => {
    if (only) {
      return [...friends, profile].filter((player) => player.name === only);
    }
    if (type === "both") {
      return [...friends, profile];
    } else if (type === "selfonly") {
      return [profile];
    }
    return friends;
  })();
  console.log(
    `查询目标玩家：`,
    queryPlayers.map((p) => p.name)
  );
  const friendBestsMinPtt = new Map(queryPlayers.map((f) => [f.name, -Infinity]));
  interface PlayResultWithPtt {
    result: PlayResult;
    ptt: number;
  }
  const friendsPlayResults = Object.fromEntries(queryPlayers.map<[string, PlayResultWithPtt[]]>((f) => [f.name, []]));
  for (const { song, chart } of flattenData) {
    console.log(
      `正在查询 ${chart.byd?.song ?? song.name} 的 ${chart.difficulty}难度（${chart.constant.toFixed(1)}）好友榜……`
    );
    const friendBests = await getFriendsBest(song.sid, mapDifficulty(chart.difficulty));
    if (!friendBests) {
      break;
    }
    const pttPM = chart.constant + 2;
    const restFriends = friendBests.filter((b) => friendBestsMinPtt.get(b.name)! < pttPM);
    if ([...friendBestsMinPtt.entries()].every(([, min]) => min > pttPM)) {
      break;
    }
    for (const best of restFriends) {
      const friendName = best.name;
      const playResult: PlayResult = {
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

async function main() {
  const url = new URL(import.meta.url);
  const search = url.searchParams;
  const queryType = search.get("type") || "friendonly";
  const queryOnly = search.get("only");
  const profiles = await queryFriendsB39(queryType, queryOnly);
  console.log(profiles);
  handleProfiles(profiles);
}

function handleProfiles(profiles: Profile[]) {
  const sheet = create(
    `
form#export-profile .row {
  margin: 8px;
}
`,
    ""
  );
  document.adoptedStyleSheets = document.adoptedStyleSheets.concat(sheet);
  const container = document.createElement("div");
  const dialog = document.createElement("dialog");
  dialog.id = "export-profile";
  dialog.innerHTML = `
<form id="export-profile">
  <div class="row">
    <select id="profile" name="profile"></select>
  </div>
  <div class="row">
    <button type="button" class="sync">一键同步</button>
    <button type="button" class="export">导出所选存档</button>
    <button type="button" class="close">关闭</button>
  </div>
</form>  
`;
  const select = dialog.querySelector("select#profile")!;
  const exportBtn = dialog.querySelector("button.export")!;
  const closeBtn = dialog.querySelector("button.close")!;
  const syncBtn = dialog.querySelector("button.sync")!;
  select.append(
    ...profiles.map((p) => {
      const option = document.createElement("option");
      option.textContent = option.value = p.username;
      return option;
    })
  );
  exportBtn.onclick = () => {
    const profile = profiles.find((p) => p.username === select.value);
    if (profile) {
      downloadJSON(profile, `profile_${profile.username}.json`);
    }
  };
  closeBtn.onclick = () => {
    dialog.close();
  };
  syncBtn.onclick = () => {
    // const targetURL = "http://localhost:1234/";
    const targetURL = new URL("..", import.meta.url);
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    document.body.appendChild(iframe);
    iframe.src = targetURL.toString();
    iframe.onload = () => {
      iframe.contentWindow!.postMessage(profiles, "*");
      dialog.close();
    };
  };
  const shadow = container.attachShadow({ mode: "open" });
  shadow.appendChild(dialog);
  document.body.appendChild(container);
  dialog.showModal();
}

main();
