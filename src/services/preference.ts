import { Injectable } from "classic-di";
import { $PreferenceService, Preference, PreferenceService } from "./declarations";
import type { Signal } from "hyplate/types";
import { computed, signal } from "hyplate";
import { clone, once } from "../utils/misc";
import { openDB, requestToPromise, transactionToPromise } from "../utils/indexed-db";

const defaultPreference: Preference = {
  // 默认跟随系统的偏好主题
  theme: window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
};

interface PreferenceConfig {
  key: string;
  value: any;
}

const configStore = "configs";

type PreferenceKey = keyof Preference;

@Injectable({
  implements: $PreferenceService,
})
export class PreferenceServiceImpl implements PreferenceService {
  #preference = signal<Preference>(clone(defaultPreference));
  #computed: { [K in PreferenceKey]?: Signal<Preference[K]> } = {};
  #getDB = once(() => this.#openDB());
  constructor() {
    this.get().then((latest) => this.#notify(latest));
  }

  async get(): Promise<Preference> {
    const db = await this.#getDB();
    const stored =
      (await requestToPromise<PreferenceConfig[]>(db.transaction([configStore]).objectStore(configStore).getAll())) ??
      [];
    const partialConfig = Object.fromEntries(stored.map(({ key, value }) => [key, value]));
    return {
      ...defaultPreference,
      ...partialConfig,
    };
  }

  async update(patch: Partial<Preference>): Promise<void> {
    const current = await this.get();
    const newPreference = {
      ...current,
      ...patch,
    };
    const db = await this.#getDB();
    const transaction = db.transaction([configStore], "readwrite");
    const store = transaction.objectStore(configStore);
    for (const key in patch) {
      const value = Reflect.get(patch, key);
      const config: PreferenceConfig = { key, value };
      store.put(config);
    }
    await transactionToPromise(transaction);
    this.#notify(newPreference);
  }

  signal<K extends keyof Preference>(name: K): Signal<Preference[K]> {
    const signal = (this.#computed[name] ??= computed(() => this.#preference()[name]));
    return signal;
  }

  #openDB() {
    return openDB("preference", 1, (_, request) => {
      const db = request.result;
      db.createObjectStore(configStore, { keyPath: "key" });
    });
  }

  #notify(latest: Preference) {
    this.#preference.set(latest);
  }
}
