import { SqlJsStatic } from "sql.js";
import { Chart, ClearRank, NoteResult, PlayResult, difficulties } from "../models/music-play";
import { B30Response, BestResultItem, Profile, ProfileUpdatePayload, ProfileV1, ProfileV2 } from "../models/profile";
import { download } from "../utils/download";
import { readBinary, readFile } from "../utils/read-file";
import { alert, confirm } from "../view/components/fancy-dialog";
import {
  $ChartService,
  $Database,
  $MusicPlayService,
  $ProfileService,
  AppDatabaseContext,
  B30Options,
  BestStatistics,
  BestStatisticsQuery,
  ChartService,
  ImportResult,
  MusicPlayService,
  ProfileService,
  ReportProgress,
} from "./declarations";
import { Injectable } from "classic-di";
import { groupBy, indexBy, mapProps } from "../utils/collections";
import { arcaeaReleaseTS, delay } from "../utils/time";
import { sum } from "../utils/math";
import { requestToPromise } from "../utils/indexed-db";
import { isString, jsonModule } from "../utils/misc";

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
  requires: [$Database, $MusicPlayService, $ChartService] as const,
  implements: $ProfileService,
})
export class ProfileServiceImpl implements ProfileService {
  #currentUsername: string | null = this.#getInitCurrentUsername();
  #SQL: SqlJsStatic | null = null;
  constructor(
    private readonly database: AppDatabaseContext,
    private readonly musicPlay: MusicPlayService,
    private readonly chartService: ChartService
  ) {}

  async checkMigration(): Promise<null | (() => Promise<void>)> {
    const legacyProfiles = this.#getLegacyProfileListSync();
    if (!legacyProfiles.length) return null;
    return async () => {
      const upgradedProfiles = await Promise.all(
        legacyProfiles.map(async (profile) => {
          if (isValidProfileV1(profile)) return this.#upgradeV1(profile);
          return profile;
        })
      );
      await this.syncProfiles(upgradedProfiles);
      this.#removeLegacyProfilesSync(upgradedProfiles.map((p) => p.username));
    };
  }

  formatPotential(potential: number): string {
    const maxDivider = 600000;
    const rating = Math.round(potential * maxDivider);
    return (rating / maxDivider).toFixed(2);
  }

  async getProfile(): Promise<Profile | null> {
    const username = this.#currentUsername ?? (await this.#getPossibleOnlyUsername());
    if (!username) {
      return null;
    }
    if (username !== this.#currentUsername) {
      await this.useProfile(username);
    }
    const profile = await this.#getProfileAsync(username);
    if (!profile) {
      sessionStorage.removeItem(KEY_CURRENT_USERNAME);
    }
    return profile;
  }

  async createOrUpdateProfile(username: string, potential: number): Promise<void> {
    const profile: Profile = (await this.#getProfileAsync(username)) ?? this.createEmptyProfile(username);
    profile.potential = potential.toFixed(2);
    profile.username = username;
    await this.#saveProfile(profile);
  }

  async getProfileList(): Promise<string[]> {
    const usernames = await requestToPromise((await this.#store()).getAllKeys());
    return usernames?.filter(isString) ?? [];
  }

  async syncProfiles(data: ProfileUpdatePayload[]): Promise<void> {
    for (const profile of data) {
      this.#saveProfile(profile);
    }
  }

  async importProfile(file: File): Promise<void> {
    const content = await readFile(file);
    try {
      const json = JSON.parse(content);
      const profile = isValidProfileV1(json) ? await this.#upgradeV1(json) : isValidProfileV2(json) ? json : null;
      if (!profile) {
        alert(`存档格式错误`);
        return;
      }
      const username = profile.username;
      const oldProfile = await this.#getProfileAsync(username);
      if (oldProfile != null) {
        if (!(await confirm("已存在同名存档，是否覆盖？"))) {
          return;
        }
      }
      await this.#saveProfile(profile);
      alert("导入成功");
    } catch (error) {
      alert(`寄！${error}`);
    }
  }
  async exportProfile(profile: Profile): Promise<void> {
    const url = URL.createObjectURL(new Blob([JSON.stringify(profile)], { type: "application/json" }));
    download(url, `profile_${profile.username}.json`);
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
    await this.#saveProfile(p);
  }

  async useProfile(username: string): Promise<void> {
    this.#currentUsername = username;
    sessionStorage.setItem(KEY_CURRENT_USERNAME, username);
  }

  async removeResult(chartId: string): Promise<void> {
    const p = await this.getProfile();
    if (!p) {
      return;
    }
    delete p.best[chartId];
    await this.#saveProfile(p);
  }

  async deleteProfile(username: string): Promise<void> {
    const store = await this.#store("readwrite");
    await requestToPromise(store.delete(username));
  }

  async b30(profile: Profile, options?: Partial<B30Options>): Promise<B30Response> {
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
          date: r.date,
        };
      }
      return {
        chart,
        song,
        clear,
        no: 0,
        note: r.result,
        score: this.musicPlay.computeScoreResult(this.musicPlay.computeScore(chart, r.result), chart),
        date: r.date,
      };
    });
    let hasFilter = false;
    const packs = new Set(options?.packs);
    const ordered = playResults
      .filter((item) => {
        const { song } = item;
        if (packs.size && !packs.has(song.pack)) {
          hasFilter = true;
          return false;
        }
        const customFilter = options?.filter?.(item) ?? true;
        if (!customFilter) {
          hasFilter = true;
        }
        return customFilter;
      })
      .sort((a, b) => b.score.potential - a.score.potential)
      .map((r, i) => ({ ...r, no: i + 1 }));
    const b30 = ordered.slice(0, 30);
    const ptt30 = b30.map((r) => r.score.potential);
    const b30Sum = sum(ptt30);
    const b10Sum = sum(ptt30.slice(0, 10));
    const maxPotential = (b10Sum + b30Sum) / 40;
    const minPotential = b30Sum / 40;
    const potential = this.formatPotential(hasFilter ? maxPotential : +profile.potential);
    // 如果成绩少于10个，recent 10的平均值应当按照成绩个数取平均
    const r10Average = (+potential * 40 - b30Sum) / Math.min(playResults.length, 10);

    return {
      queryTime: Date.now(),
      username: profile.username,
      potential,
      rating: this.musicPlay.getPotentialRating(+potential),
      b30: b30,
      b31_39: ordered.slice(30, 39),
      maxPotential,
      minPotential,
      r10Average,
      b30Average: b30Sum / ptt30.length,
    };
  }

  async generateMaxProfile(): Promise<Profile> {
    const songData = await this.chartService.getSongData();
    const stats = await this.musicPlay.getStatistics();
    const profile = this.createEmptyProfile("👽");
    profile.potential = this.formatPotential(stats.maximumPotential);
    for (const song of songData) {
      for (const chart of song.charts) {
        profile.best[chart.id] = {
          chartId: chart.id,
          clear: ClearRank.Maximum,
          type: "note",
          result: {
            far: 0,
            lost: 0,
            perfect: chart.note,
            pure: chart.note,
          },
        };
      }
    }
    return profile;
  }

  async importDB(file: File, profile: Profile, report?: ReportProgress): Promise<ImportResult> {
    report?.("正在读取文件");
    const bytes = await readBinary(file);
    report?.("正在加载模块");
    const SQL = (this.#SQL ??= await this.#initSQLJS());
    report?.("正在查询成绩");
    await delay(300);
    const db = new SQL.Database(new Uint8Array(bytes));
    const [scoreQueryResult] = db.exec(`\
SELECT
scores.songId,
scores.songDifficulty,
scores.shinyPerfectCount,
scores.perfectCount,
scores.nearCount,
scores.missCount,
scores.date,
cleartypes.clearType 
FROM scores JOIN cleartypes
ON scores.songId = cleartypes.songId AND scores.songDifficulty = cleartypes.songDifficulty
`);

    report?.("正在导入存档");
    if (!scoreQueryResult) {
      throw new Error(`读取数据库失败：无结果集。可能原因：导出st3前未同步云端存档，存档内无数据。`);
    }
    interface ST3ScoreQuery {
      songId: string;
      songDifficulty: number;
      shinyPerfectCount: number;
      perfectCount: number;
      nearCount: number;
      missCount: number;
      date: number;
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
    const now = Date.now();
    const { best } = profile;
    const result: ImportResult = {
      count: 0,
      difficulties: mapProps(
        groupBy(difficulties, (d) => d),
        () => 0
      ),
      skipped: [],
    };
    for (const score of scores) {
      const { songId, songDifficulty, shinyPerfectCount, perfectCount, nearCount, missCount, date, clearType } = score;
      const song = songIndex[songId];
      if (!song) {
        result.skipped.push(`未知songId：${songId}`);
        continue;
      }
      const chart = song.charts.find((c) => c.difficulty === difficulties[songDifficulty]);
      if (!chart) {
        result.skipped.push(`曲目${song.name}的${difficulties[songDifficulty]}难度谱面未知`);
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
        date: this.#normalizeDate(date, now),
      };
      result.difficulties[chart.difficulty]++;
      result.count++;
    }

    await this.#saveProfile({ username: profile.username, best });
    return result;
  }

  async getProfileStatistics(profile: Profile, query?: BestStatisticsQuery): Promise<BestStatistics> {
    const byRecords = (records: PlayResult[]): BestStatistics => {
      let total = records.length,
        clear = 0,
        fr = 0,
        pm = 0,
        max = 0,
        rkls = 0,
        totalAccScore = 0,
        totalAccChartCount = 0,
        totalDetailed = 0,
        totalPerfect = 0,
        totalGreat = 0,
        totalNotes = 0,
        totalScore = 0,
        totalNoteResultNotes = 0;
      const arksNotComputedCharts = new Set<string>(Object.keys(filteredCharts));
      for (const record of records) {
        const chart = charts[record.chartId]!;
        const { note } = chart;
        totalNotes += note;
        let score = 0;
        if (record.type === "note") {
          const { result } = record;
          const { perfect, pure } = result;
          totalDetailed++;
          totalNoteResultNotes += note;
          totalPerfect += perfect;
          totalGreat += pure - perfect;
          switch (record.clear) {
            // @ts-ignore
            case ClearRank.Maximum:
              max++;
            // @ts-ignore
            case ClearRank.PureMemory:
              pm++;
            // @ts-ignore
            case ClearRank.FullRecall:
              fr++;
            case ClearRank.EasyClear:
            case ClearRank.NormalClear:
            case ClearRank.HardClear:
              clear++;
          }
          score = this.musicPlay.computeScore(chart, result);
          rkls += this.musicPlay.computeRankingLoseScore(record.result, chart);
          arksNotComputedCharts.delete(record.chartId);
        } else if (record.type === "score") {
          score = record.score;
        }
        totalScore += score;
        const accScore = Math.min(score, this.musicPlay.maxBase);
        if (accScore > this.musicPlay.ex) {
          totalAccScore += accScore;
          totalAccChartCount++;
        }
      }
      const frkls =
        rkls +
        sum(
          [...arksNotComputedCharts].map((chartId) => {
            const chart = charts[chartId]!;
            return this.musicPlay.computeRankingLoseScore(
              {
                far: 0,
                lost: chart.note,
                pure: 0,
                perfect: 0,
              },
              chart
            );
          })
        );
      const acc = totalAccScore / totalAccChartCount / this.musicPlay.maxBase;
      const pacc = totalPerfect / totalNoteResultNotes;
      const rest = totalNotes + total * this.musicPlay.maxBase - totalScore;
      return {
        total,
        clear,
        pm,
        fr,
        max,
        acc,
        detailed: totalDetailed,
        perfect: totalPerfect,
        great: totalGreat,
        notes: totalNoteResultNotes,
        pacc,
        rkls,
        frkls,
        rest,
      };
    };
    const songs = await this.chartService.getSongData();
    const charts = indexBy(
      songs.flatMap((song) => song.charts),
      (chart) => chart.id
    );
    const all = Object.values(profile.best);
    const filterChart = (chart: Chart): boolean => {
      if (!query) {
        return true;
      }
      const { rating, difficulty } = query;
      if (difficulty) {
        if (chart.difficulty !== difficulty) {
          return false;
        }
      }
      if (rating) {
        if (chart.level !== rating.level || !!chart.plus !== !!rating.plus) {
          return false;
        }
      }
      return true;
    };
    const filteredResults = all.filter((result) => filterChart(charts[result.chartId]!));
    const filteredCharts = Object.fromEntries(
      Object.entries(charts).filter(([, value]) => {
        return filterChart(value);
      })
    );
    return byRecords(filteredResults);
  }

  private createEmptyProfile(username: string): Profile {
    return {
      best: {},
      potential: "0",
      username,
      version: 2,
    };
  }

  /**
   * @deprecated
   */
  #getLegacyJSONSync(username: string): object | null {
    try {
      return JSON.parse(localStorage.getItem(username)!);
    } catch {
      return null;
    }
  }

  async #getProfileAsync(username: string) {
    const store = await this.#store();
    const profile = await requestToPromise<Profile>(store.get(username));
    return profile;
  }

  async #upgradeV1(v1: ProfileV1): Promise<ProfileV2> {
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

  async #saveProfile(profile: ProfileUpdatePayload) {
    const key = profile.username;
    const original = (await this.#getProfileAsync(key)) ?? this.createEmptyProfile(key);
    const newProfile = Object.assign({}, original, profile);
    await this.#saveProfileDirectly(newProfile);
  }

  async #saveProfileDirectly(profile: Profile) {
    const store = await this.#store("readwrite");
    await requestToPromise(store.put(profile));
  }

  #getInitCurrentUsername(): string | null {
    const sessionUsername = sessionStorage.getItem(KEY_CURRENT_USERNAME);
    if (sessionUsername) {
      return sessionUsername;
    }
    return null;
  }

  async #getPossibleOnlyUsername() {
    const profiles = await this.getProfileList();
    return profiles.length === 1 ? profiles[0] : null;
  }

  /**
   * @deprecated
   */
  #getLegacyProfileListSync(): (ProfileV1 | ProfileV2)[] {
    return Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)!)
      .map((key) => this.#getLegacyJSONSync(key))
      .filter((profile): profile is ProfileV1 | ProfileV2 => {
        return isValidProfileV1(profile) || isValidProfileV2(profile);
      });
  }

  /**
   * @deprecated
   */
  #removeLegacyProfilesSync(keys: string[]) {
    for (const key of keys) {
      localStorage.removeItem(key);
    }
  }

  #normalizeDate(date: number, now: number): number | null {
    if (!date) return null;
    for (let time = date; time < now; time *= 1e3) {
      if (time >= arcaeaReleaseTS) {
        return time;
      }
    }
    return null;
  }

  async #transaction(mode?: IDBTransactionMode) {
    const db = await this.database.getDB();
    return db.transaction([this.database.profiles], mode);
  }

  async #store(mode?: IDBTransactionMode) {
    const transaction = await this.#transaction(mode);
    return transaction.objectStore(this.database.profiles);
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
      const v1Data = await jsonModule(import("../data/chart-data-legacy-1.json"));
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
