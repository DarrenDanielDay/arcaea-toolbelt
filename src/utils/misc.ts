export const clone = <T>(json: T): T => JSON.parse(JSON.stringify(json));

export const once = <T>(factory: () => T) => {
  let value: T | null = null;
  return (): T => (value ??= factory());
};

export const isString = (value: unknown): value is string => typeof value === "string";

export const jsonModule = <T>(imports: Promise<{ default: T }>): Promise<T> =>
  // @ts-expect-error parcel json module is using common js and module.exports = JSON.parse(...)
  imports;

export const esModule = jsonModule;

export type PromiseOr<T> = T | Promise<T>;
