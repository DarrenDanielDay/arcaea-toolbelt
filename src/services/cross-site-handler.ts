import { ChartServiceImpl } from "./chart-data";
import { MusicPlayServiceImpl } from "./music-play";
import { ProfileServiceImpl } from "./player-profile";

const profile = new ProfileServiceImpl(new MusicPlayServiceImpl(), new ChartServiceImpl());

window.addEventListener("message", async (e) => {
  const parent = window.parent;
  const data = e.data;
  switch (data.type) {
    case "sync-profiles":
      if (Array.isArray(data.payload)) {
        try {
          await profile.syncProfiles(data.payload);
          parent.postMessage({ type: "sync-success" }, "*");
        } catch (error) {
          parent.postMessage(
            {
              type: "sync-profile-error",
              error: error instanceof Error ? error.message : JSON.stringify(error),
            },
            "*"
          );
        }
      }
      break;
    default:
      break;
  }
});
