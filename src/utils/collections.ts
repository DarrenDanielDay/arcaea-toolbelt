import { isNumber, isObject } from "./misc";

export function groupBy<T, K extends string | number>(arr: readonly T[], selector: (item: T) => K) {
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

export interface BinaryOperator<T> {
  accepts(value: unknown): value is T;
  apply(a: T, b: T): T;
}

export const apply = <T, R>(a: T, b: T, op: BinaryOperator<R>): T => {
  const aa = op.accepts(a),
    ba = op.accepts(b);
  const fail = () => {
    throw new Error(`cannot operate on ${a} and ${b}`);
  };
  if (aa && ba) {
    // @ts-expect-error not type safe
    return op.apply(a, b);
  }
  if (aa !== ba || typeof a !== typeof b) {
    return fail();
  }
  if (Array.isArray(a)) {
    if (!Array.isArray(b)) {
      return fail();
    }
    if (a.length !== b.length) {
      return fail();
    }
    // @ts-expect-error not type safe
    return a.map((el, i) => apply(el, b[i], op));
  }
  if (isObject(a) && isObject(b)) {
    return Object.fromEntries([
      ...new Set(
        [...Reflect.ownKeys(a), ...Reflect.ownKeys(b)].map((key) => {
          const va = Reflect.get(a, key),
            vb = Reflect.get(b, key);
          return [key, apply(va, vb, op)];
        })
      ),
    ]);
  }
  return fail();
};

export const add: BinaryOperator<number> = {
  accepts(value): value is number {
    return isNumber(value);
  },
  apply(a, b) {
    return a + b;
  },
}