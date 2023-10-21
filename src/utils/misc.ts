export const clone = <T>(json: T): T => JSON.parse(JSON.stringify(json));

export const once = <T>(factory: () => T) => {
  let value: T | null = null;
  return (): T => (value ??= factory());
};

export const isString = (value: unknown): value is string => typeof value === 'string';