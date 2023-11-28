import "classic-di/polyfill";
import { ChartServiceImpl } from "./chart-data";
import { AssetsResolverImpl } from "./assets-resolver";
import { ArcaeaToolbeltDatabaseContext } from "./database";
import { CrossSiteMessageData } from "./cross-site-protocol";
import { alert } from "../view/components/fancy-dialog";
import { noop } from "hyplate";
import { CoreDataServiceImpl } from "./core-data";
import { CoreDataProviderImpl } from "./core-data-provider";
import { ProxyGateway } from "./gateway";
import { PreferenceServiceImpl } from "./preference";
import { Container } from "classic-di";
import { $ProfileService } from "./declarations";
import { ProfileServiceImpl } from "./player-profile";

const container = new Container();
container.register(ArcaeaToolbeltDatabaseContext);
container.register(ChartServiceImpl);
container.register(AssetsResolverImpl);
container.register(CoreDataServiceImpl);
container.register(CoreDataProviderImpl);
container.register(ProxyGateway);
container.register(PreferenceServiceImpl);
container.register(ProfileServiceImpl);

const profile = container.get($ProfileService);
//#region Legacy <iframe>
/* localStorage和indexedDB均被标记为“第三方”，因为顶级网站不同源。目前此实现已无法工作。
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
*/
//#endregion

const isValidCrossSiteMessage = (data: unknown): data is CrossSiteMessageData => {
  return data != null && typeof data === "object" && "type" in data && "payload" in data;
};

/**
 * 新实现，直接通过`URL#hash`传参，相比而言多了个弹窗
 */
const handleURL = async () => {
  const url = new URL(location.href);
  const message = JSON.parse(atob(url.hash.slice(1)));
  const postMessage =
    typeof window.opener?.postMessage === "function"
      ? (msg: any) => {
          window.opener.postMessage(msg, "*");
        }
      : noop;
  if (isValidCrossSiteMessage(message)) {
    const { type, payload } = message;
    const handle = async (as: () => Promise<void> | void, msg: string) => {
      try {
        await as();
        postMessage({ type: `${type}-success` });
        closeWith(msg);
      } catch (error) {
        postMessage({ type: `${type}-error`, error: error instanceof Error ? error.message : JSON.stringify(error) });
      }
    };
    switch (type) {
      case "sync-profiles":
        await handle(() => profile.syncProfiles(payload), "导入存档成功");
        break;
      case "sync-me":
        await handle(() => profile.syncProfiles([payload]), `${payload.username}存档数据同步成功`);
        break;
      default:
        break;
    }
  } else {
    closeWith("地址格式不正确。");
  }
};

const closeWith = (msg: string) => {
  alert(`${msg}。可关闭本窗口，5秒后将自动关闭。`);
  setTimeout(() => {
    window.close();
  }, 5000);
};

handleURL();
