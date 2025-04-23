export const clone = <T>(json: T): T => JSON.parse(JSON.stringify(json));

export const once = <T>(factory: () => T) => {
  let value: T | null = null;
  return (): T => (value ??= factory());
};

export const isNumber = (value: unknown): value is number => typeof value === "number";

export const isString = (value: unknown): value is string => typeof value === "string";

export const isObject = (value: unknown): value is object => typeof value === "object" && value != null;

export function shape<T extends object>(schema: { [K in keyof T]: (value: unknown) => value is T[K] }) {
  return (value: unknown): value is T =>
    isObject(value) &&
    Object.entries(value).every(([pk, pv]) => {
      if (!(pk in schema)) {
        return true;
      }
      const validator = Reflect.get(schema, pk);
      if (typeof validator !== "function") {
        return false;
      }
      return !!validator(pv);
    });
}

export const nocheck = <T>(value: unknown): value is T => true;

export const jsonModule = <T>(imports: Promise<{ default: T }>): Promise<T> =>
  // @ts-expect-error parcel json module is using common js and module.exports = JSON.parse(...)
  imports;

export const esModule = jsonModule;

export type PromiseOr<T> = T | Promise<T>;
