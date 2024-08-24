import { Injectable } from "classic-di";
import { $Database, $PreferenceService, AppDatabaseContext, Preference, PreferenceKey, PreferenceService } from "./declarations";
import type { Signal } from "hyplate/types";
import { computed, signal } from "hyplate";
import { clone } from "../utils/misc";
import { requestToPromise, transactionToPromise } from "../utils/indexed-db";
import { getUserTheme } from "../utils/theme";

const defaultPreference: Preference = {
  // 默认跟随系统的偏好主题
  theme: getUserTheme(),
  // 默认开启代理
  ghproxy: true,
  showMaxMinus: false,
  template: {},
  aolWorldBoost: 1,
};

interface PreferenceConfig {
  key: string;
  value: any;
}


@Injectable({
  implements: $PreferenceService,
  requires: [$Database]
})
export class PreferenceServiceImpl implements PreferenceService {
  #preference = signal<Preference>(clone(defaultPreference));
  #computed: { [K in PreferenceKey]?: Signal<Preference[K]> } = {};
  constructor(private readonly database: AppDatabaseContext) {
    this.get().then((latest) => this.#notify(latest));
  }

  async get(): Promise<Preference> {
    const db = await this.database.getDB();
    const configStore = this.database.preference;
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
    const db = await this.database.getDB();
    const configStore = this.database.preference;
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

  signal<K extends PreferenceKey>(name: K): Signal<Preference[K]> {
    // @ts-expect-error key access does not match value
    const signal = (this.#computed[name] ??= computed(() => this.#preference()[name]));
    return signal;
  }

  #notify(latest: Preference) {
    this.#preference.set(latest);
  }
}
