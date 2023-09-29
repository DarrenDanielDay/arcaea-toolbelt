import { CACHE_EXPIRE_TIME, miscDataClient } from "../shared";
import { Alias } from "./shared";

const ArcaeaInfinitySongDataURL =
  "https://ghproxy.com/raw.githubusercontent.com/Arcaea-Infinity/ArcaeaSongDatabase/main/arcsong.json";

type ArcInfChartData = {
  name_en: string;
  /**
   * 曲包名
   */
  set_friendly: string;
  /**
   * 定数的十倍
   */
  rating: number;
};

type ArcInfSongData = {
  song_id: string;
  alias: string[];
  difficulties: ArcInfChartData[];
};

export async function getAliasFromArcaeaInfinity(): Promise<Alias[]> {
  // 停更，故永久缓存
  const res = await miscDataClient.fetch(ArcaeaInfinitySongDataURL);
  const data: ArcInfSongData[] = (await res.json()).songs;
  return data.map((song) => ({
    id: song.song_id,
    alias: song.alias,
  }));
}
