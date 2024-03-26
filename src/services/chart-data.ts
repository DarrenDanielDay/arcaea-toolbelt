import { Chart, Song, SongData, SongIndex, compareRating, difficulties } from "../models/music-play";
import { searchMatch } from "../utils/string";
import {
  $ChartService,
  ChartService,
  ChartDifficultyStatistics,
  SearchResult,
  ChartStatistics,
  $AssetsResolver,
  AssetsResolver,
  CoreDataService,
  $CoreDataService,
  Gateway,
  $Gateway,
} from "./declarations";
import { indexBy } from "../utils/collections";
import { Injectable } from "classic-di";

const FREE_PACKS = [
  "Arcaea", // 基础包
  "Extend Archive 1",
  "Extend Archive 2",
  "World Extend 3",
];

@Injectable({
  requires: [$AssetsResolver, $Gateway, $CoreDataService] as const,
  implements: $ChartService,
})
export class ChartServiceImpl implements ChartService {
  freePacks = FREE_PACKS;

  #songIndex: SongIndex | null = null;

  constructor(
    private resolver: AssetsResolver,
    private readonly gateway: Gateway,
    private readonly core: CoreDataService
  ) {}

  getSongData(): Promise<SongData[]> {
    return this.core.getChartData();
  }

  async getSongIndex(): Promise<SongIndex> {
    return (this.#songIndex ??= await this.#initSongIndex());
  }

  async getStatistics(): Promise<ChartStatistics> {
    const songs = await this.getSongData();
    const statistics: ChartDifficultyStatistics = difficulties.reduce<ChartDifficultyStatistics>((map, difficulty) => {
      map[difficulty] = { count: 0, notes: 0 };
      return map;
    }, {} as ChartDifficultyStatistics);
    let maximumConstant = -Infinity,
      minimumConstant = Infinity;
    const levels = new Map<number, Set<boolean>>();
    for (const song of songs) {
      for (const chart of song.charts) {
        const { level, plus } = chart;
        levels.set(level, (levels.get(level) ?? new Set()).add(!!plus));
        const stat = statistics[chart.difficulty];
        stat.count++;
        stat.notes += chart.note;
        maximumConstant = Math.max(maximumConstant, chart.constant);
        minimumConstant = Math.min(minimumConstant, chart.constant);
      }
    }
    return {
      difficulties: statistics,
      ratings: [...levels]
        .flatMap(([level, plusSet]) => [...plusSet].map((plus) => ({ level, plus })))
        .sort(compareRating),
      maximumConstant,
      minimumConstant,
    };
  }

  async searchChart(searchText: string): Promise<SearchResult[]> {
    if (!searchText) {
      return [];
    }
    const songs = await this.getSongData();
    const matches: SearchResult[] = [];
    for (const song of songs) {
      for (const chart of song.charts) {
        candidateMatch: for (const candidate of [song.name, chart.id, chart.override?.name ?? "", ...song.alias]) {
          const match = searchMatch(searchText, candidate);
          if (match != null) {
            matches.push({
              song,
              bpm: this.getBPM(chart, song),
              constant: chart.constant,
              cover: this.getCover(chart, song),
              difficulty: chart.difficulty,
              sort: match,
              chart,
              title: this.getName(chart, song),
            });
            break candidateMatch;
          }
        }
      }
    }
    return matches.sort((a, b) => {
      if (a.sort !== b.sort) {
        return a.sort - b.sort;
      }
      return difficulties.indexOf(b.difficulty) - difficulties.indexOf(a.difficulty);
    });
  }
  async queryChartsByConstant(min: number, max: number): Promise<SearchResult[]> {
    const songs = await this.getSongData();
    const min10 = Math.round(min * 10);
    const max10 = Math.round(max * 10);
    const items = songs
      .flatMap((s) => s.charts.map((c) => ({ song: s, chart: c })))
      .sort((a, b) => a.chart.constant - b.chart.constant)
      .filter((x) => {
        const c = Math.round(x.chart.constant * 10);
        return min10 <= c && c <= max10;
      });
    return items.map((item) => ({
      song: item.song,
      bpm: this.getBPM(item.chart, item.song),
      chart: item.chart,
      constant: item.chart.constant,
      cover: this.getCover(item.chart, item.song),
      difficulty: item.chart.difficulty,
      sort: 0,
      title: this.getName(item.chart, item.song),
    }));
  }

  async roll(min: number, max: number): Promise<SearchResult | null> {
    const results = await this.queryChartsByConstant(min, max);
    if (!results.length) {
      return null;
    }
    return results.at(Math.floor(Math.random() * results.length)) ?? null;
  }

  getName(chart: Chart, song: Song): string {
    return chart.override?.name ?? song.name;
  }

  getBPM(chart: Chart, song: Song): string {
    return chart.override?.bpm ?? song.bpm;
  }

  getCover(chart: Chart, song: Song): string {
    return this.gateway.proxy(this.resolver.resolveCover(chart, song, true)).toString();
  }

  async #initSongIndex() {
    const songs = await this.getSongData();
    return indexBy(songs, (s) => s.id);
  }
}
