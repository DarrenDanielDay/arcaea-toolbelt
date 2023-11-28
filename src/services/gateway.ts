import { Injectable } from "classic-di";
import { protocol } from "../models/data";
import { PromiseOr } from "../utils/misc";
import { $Gateway, $PreferenceService, Gateway, PreferenceService } from "./declarations";

const assetsBase = "https://moyoez.github.io/ArcaeaResource-ActionUpdater/arcaea/assets/";
const assetsProxyBase =
  "https://mirror.ghproxy.com/raw.githubusercontent.com/MoYoez/ArcaeaResource-ActionUpdater/main/arcaea/assets/";
const dataProxyBase =
  "https://mirror.ghproxy.com/raw.githubusercontent.com/DarrenDanielDay/arcaea-toolbelt/main/src/data/";

type ProxyMapping = Record<string, string>;

@Injectable({
  implements: $Gateway,
})
export class DirectGateway implements Gateway {
  readonly #direct = {
    "//assets/": assetsBase,
    "//data/": process.env.ARCAEA_TOOLBELT_DATA,
  };

  direct(url: URL): URL {
    return this.proxyByMapping(url.pathname, this.#direct);
  }

  proxyPass(url: URL): PromiseOr<URL> {
    if (url.protocol === protocol) {
      return this.proxyCustomProtocol(url);
    }
    return url;
  }

  protected proxyCustomProtocol(url: URL) {
    return this.proxyByMapping(url.pathname, this.getPrefixMapping());
  }

  protected proxyByMapping(pathname: string, mapping: ProxyMapping) {
    const pair = Object.entries(mapping).find(([key]) => pathname.startsWith(key));
    if (pair) {
      const [prefix, base] = pair;
      return new URL(pathname.slice(prefix.length), base);
    }
    throw new Error(`Unknown path: ${pathname}`);
  }

  protected getPrefixMapping(): ProxyMapping {
    return this.#direct;
  }
}

@Injectable({
  implements: $Gateway,
  requires: [$PreferenceService],
})
export class ProxyGateway extends DirectGateway {
  #proxyMapping: ProxyMapping = {
    "//assets/": assetsProxyBase,
    "//data/": dataProxyBase,
  };
  protected ghproxy = false;

  constructor(private readonly preference: PreferenceService) {
    super();
  }

  override async proxyPass(url: URL): Promise<URL> {
    const { ghproxy } = await this.preference.get();
    this.ghproxy = ghproxy;
    return super.proxyPass(url);
  }

  protected override getPrefixMapping(): ProxyMapping {
    const mapping = super.getPrefixMapping();
    if (this.ghproxy) {
      return {
        ...mapping,
        ...this.#proxyMapping,
      };
    }
    return mapping;
  }
}
