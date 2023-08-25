import { SqlJsStatic } from "sql.js";
import { NoteResult, PlayResult } from "../models/music-play";
import { B30Response, BestResultItem, Profile, ProfileV1, ProfileV2 } from "../models/profile";
import { download } from "../utils/download";
import { readBinary, readFile } from "../utils/read-file";
import { alert, confirm } from "../view/components/global-message";
import {
  $ChartService,
  $MusicPlayService,
  $ProfileService,
  ChartService,
  MusicPlayService,
  ProfileService,
} from "./declarations";
import { Injectable } from "classic-di";
const sum = (arr: number[]) => arr.reduce((s, curr) => s + curr, 0);

const KEY_CURRENT_USERNAME = "CURRENT_USERNAME";

const isValidProfileV1 = (input: any): input is ProfileV1 => {
  const value: Partial<ProfileV1> = input;
  return (
    value != null &&
    typeof value === "object" &&
    value.version === 1 &&
    typeof value.username === "string" &&
    typeof value.potential === "string" &&
    typeof value.best === "object" &&
    (value.characters == null || Array.isArray(value.characters))
  );
};

const isValidProfileV2 = (input: any): input is ProfileV2 => {
  const value: Partial<ProfileV2> = input;
  return (
    value != null &&
    typeof value === "object" &&
    value.version === 2 &&
    typeof value.username === "string" &&
    typeof value.potential === "string" &&
    typeof value.best === "object" &&
    (value.characters == null || Array.isArray(value.characters))
  );
};

@Injectable({
  requires: [$MusicPlayService, $ChartService] as const,
  implements: $ProfileService,
})
export class ProfileServiceImpl implements ProfileService {
  currentUsername: string | null = this.getInitCurrentUsername();
  #SQL: SqlJsStatic | null = null;
  constructor(private readonly musicPlay: MusicPlayService, private readonly chartService: ChartService) {}

  async getProfile(): Promise<Profile | null> {
    if (!this.currentUsername) {
      return null;
    }
    return this.getProfileAsync(this.currentUsername);
  }

  async createOrUpdateProfile(username: string, potential: number): Promise<void> {
    const profile: Profile = (await this.getProfileAsync(username)) ?? this.createEmptyProfile(username);
    profile.potential = potential.toFixed(2);
    profile.username = username;
    await this.saveProfile(profile, username);
  }

  async getProfileList(): Promise<string[]> {
    return this.getProfileListSync();
  }

  async syncProfiles(data: Partial<Profile>[]): Promise<void> {
    for (const profile of data) {
      this.saveProfile(profile, profile.username);
    }
  }

  async importProfile(file: File): Promise<void> {
    const content = await readFile(file);
    try {
      const json = JSON.parse(content);
      // TODO 检查json内容，版本兼容
      const username: string = json.username;
      const oldProfile = localStorage.getItem(username);
      if (oldProfile != null) {
        if (!(await confirm("已存在同名存档，是否覆盖？"))) {
          return;
        }
      }
      await this.saveProfile(json, username);
      alert("导入成功");
    } catch (error) {
      alert(`寄！${error}`);
    }
  }
  async exportProfile(): Promise<void> {
    const p = await this.getProfile();
    if (!p) {
      alert("未选择存档");
      return;
    }
    const url = URL.createObjectURL(new Blob([JSON.stringify(p)], { type: "application/json" }));
    download(url, `profile_${p.username}.json`);
  }
  async addResult(playResult: PlayResult, replace?: boolean | undefined): Promise<void> {
    const p = await this.getProfile();
    if (!p) {
      alert("未选择存档");
      return;
    }
    if (!replace) {
      const oldResult = p.best[playResult.chartId];
      if (oldResult) {
        const { chart } = (await this.chartService.searchChart(playResult.chartId))[0] ?? {};
        if (chart) {
          const getScore = (res: PlayResult): number =>
            res.type === "score" ? res.score : this.musicPlay.computeScore(chart, res.result);
          const oldScore = getScore(oldResult);
          const newScore = getScore(playResult);
          if (
            newScore <= oldScore &&
            !(await confirm(`当前分数（${newScore}）未超过现有分数（${oldScore}），是否替换？`))
          ) {
            return;
          }
        }
      }
    }
    p.best[playResult.chartId] = playResult;
    await this.saveProfile(p);
  }

  async useProfile(username: string): Promise<void> {
    this.currentUsername = username;
    sessionStorage.setItem(KEY_CURRENT_USERNAME, username);
  }

  async removeResult(chartId: string): Promise<void> {
    const p = await this.getProfile();
    if (!p) {
      return;
    }
    delete p.best[chartId];
    await this.saveProfile(p);
  }
  async b30(profile: Profile): Promise<B30Response> {
    const songs = await this.chartService.getSongData();
    const charts = Object.fromEntries(songs.flatMap((s) => s.charts.map((c) => [c.id, { chart: c, song: s }])));
    const playResults = Object.values(profile.best).map<BestResultItem>((r) => {
      const { chart, song } = charts[r.chartId]!;
      const { clear } = r;
      if (r.type === "score") {
        const { score } = r;
        return {
          chart,
          score: this.musicPlay.computeScoreResult(score, chart),
          song,
          clear,
          note: null,
          no: 0,
        };
      }
      return {
        chart,
        song,
        clear,
        no: 0,
        note: r.result,
        score: this.musicPlay.computeScoreResult(this.musicPlay.computeScore(chart, r.result), chart),
      };
    });

    const ordered = playResults
      .sort((a, b) => b.score.potential - a.score.potential)
      .map((r, i) => ({ ...r, no: i + 1 }));
    const b30 = ordered.slice(0, 30);
    const ptt30 = b30.map((r) => r.score.potential);
    const b30Sum = sum(ptt30);
    const b10Sum = sum(ptt30.slice(0, 10));
    const maxPotential = (b10Sum + b30Sum) / 40;
    const minPotential = b30Sum / 40;
    // 如果成绩少于10个，recent 10的平均值应当按照成绩个数取平均
    const r10Average = (+profile.potential * 40 - b30Sum) / Math.min(playResults.length, 10);

    return {
      username: profile.username,
      potential: profile.potential,
      b30: b30,
      b31_39: ordered.slice(30, 39),
      maxPotential,
      minPotential,
      r10Average,
      b30Average: b30Sum / ptt30.length,
    };
  }
  async importDB(file: File, profile: Profile): Promise<void> {
    const bytes = await readBinary(file);
    const SQL = (this.#SQL ??= await this.#initSQLJS());
    const db = new SQL.Database(new Uint8Array(bytes));
    const [scoreQueryResult] = db.exec(`\
SELECT
scores.songId,
scores.songDifficulty,
scores.shinyPerfectCount,
scores.perfectCount,
scores.nearCount,
scores.missCount,
cleartypes.clearType 
FROM scores JOIN cleartypes
ON scores.songId = cleartypes.songId AND scores.songDifficulty = cleartypes.songDifficulty
`);
    if (!scoreQueryResult) {
      throw new Error(`读取数据库失败`);
    }
    interface ST3ScoreQuery {
      songId: string;
      songDifficulty: number;
      shinyPerfectCount: number;
      perfectCount: number;
      nearCount: number;
      missCount: number;
      clearType: number;
    }
    const { columns, values } = scoreQueryResult;
    const scores = values.map((row) =>
      row.reduce<ST3ScoreQuery>((st3Score, value, index) => {
        Reflect.set(st3Score, columns[index]!, value);
        return st3Score;
      }, {} as unknown as ST3ScoreQuery)
    );
    const songIndex = await this.chartService.getSongIndex();
    const { best } = profile;
    for (const score of scores) {
      const { songId, songDifficulty, shinyPerfectCount, perfectCount, nearCount, missCount, clearType } = score;
      const song = songIndex[songId];
      if (!song) {
        console.error(`未知songId：${songId}`);
        continue;
      }
      const chart = song.charts[songDifficulty];
      if (!chart) {
        console.error(`曲目${song.name}难度${songDifficulty}不存在`);
        continue;
      }
      const noteResult: NoteResult = {
        perfect: shinyPerfectCount,
        pure: perfectCount,
        far: nearCount,
        lost: missCount,
      };
      best[chart.id] = {
        type: "note",
        result: noteResult,
        chartId: chart.id,
        clear: this.musicPlay.mapClearType(clearType, shinyPerfectCount, chart),
      };
    }
    await this.saveProfile({ best });
  }

  private createEmptyProfile(username: string): Profile {
    return {
      best: {},
      potential: "0",
      username,
      version: 2,
    };
  }

  private getJSONSync(username: string): object | null {
    try {
      return JSON.parse(localStorage.getItem(username)!);
    } catch {
      return null;
    }
  }

  /**
   * 获取存档时自动升级一次
   */
  private async getProfileAsync(username: string): Promise<Profile | null> {
    try {
      const profile = this.getJSONSync(username);
      if (isValidProfileV1(profile)) {
        const newProfile = await this.upgradeV1(profile);
        await this.saveProfileDirectly(newProfile, username);
        return newProfile;
      } else if (isValidProfileV2(profile)) {
        return profile;
      }
      return null;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  private async upgradeV1(v1: ProfileV1): Promise<ProfileV2> {
    const indexed = await this.#getV1Map();
    return {
      ...v1,
      version: 2,
      best: Object.fromEntries(
        Object.entries(v1.best).map(([oldChartId, value]) => {
          const chartId = indexed[oldChartId.toLowerCase()];
          if (!chartId) {
            throw new Error(`Cannot upgrade chartId: ${oldChartId}`);
          }
          return [
            chartId,
            {
              ...value,
              chartId,
            },
          ] as const;
        })
      ),
    };
  }

  private async saveProfile(profile: Partial<Profile>, key = this.currentUsername!) {
    const original = (await this.getProfileAsync(key)) ?? this.createEmptyProfile(key);
    const newProfile = Object.assign({}, original, profile);
    await this.saveProfileDirectly(newProfile, key);
  }

  private async saveProfileDirectly(profile: Profile, key: string) {
    localStorage.setItem(key, JSON.stringify(profile));
  }

  private getInitCurrentUsername(): string | null {
    const sessionUsername = sessionStorage.getItem(KEY_CURRENT_USERNAME);
    if (sessionUsername) {
      return sessionUsername;
    }
    const profiles = this.getProfileListSync();
    if (profiles.length === 1) {
      return profiles[0]!;
    }
    return null;
  }

  private getProfileListSync(): string[] {
    return Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)!).filter((key) => {
      const profile = this.getJSONSync(key);
      if (!profile) {
        return false;
      }
      return isValidProfileV1(profile) || isValidProfileV2(profile);
    });
  }

  async #initSQLJS() {
    const { default: initSQLJS } = await import("sql.js");
    return initSQLJS({
      locateFile(url, scriptDirectory) {
        if (url === "sql-wasm.wasm") {
          return new URL("../../node_modules/sql.js/dist/sql-wasm.wasm", import.meta.url).href;
        }
        return `https://sql.js.org/dist/${url}`;
      },
    });
  }

  #v1Map: {
    [oldChartIdLower: string]: string;
  } | null = null;

  async #getV1Map() {
    if (!this.#v1Map) {
      const v1Data = await import("../data/chart-data-legacy-1.json");
      const v2Data = await this.chartService.getSongData();
      const validV2ChartIds = new Set(v2Data.flatMap((song) => song.charts.map((chart) => chart.id)));
      Object.assign({ validV2ChartIds });
      this.#v1Map = Object.fromEntries(
        v1Data.flatMap((song) =>
          song.charts.map((chart) => {
            const newId = `${song.sid}@${chart.difficulty}`;
            if (!validV2ChartIds.has(newId)) {
              console.error(`${newId} cannot be resolved`);
            }
            const oldIdLower = chart.id.toLowerCase();
            return [oldIdLower, newId];
          })
        )
      );
    }
    return this.#v1Map;
  }
}
