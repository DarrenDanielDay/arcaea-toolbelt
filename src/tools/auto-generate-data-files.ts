import { getSongData } from "./get-wiki-chart-data";
import { getCharacterData } from "./get-wiki-character-data";
import { fetchWikiWorldMapData } from "./get-wiki-world-map-data";
import { SongData } from "../models/music-play";
import { PackList, SongList } from "./packed-data";
import { indexBy } from "../utils/collections";
import {
  getProjectRootDirectory,
  saveJSON,
  patchJSON,
  CACHE_EXPIRE_TIME,
  miscDataClient,
  readProjectJSON,
  saveProjectJSON,
} from "./shared";
import { APKResponse, getLatestVersion } from "./get-latest-version";
import { ArcaeaToolbeltMeta } from "../models/misc";
import { AssetsResolverImpl } from "../services/assets-resolver";
import { getChartDataFromFandomWiki } from "./chart/fandom-wiki";
import { mergeIntoSongData } from "./chart/merge";
import { getAliasFromArcaeaInfinity } from "./chart/arcaea-infinity";
import { Alias, AssetsInfo, ExtraSongData, mergeArray } from "./chart/shared";
import { CharacterData } from "../models/character";
import { DefaultAssetsResolverStrategy } from "../services/cross-site-defaults";

const resolver = new AssetsResolverImpl(new DefaultAssetsResolverStrategy());

async function getSongList(): Promise<SongList> {
  const res = await miscDataClient.fetch(resolver.resolve(`songs/songlist`), CACHE_EXPIRE_TIME);
  return res.json();
}

async function getPackList(): Promise<PackList> {
  const res = await miscDataClient.fetch(resolver.resolve(`songs/packlist`), CACHE_EXPIRE_TIME);
  return res.json();
}

/** @deprecated */
export async function generate(version: string) {
  const songList = await getSongList();
  const packList = await getPackList();
  const newSongs = await getSongData(songList, packList);
  const oldSongs = await getOldChartData();
  const songs = sortChartDataBySongListIdx(mergeChartData(oldSongs, newSongs), songList);
  const { characters, items } = await getCharacterData();
  const { longterm, events } = await fetchWikiWorldMapData(songs, characters);
  await saveProjectJSON(songs, "/src/data/chart-data.json");
  await saveProjectJSON(characters, "/src/data/character-data.json");
  await saveProjectJSON(items, "/src/data/item-data.json");
  await saveProjectJSON(longterm, "/src/data/world-maps-longterm.json");
  await saveProjectJSON(events, "/src/data/world-maps-events.json");
  await patchMeta({
    time: Date.now(),
  });
}

export async function generateDirectly() {
  const apkInfo = await getLatestVersion();
  const songList = await getSongList();
  const packList = await getPackList();
  const newSongs = await getSongData(songList, packList);
  const oldSongs = await getOldChartData();
  const songs = sortChartDataBySongListIdx(mergeChartData(oldSongs, newSongs), songList);
  const { characters, items } = await getCharacterData();
  const { longterm, events } = await fetchWikiWorldMapData(songs, characters);
  await saveProjectJSON(songs, chartDataPath);
  await saveProjectJSON(characters, characterDataPath);
  await saveProjectJSON(items, itemDataPath);
  await saveProjectJSON(longterm, worldMapLongTermPath);
  await saveProjectJSON(events, worldMapEventsPath);
  await patchMeta({
    time: Date.now(),
    apk: apkInfo.url,
    version: apkInfo.version,
  });
}
const characterDataPath = "/src/data/character-data.json";
const itemDataPath = "/src/data/item-data.json";
const worldMapLongTermPath = "/src/data/world-maps-longterm.json";
const worldMapEventsPath = "/src/data/world-maps-events.json";
const extraDataPath = "/src/data/notes-and-constants.json";
const aliasPath = "/src/data/alias.json";
const assetsInfoPath = "/src/data/assets-info.json";
const chartDataPath = "/src/data/chart-data.json";

export async function updateNotesAndConstantsFileViaFandomWiki() {
  const projectRoot = await getProjectRootDirectory();
  const songList = await getSongList();
  const fandomWikiData = await getChartDataFromFandomWiki(songList);
  const old = await readProjectJSON<ExtraSongData[]>(extraDataPath);
  await saveJSON(
    projectRoot,
    mergeArray(
      old,
      fandomWikiData,
      (d) => d.id,
      (old) => {
        // Fandom Wiki 有很多数据有误，暂时只添加新数据
        return old;
      }
    ),
    extraDataPath
  );
}

export async function generateCharacterData() {
  const { characters, items } = await getCharacterData();
  await saveProjectJSON(characters, characterDataPath);
  await saveProjectJSON(items, itemDataPath);
}

export async function generateAlias() {
  const oldAlias = await readProjectJSON<Alias[]>(aliasPath);
  const latestAlias = await getAliasFromArcaeaInfinity();
  const newAlias = mergeArray(
    oldAlias,
    latestAlias,
    (a) => a.id,
    (a, b) => ({
      id: a.id,
      alias: [...new Set([...a.alias, ...b.alias])],
    })
  );
  await saveProjectJSON(newAlias, aliasPath);
}

export async function generateMergedChartData() {
  const old = await getOldChartData();
  const songList = await getSongList();
  const packList = await getPackList();
  const extraData = await readProjectJSON<ExtraSongData[]>(extraDataPath);
  const alias = await readProjectJSON<Alias[]>(aliasPath);
  const assetsInfo = await readProjectJSON<AssetsInfo[]>(assetsInfoPath);
  const newData = mergeIntoSongData(old, songList, packList, extraData, alias, assetsInfo);
  await saveProjectJSON(sortChartDataBySongListIdx(newData, songList), chartDataPath);
}

export async function generateWorldMapData() {
  const songs = await readProjectJSON<SongData[]>(chartDataPath);
  const characters = await readProjectJSON<CharacterData[]>(characterDataPath);
  const { longterm, events } = await fetchWikiWorldMapData(songs, characters);
  await saveProjectJSON(longterm, worldMapLongTermPath);
  await saveProjectJSON(events, worldMapEventsPath);
}

export async function generateVersionMeta(apkInfo: APKResponse) {
  await patchMeta({
    version: apkInfo.version,
    apk: apkInfo.url,
  });
}

async function patchMeta(meta: Partial<ArcaeaToolbeltMeta>) {
  meta.time ??= Date.now();
  await patchJSON(await getProjectRootDirectory(), meta, "/src/data/meta.json");
}

async function getOldChartData() {
  const old: SongData[] = await readProjectJSON(chartDataPath);
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
