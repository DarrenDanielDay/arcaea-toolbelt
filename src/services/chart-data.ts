import { Difficulty, SongData, SongIndex } from "../models/music-play";
import { searchMatch } from "../utils/string";
import { $ChartService, ChartService, ChartStatistics, SearchResult } from "./declarations";
import staticData from "../data/chart-data.json";
import { indexBy } from "../utils/collections";
import { Injectable } from "classic-di";
// @ts-expect-error string as enum
const getStaticSongData = async (): Promise<SongData[]> => staticData;

// 对于同个名称匹配系数，按照ftr，byd，prs，pst排序
const difficultyOrder = [Difficulty.Future, Difficulty.Beyond, Difficulty.Present, Difficulty.Past];
const constants = staticData.flatMap((s) => s.charts.map((c) => c.constant));
const maxs = [...constants].sort((a, b) => b - a).slice(0, 30);
const maxptt = maxs.concat(maxs.slice(0, 10)).reduce((sum, curr) => sum + curr + 2, 0) / 40;

@Injectable({
  implements: $ChartService,
})
export class ChartServiceImpl implements ChartService {
  maximumConstant = constants.reduce((max, curr) => Math.max(max, curr), -Infinity);
  minimumConstant = constants.reduce((min, curr) => Math.min(min, curr), Infinity);
  maximumPotential = maxptt;
  #songIndex: SongIndex | null = null;
  getSongData(): Promise<SongData[]> {
    return getStaticSongData();
  }

  async getSongIndex(): Promise<SongIndex> {
    return (this.#songIndex ??= await this.initSongIndex());
  }

  async getStatistics(): Promise<ChartStatistics> {
    const songs = await this.getSongData();
    const statistics: ChartStatistics = [
      Difficulty.Past,
      Difficulty.Present,
      Difficulty.Future,
      Difficulty.Beyond,
    ].reduce<ChartStatistics>((map, difficulty) => {
      map[difficulty] = { count: 0, notes: 0 };
      return map;
    }, {} as ChartStatistics);
    for (const song of songs) {
      for (const chart of song.charts) {
        const stat = statistics[chart.difficulty];
        stat.count++;
        stat.notes += chart.note;
      }
    }
    return statistics;
  }

  async searchChart(searchText: string): Promise<SearchResult[]> {
    if (!searchText) {
      return [];
    }
    const songs = await this.getSongData();
    const matches: SearchResult[] = [];
    for (const song of songs) {
      for (const chart of song.charts) {
        candidateMatch: for (const candidate of [song.name, chart.id, chart.byd?.song ?? "", ...song.alias]) {
          const match = searchMatch(searchText, candidate);
          if (match != null) {
            matches.push({
              song,
              constant: chart.constant,
              cover: chart.byd?.cover ?? song.cover,
              difficulty: chart.difficulty,
              sort: match,
              chart,
              title: chart.byd?.song ?? song.name,
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
      cover: item.chart.byd?.cover ?? item.song.cover,
      difficulty: item.chart.difficulty,
      sort: 0,
      title: item.chart.byd?.song ?? item.song.name,
    }));
  }

  async roll(min: number, max: number): Promise<SearchResult | null> {
    const results = await this.queryChartsByConstant(min, max);
    if (!results.length) {
      return null;
    }
    return results.at(Math.floor(Math.random() * results.length)) ?? null;
  }

  private async initSongIndex() {
    const songs = await this.getSongData();
    return indexBy(songs, (s) => s.id);
  }
}
