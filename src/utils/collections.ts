export function groupBy<T, K extends string | number>(arr: T[], selector: (item: T) => K) {
  return arr.reduce<Record<K, T[]>>((index, item) => {
    (index[selector(item)] ??= []).push(item);
    return index;
  }, {} as Record<K, T[]>);
}

export function indexBy<T>(arr: T[], selector: (item: T) => string | number) {
  return arr.reduce<{ [key: string | number]: T }>((index, item) => {
    index[selector(item)] = item;
    return index;
  }, {});
}

export function mapProps<K extends string | number, T, R>(obj: Record<K, T>, selector: (item: T) => R): Record<K, R> {
  // @ts-expect-error cannot infer obj key as K
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => {
      // @ts-expect-error cannot infer type of value
      return [key, selector(value)];
    })
  );
}

export type Indexed<T> = { [key: string | number]: T };
