import { Injectable } from "classic-di";
import { $AssetsService, AssetsService } from "./declarations";
import { PromiseOr, isString } from "../utils/misc";
import { DirectGateway } from "./gateway";

@Injectable({
  implements: $AssetsService,
})
export class PluginAssetsServiceImpl implements AssetsService {
  getAssets(url: URL): PromiseOr<string> {
    return new DirectGateway().dynamicProxy(url).toString();
  }
}
