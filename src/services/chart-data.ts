import { Difficulty, SongData } from "../models/music-play";
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
}
