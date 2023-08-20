export function groupBy<T>(arr: T[], selector: (item: T) => string) {
  return arr.reduce<{ [key: string]: T[] }>((index, item) => {
    (index[selector(item)] ??= []).push(item);
    return index;
  }, {});
}

export function indexBy<T>(arr: T[], selector: (item: T) => string | number) {
  return arr.reduce<{ [key: string | number]: T }>((index, item) => {
    index[selector(item)] = item;
    return index;
  }, {});
}

export type Indexed<T> = { [key: string | number]: T };
