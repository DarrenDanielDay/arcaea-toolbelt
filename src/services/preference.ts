import { Injectable } from "classic-di";
import { $PreferenceService, Preference, PreferenceService } from "./declarations";
import type { Signal } from "hyplate/types";
import { computed, signal } from "hyplate";
import { clone } from "../utils/misc";

const defaultPreference: Preference = {
  // 默认跟随系统的偏好主题
  theme: window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
};

type PreferenceKey = keyof Preference;

@Injectable({
  implements: $PreferenceService,
})
export class PreferenceServiceImpl implements PreferenceService {
  #preference = signal<Preference>(clone(defaultPreference));
  #computed: { [K in PreferenceKey]?: Signal<Preference[K]> } = {};
  #preferenceKey = "PREFERENCE";
  constructor() {
    this.#notify();
  }

  async get(): Promise<Preference> {
    // Store in session temporarily.
    return {
      ...defaultPreference,
      ...JSON.parse(sessionStorage.getItem(this.#preferenceKey) || "{}"),
    };
  }

  async update(patch: Partial<Preference>): Promise<void> {
    const current = await this.get();
    sessionStorage.setItem(
      this.#preferenceKey,
      JSON.stringify({
        ...current,
        ...patch,
      })
    );
    await this.#notify();
  }

  signal<K extends keyof Preference>(name: K): Signal<Preference[K]> {
    const signal = (this.#computed[name] ??= computed(() => this.#preference()[name]));
    return signal;
  }

  async #notify() {
    this.#preference.set(await this.get());
  }
}
