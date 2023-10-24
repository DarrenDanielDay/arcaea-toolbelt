import { Injectable } from "classic-di";
import { $AssetsService, AssetsService } from "./declarations";
import { PromiseOr, isString } from "../utils/misc";

@Injectable({
  implements: $AssetsService,
})
export class PluginAssetsServiceImpl implements AssetsService {
  getAssets(url: string | URL): PromiseOr<string> {
    return isString(url) ? url : url.href;
  }

  async cacheUsage(): Promise<number> {
    return 0;
  }

  async clearCache(): Promise<void> {
  }
}
