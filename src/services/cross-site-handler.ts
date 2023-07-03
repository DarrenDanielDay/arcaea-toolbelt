import { ChartServiceImpl } from "./chart-data";
import { MusicPlayServiceImpl } from "./music-play";
import { ProfileServiceImpl } from "./player-profile";

const profile = new ProfileServiceImpl(new MusicPlayServiceImpl(), new ChartServiceImpl());

window.addEventListener("message", async (e) => {
  const parent = window.parent;
  const data = e.data;
  const type = data.type;
  const payload = data.payload;
  const handle = async (as: () => Promise<void> | void) => {
    try {
      await as();
      parent.postMessage({ type: `${type}-success` }, "*");
    } catch (error) {
      parent.postMessage(
        { type: `${type}-error`, error: error instanceof Error ? error.message : JSON.stringify(error) },
        "*"
      );
    }
  };
  switch (type) {
    case "sync-profiles":
      await handle(() => profile.syncProfiles(payload));
      break;
    case "sync-me":
      await handle(() => profile.syncProfiles([payload]));
      break;
    default:
      break;
  }
});
