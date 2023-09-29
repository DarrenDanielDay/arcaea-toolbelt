import { Chart, Difficulty, Song, SongData, SongIndex } from "../models/music-play";
import { searchMatch } from "../utils/string";
import {
  $ChartService,
  ChartService,
  ChartDifficultyStatistics,
  SearchResult,
  ChartStatistics,
  $AssetsResolver,
  AssetsResolver,
} from "./declarations";
import { indexBy } from "../utils/collections";
import { Injectable } from "classic-di";
// @ts-expect-error string as enum
const getStaticSongData = async (): Promise<SongData[]> => import("../data/chart-data.json");

// 对于同个名称匹配系数，按照ftr，byd，prs，pst排序
const difficultyOrder = [Difficulty.Future, Difficulty.Beyond, Difficulty.Present, Difficulty.Past];

@Injectable({
  requires: [$AssetsResolver] as const,
  implements: $ChartService,
})
export class ChartServiceImpl implements ChartService {
  #songIndex: SongIndex | null = null;

  constructor(private resolver: AssetsResolver) {}

  getSongData(): Promise<SongData[]> {
    return getStaticSongData();
  }

  async getSongIndex(): Promise<SongIndex> {
    return (this.#songIndex ??= await this.#initSongIndex());
  }

  async getStatistics(): Promise<ChartStatistics> {
    const songs = await this.getSongData();
    const statistics: ChartDifficultyStatistics = [
      Difficulty.Past,
      Difficulty.Present,
      Difficulty.Future,
      Difficulty.Beyond,
    ].reduce<ChartDifficultyStatistics>((map, difficulty) => {
      map[difficulty] = { count: 0, notes: 0 };
      return map;
    }, {} as ChartDifficultyStatistics);
    let maximumConstant = -Infinity,
      minimumConstant = Infinity;
    for (const song of songs) {
      for (const chart of song.charts) {
        const stat = statistics[chart.difficulty];
        stat.count++;
        stat.notes += chart.note;
        maximumConstant = Math.max(maximumConstant, chart.constant);
        minimumConstant = Math.min(minimumConstant, chart.constant);
      }
    }
    return {
      difficulties: statistics,
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
      return difficultyOrder.indexOf(a.difficulty) - difficultyOrder.indexOf(b.difficulty);
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

  getCover(chart: Chart, song: Song): string {
    return this.resolver.resolveCover(chart, song, true).toString();
  }

  async #initSongIndex() {
    const songs = await this.getSongData();
    return indexBy(songs, (s) => s.id);
  }
}
