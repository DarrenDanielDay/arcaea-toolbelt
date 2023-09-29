// @ts-check
import { readFile, readdir, writeFile } from "fs/promises";
import { join } from "path";
import meta from "../src/data/meta.json" assert { type: "json" };

const version = meta.version;
const extractName = `arcaea_${version}`;

/**
 * @param {string} path
 */
function assets(path) {
  return join(`arcaea/${extractName}/assets`, path);
}

async function main() {
  /** @type {import('../src/tools/packed-data').SongList} */
  const songList = JSON.parse(await readFile(assets("songs/songlist"), { encoding: "utf-8" }));

  /**
   * @param {import('../src/tools/packed-data').Song} song
   * @returns {Promise<import('../src/tools/chart/assets').AssetsInfo>}
   */
  async function getSongAssets(song) {
    const folder = song.remote_dl ? `dl_${song.id}` : song.id;
    const children = await readdir(assets(`songs/${folder}`));
    return {
      id: song.id,
      covers: children.filter((file) => file.endsWith(".jpg")),
    };
  }
  /** @type {import('../src/tools/chart/assets').AssetsInfo[]} */
  const assetsInfo = await Promise.all(songList.songs.map(getSongAssets));
  await writeFile("src/data/assets-info.json", JSON.stringify(assetsInfo, undefined, 2));
  console.log(
    assetsInfo.filter((a) => {
      // 用于测试对应的*_256.jpg是否一定有
      for (const cover of a.covers) {
        if (cover.match(/^(1080_)(base|0|1|2|3)\.jpg$/)) {
          if (!a.covers.includes(cover.replace(".jpg", "_256.jpg"))) {
            return true;
          }
        }
      }
      return false;
    })
  );
}

main();
