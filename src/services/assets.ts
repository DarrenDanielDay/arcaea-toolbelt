import { Injectable } from "classic-di";
import {
  $AssetsCacheService,
  $AssetsService,
  $Gateway,
  AssetsCacheService,
  AssetsService,
  Gateway,
} from "./declarations";

@Injectable({
  requires: [$Gateway, $AssetsCacheService] as const,
  implements: $AssetsService,
})
export class AssetsServiceImpl implements AssetsService {
  constructor(private readonly gateway: Gateway, private readonly cache: AssetsCacheService) {}

  async getAssets(url: URL, init?: RequestInit): Promise<string> {
    const dist = await this.gateway.dynamicProxy(url);
    const distUrl = await this.cache.cachedGet(dist, init);
    return distUrl;
  }
}
