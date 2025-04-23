import { Injectable } from "classic-di";
import { $Logger, $LowLevelStorage, Log, LogFunction, Loggable, Logger, LogLevel } from "./declarations";
import { isNumber, isObject, isString, nocheck, shape } from "../utils/misc";

export const isLog = shape<Log>({
  content: nocheck<Loggable[]>,
  level: isNumber,
  stack: isString,
  timestamp: isNumber,
});

@Injectable({
  implements: $Logger,
  requires: [$LowLevelStorage],
})
export class StorageLogger implements Logger {
  // 申请中译中.txt
  static #key = "\t--【<!--#日誌-->】--";
  static #notrace = "<no stack trace>";
  static #maxLogCount = 1024;

  debug = this.#logFuncFactory(LogLevel.Debug);
  info = this.#logFuncFactory(LogLevel.Info);
  warn = this.#logFuncFactory(LogLevel.Warning);
  error = this.#logFuncFactory(LogLevel.Error);
  fatal = this.#logFuncFactory(LogLevel.Fatal);

  constructor(public readonly storage: Storage) {}

  async getHistory(): Promise<Log[]> {
    return this.#readFromStore();
  }

  async clear(): Promise<void> {
    this.storage.removeItem(StorageLogger.#key);
  }

  #logFuncFactory(level: LogLevel): LogFunction {
    const func: LogFunction = (...args) => {
      const { stack = StorageLogger.#notrace } = new Error("Stack");
      const log: Log = {
        content: args,
        level,
        stack,
        timestamp: Date.now(),
      };
      this.#addLog(log);
    };
    func.trace = <T extends Loggable>(tag: string, value: T) => {
      const { stack = StorageLogger.#notrace } = new Error("Stack");
      const log: Log = {
        content: [tag, value],
        level,
        stack,
        timestamp: Date.now(),
      };
      this.#addLog(log);
      return value;
    };
    return func;
  }

  #readFromStore(): Log[] {
    const text = this.storage.getItem(StorageLogger.#key);
    if (text == null) {
      return [];
    }
    return this.#deserialize(text);
  }

  #deserialize(text: string) {
    try {
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.filter(isLog).sort((a, b) => a.timestamp - b.timestamp);
    } catch (error) {
      console.error(error);
      return [];
    }
  }

  #addLog(log: Log) {
    const logs = this.#readFromStore();
    logs.push(log);
    if (logs.length >= StorageLogger.#maxLogCount) {
      logs.shift();
    }
    this.#saveToStore(logs);
  }

  #saveToStore(logs: Log[]) {
    this.storage.setItem(StorageLogger.#key, this.#serialize(logs));
  }

  #serialize(logs: Log[]): string {
    return JSON.stringify(logs);
  }
}
