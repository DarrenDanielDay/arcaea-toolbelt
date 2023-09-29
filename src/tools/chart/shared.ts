import { indexBy } from "../../utils/collections";
import { Song } from "../packed-data";

export interface ExtraSongData {
  id: string;
  // lasteternity会有null
  charts: (null | ChartNotesAndConstant)[];
}

export interface ChartNotesAndConstant {
  notes: number;
  constant: number;
}

export interface Alias {
  id: string;
  alias: string[];
}

export interface AssetsInfo {
  id: string;
  covers: string[];
}

export function matchDuplicatedName(songs: Song[], difficulties: (string | null)[]): Song | null {
  if (songs.length === 1) return songs[0]!;
  const song = songs.find((s) => {
    return s.difficulties.every((chart, i) => {
      const levelText = difficulties[i];
      if (!levelText) return false;
      const level = parseInt(levelText);
      return chart.rating === level && !!chart.ratingPlus === levelText.includes("+");
    });
  });
  return song || null;
}

export function mergeArray<T>(
  oldData: T[],
  newData: T[],
  identity: (item: T) => string | number,
  merge: (oldOne: T, newOne: T) => T
): T[] {
  const index = indexBy(oldData, identity);
  for (const newOne of newData) {
    const id = identity(newOne);
    const oldOne = index[id];
    if (oldOne) {
      index[id] = merge(oldOne, newOne);
    } else {
      index[id] = newOne;
    }
  }
  return Object.values(index);
}

export function getLastNotesAndConstantsData(): ExtraSongData[] {
  // 过于特殊，直接硬编码
  return [
    {
      id: "last",
      charts: [
        {
          constant: 4.0,
          notes: 680,
        },
        {
          constant: 7.0,
          notes: 781,
        },
        {
          constant: 9.0,
          notes: 831,
        },
        {
          constant: 9.6,
          notes: 888,
        },
      ],
    },
    {
      id: "lasteternity",
      charts: [
        null,
        null,
        null,
        {
          constant: 9.7,
          notes: 790,
        },
      ],
    },
  ];
}
