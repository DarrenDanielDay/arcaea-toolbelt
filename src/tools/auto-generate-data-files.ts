import { getSongData } from "./get-wiki-chart-data";
import { getCharacterData } from "./get-wiki-character-data";
import { fetchWikiWorldMapData } from "./get-wiki-world-map-data";
import { SongData } from "../models/music-play";
import { PackList, SongList } from "./packed-data";
import { indexBy } from "../utils/collections";
import { getProjectRootDirectory, readJSON, getFileHandle, saveJSON, readAsText, extractName } from "./shared";

export async function generate(version: string) {
  const projectRootDir = await getProjectRootDirectory();
  const songList = await readJSON<SongList>(
    await getFileHandle(projectRootDir, `/arcaea/${extractName(version)}/assets/songs/songlist`)
  );
  const packList = await readJSON<PackList>(
    await getFileHandle(projectRootDir, `/arcaea/${extractName(version)}/assets/songs/packlist`)
  );
  const newSongs = await getSongData(songList, packList);
  const oldSongs = await getOldChartData(projectRootDir);
  const songs = sortChartDataBySongListIdx(mergeChartData(oldSongs, newSongs), songList);
  const { characters, items } = await getCharacterData();
  const { longterm, events } = await fetchWikiWorldMapData(songs, characters);
  await saveJSON(projectRootDir, songs, "/src/data/chart-data.json");
  await saveJSON(projectRootDir, characters, "/src/data/character-data.json");
  await saveJSON(projectRootDir, items, "/src/data/item-data.json");
  await saveJSON(projectRootDir, longterm, "/src/data/world-maps-longterm.json");
  await saveJSON(projectRootDir, events, "/src/data/world-maps-events.json");
}

async function getOldChartData(dir: FileSystemDirectoryHandle) {
  const handle = await getFileHandle(dir, "/src/data/chart-data.json");
  const old: SongData[] = JSON.parse(await readAsText(handle));
  return old;
}

function mergeChartData(oldData: SongData[], newData: SongData[]) {
  const oldIndex = oldData.reduce<{ [songId: string]: SongData }>((index, item) => {
    index[item.id] = item;
    return index;
  }, {});
  const newSongs: SongData[] = [];
  for (const item of newData) {
    const oldSong = oldIndex[item.id];
    if (!oldSong) {
      console.log(`新曲目：${item.name}`);
      newSongs.push(item);
    } else {
      // 合并alias
      newSongs.push({
        ...item,
        alias: [...new Set([...oldSong.alias, ...item.alias])],
      });
    }
  }
  return newSongs;
}

function sortChartDataBySongListIdx(songs: SongData[], songList: SongList) {
  const index = indexBy(songList.songs, (s) => s.id);
  return songs.sort((a, b) => index[a.id]!.idx - index[b.id]!.idx);
}
