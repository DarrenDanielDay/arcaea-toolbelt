import { Injectable } from "classic-di";
import { protocol } from "../models/data";
import { PromiseOr } from "../utils/misc";
import { $Gateway, $PreferenceService, Gateway, PreferenceService } from "./declarations";
import { subscribe } from "hyplate";

const assetsBase = "https://moyoez.github.io/ArcaeaResource-ActionUpdater/arcaea/assets/";
const assetsProxyBase =
  "https://mirror.ghproxy.com/raw.githubusercontent.com/MoYoez/ArcaeaResource-ActionUpdater/main/arcaea/assets/";
const dataProxyBase =
  "https://mirror.ghproxy.com/raw.githubusercontent.com/DarrenDanielDay/arcaea-toolbelt-data/main/src/data/";

type ProxyMapping = Record<string, string>;

const directGateway = {
  "//assets/": assetsBase,
  "//data/": process.env.ARCAEA_TOOLBELT_DATA,
};
const proxyGateway: ProxyMapping = {
  "//assets/": assetsProxyBase,
  "//data/": dataProxyBase,
};

@Injectable({
  implements: $Gateway,
})
export class DirectGateway implements Gateway {
  direct(url: URL): URL {
    return this.map(url, directGateway);
  }

  proxy(url: URL): URL {
    return this.map(url, proxyGateway);
  }

  dynamicProxy(url: URL): PromiseOr<URL> {
    return this.map(url, directGateway);
  }

  protected map(url: URL, mapping: ProxyMapping): URL {
    if (url.protocol === protocol) {
      return this.proxyCustomProtocol(url, mapping);
    }
    return url;
  }

  protected proxyCustomProtocol(url: URL, mapping: ProxyMapping) {
    const { pathname } = url;
    const pair = Object.entries(mapping).find(([key]) => pathname.startsWith(key));
    if (pair) {
      const [prefix, base] = pair;
      return new URL(pathname.slice(prefix.length), base);
    }
    throw new Error(`Unknown path: ${pathname}`);
  }
}

@Injectable({
  implements: $Gateway,
  requires: [$PreferenceService],
})
export class ProxyGateway extends DirectGateway {
  protected ghproxy = false;

  constructor(private readonly preference: PreferenceService) {
    super();
    subscribe(preference.signal("ghproxy"), (value) => {
      this.ghproxy = value;
    });
  }

  override proxy(url: URL): URL {
    return this.map(url, this.ghproxy ? proxyGateway : directGateway);
  }

  override async dynamicProxy(url: URL): Promise<URL> {
    const { ghproxy } = await this.preference.get();
    this.ghproxy = ghproxy;
    return this.proxy(url);
  }
}
