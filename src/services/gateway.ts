import { Injectable } from "classic-di";
import { protocol } from "../models/data";
import { PromiseOr } from "../utils/misc";
import { $Gateway, $PreferenceService, Gateway, PreferenceService } from "./declarations";
import { subscribe } from "hyplate";

const assetsBase = process.env.ASSETS_VENDOR;
const assetsProxyBase = process.env.ASSETS_VENDOR_PROXY;
const dataProxyBase =
  process.env.NODE_ENV === "production"
    ? "https://mirror.ghproxy.com/raw.githubusercontent.com/DarrenDanielDay/arcaea-toolbelt-data/main/src/data/"
    : process.env.ARCAEA_TOOLBELT_DATA;

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
    const pathname = url.toString().slice(protocol.length);
    const pair = Object.entries(mapping).find(([key]) => pathname.startsWith(key));
    if (pair) {
      const [prefix, base] = pair;
      const baseURL = base.startsWith("/") ? new URL(base, process.env.BASE_URI) : base;
      return new URL(pathname.slice(prefix.length), baseURL);
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
