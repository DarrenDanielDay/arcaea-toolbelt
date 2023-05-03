import { SongData } from "../models/music-play";
import { searchMatch } from "../utils/string";
import { ChartService, SearchResult } from "./declarations";

// @ts-expect-error string as enum
const getStaticSongData = (): Promise<SongData[]> => import("../data/chart-data.json");

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
        candidateMatch: for (const candidate of [song.name, chart.id, chart.byd?.song ?? ""]) {
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
    return matches.sort((a, b) => a.sort - b.sort);
  }
}
