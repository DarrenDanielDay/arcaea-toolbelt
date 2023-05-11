import { Chart, Difficulty, ScoreResult, SongData } from "../models/music-play";
import { searchMatch } from "../utils/string";
import { ChartService, SearchResult } from "./declarations";
import staticData from "../data/chart-data.json";
// @ts-expect-error string as enum
const getStaticSongData = async (): Promise<SongData[]> => staticData;

// 对于同个名称匹配系数，按照ftr，byd，prs，pst排序
const difficultyOrder = [Difficulty.Future, Difficulty.Beyond, Difficulty.Present, Difficulty.Past];
export class ChartServiceImpl implements ChartService {
  getSongData(): Promise<SongData[]> {
    return getStaticSongData();
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
}

// const names = [
//   "Clotho and",
//   "Dement",
//   "Infinity Heaven",
//   "Suomi",
//   "Rise",
//   "Fairytale",
//   "Brand new",
//   "Vexaria",
//   "Sayonara",
//   "inkar-usi",
//   'world.exec',
//   'Diode',

// ];

// const songs = staticData.filter((s) => names.some((n) => s.name.startsWith(n)));
// const charts = songs.flatMap((song) => song.charts.filter(c=> c.difficulty !== 'byd')).sort((a, b) => b.constant - a.constant);
// function sum<T>(arr: T[], selector: (item: T) => number) {
//   return arr.reduce((s, i) => s + selector(i), 0);
// }
// console.log((sum(charts.slice(0, 30), (x) => x.constant) + sum(charts.slice(0, 10), (x) => x.constant) + 40 * 2)/ 40);
