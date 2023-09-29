import { Chart, ChartOverride, Difficulty, SongData } from "../../models/music-play";
import { Indexed, indexBy } from "../../utils/collections";
import { PackList, SongList, Song, Pack } from "../packed-data";
import { Alias, ExtraSongData } from "./shared";

const getPackName = (packIndex: Indexed<Pack>, song: Song) => {
  const pack = packIndex[song.set];
  if (pack) {
    const segments: string[] = [];
    for (let p: Pack | undefined = pack; p; p = p.pack_parent ? packIndex[p.pack_parent] : undefined) {
      segments.push(p.name_localized.en);
    }
    return segments.reverse().join(" - ");
  }
  return "Memory Archive";
};

export function mergeIntoSongData(
  oldData: SongData[],
  songList: SongList,
  packList: PackList,
  extraData: ExtraSongData[],
  alias: Alias[]
): SongData[] {
  const oldIndex = indexBy(oldData, (song) => song.id);
  const packIndex = indexBy(packList.packs, (pack) => pack.id);
  const aliasIndex = indexBy(alias, (a) => a.id);
  const extraIndex = indexBy(extraData, (extra) => extra.id);
  const difficulties = Object.values(Difficulty);
  return songList.songs.map((song) => {
    const songId = song.id;
    const old = oldIndex[songId];
    const extra = extraIndex[songId];
    const charts: Chart[] = [];
    for (const difficulty of song.difficulties) {
      if (difficulty.hidden_until === "always") {
        // Last | Eternity PST/PRS/FTR
        continue;
      }
      const { ratingClass, rating, ratingPlus, jacketOverride, title_localized } = difficulty;
      const extraData = extra?.charts[ratingClass];
      const chart: Chart = {
        constant: extraData?.constant ?? -1,
        difficulty: difficulties[ratingClass]!,
        id: `${songId}@${difficulties[ratingClass]!}`,
        level: rating,
        note: extraData?.notes ?? -1,
        songId,
      };
      if (ratingPlus) {
        chart.plus = true;
      }
      const override: ChartOverride = {};
      if (jacketOverride) {
        override.cover = true;
      }
      if (title_localized) {
        override.name = title_localized.en;
      }
      if (Object.keys(override).length) {
        chart.override = override;
      }
      charts.push(chart);
    }
    const songData: SongData = {
      bpm: song.bpm,
      cover: old?.cover || "",
      id: songId,
      name: song.title_localized.en,
      pack: getPackName(packIndex, song),
      dl: !!song.remote_dl,
      alias: aliasIndex[songId]?.alias ?? [],
      charts,
    };
    return songData;
  });
}
