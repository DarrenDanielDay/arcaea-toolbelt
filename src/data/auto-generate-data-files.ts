import { getSongData } from "./get-wiki-chart-data";
import { getCharacterData } from "./get-wiki-character-data";
import { fetchWikiWorldMapData } from "./get-wiki-world-map-data";
import { SongData } from "../models/music-play";
import { PackList, SongList } from "./packed-data";
import { indexBy } from "../utils/collections";

export async function generate() {
  const projectRootDir = await window.showDirectoryPicker();
  const songList = await readJSON<SongList>(
    await getFileHandle(projectRootDir, `/arcaea/arcaea_${process.env.ARCAEA_VERSION}/assets/songs/songlist`)
  );
  const packList = await readJSON<PackList>(
    await getFileHandle(projectRootDir, `/arcaea/arcaea_${process.env.ARCAEA_VERSION}/assets/songs/packlist`)
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

function toJSONString(obj: any) {
  return JSON.stringify(obj, undefined, 2) + "\n";
}

async function saveJSON(root: FileSystemDirectoryHandle, json: any, path: string) {
  const file = await getFileHandle(root, path);
  await writeJSON(file, json);
}

async function getFileHandle(root: FileSystemDirectoryHandle, path: string) {
  const segments = path.split(/[\\\/]/).filter((s) => !!s);
  let dir = root;
  for (let i = 0, l = segments.length - 1; i < l; i++) {
    const segment = segments[i]!;
    dir = await dir.getDirectoryHandle(segment, { create: true });
  }
  const fileName = segments.at(-1)!;
  const file = await dir.getFileHandle(fileName, { create: true });
  return file;
}

async function writeText(file: FileSystemFileHandle, content: FileSystemWriteChunkType) {
  const stream = await file.createWritable({ keepExistingData: false });
  await stream.write(content);
  await stream.close();
}

async function writeJSON(file: FileSystemFileHandle, json: any) {
  await writeText(file, toJSONString(json));
}

async function readAsText(handle: FileSystemFileHandle) {
  const file = await handle.getFile();
  const content = await file.text();
  return content;
}

async function readJSON<T>(handle: FileSystemFileHandle): Promise<T> {
  const text = await readAsText(handle);
  return JSON.parse(text);
}

async function getOldChartData(dir: FileSystemDirectoryHandle) {
  const handle = await getFileHandle(dir, "/src/data/chart-data.json");
  const old: SongData[] = JSON.parse(await readAsText(handle));
  return old;
}

function mergeChartData(oldData: SongData[], newData: SongData[]) {
  const oldIndex = oldData.reduce<{ [songId: string]: SongData }>((index, item) => {
    index[item.sid] = item;
    return index;
  }, {});
  const newSongs: SongData[] = [];
  for (const item of newData) {
    const oldSong = oldIndex[item.sid];
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
  return songs.sort((a, b) => index[a.sid]!.idx - index[b.sid]!.idx);
}
