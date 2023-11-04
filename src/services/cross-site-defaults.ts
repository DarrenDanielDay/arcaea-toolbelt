import { Injectable } from "classic-di";
import {
  $AssetsResolverStrategy,
  $PreferenceService,
  AssetsResolverStrategy,
  Preference,
  PreferenceService,
} from "./declarations";
import { Signal } from "hyplate/types";
import { signal } from "hyplate";

const defaultPreference: Preference = {
  ghproxy: false,
  theme: "light",
  showMaxMinus: false,
};

@Injectable({
  implements: $PreferenceService,
})
export class DefaultPreferenceService implements PreferenceService {
  async get(): Promise<Preference> {
    return defaultPreference;
  }

  signal<K extends keyof Preference>(name: K): Signal<Preference[K]> {
    return signal(defaultPreference[name]);
  }

  update(patch: Partial<Preference>): Promise<void> {
    throw new Error("Cannot update default preference.");
  }
}

@Injectable({
  implements: $AssetsResolverStrategy,
  requires: [$PreferenceService],
})
export class DefaultAssetsResolverStrategy implements AssetsResolverStrategy {
  base(): string {
    return "https://moyoez.github.io/ArcaeaResource-ActionUpdater/arcaea/assets/";
  }
  get usingProxy(): Signal<boolean> {
    throw new Error("Method not implemented.");
  }
  useProxy(proxy: boolean): void {
    throw new Error("Method not implemented.");
  }
}
