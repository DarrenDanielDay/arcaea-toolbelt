export const inferRange = (value: number, digit: number, round: boolean): [number, number] => {
  const int = Math.floor(value * 10 ** digit);
  const padded = int * 10;
  const base = 10 ** (digit + 1);
  const min = padded - (round ? 5 : 0),
    max = padded + (round ? 5 : 10);
  return [min / base, max / base];
};

export const isInt = Number.isInteger;

export const divide = (a: number, b: number) => {
  const quotient = Math.floor(a / b);
  const remainder = a - quotient * b;
  return [quotient, remainder] as const;
};

export const sum = (arr: number[]) => arr.reduce((s, curr) => s + curr, 0);

export const truncate = (num: number, digit: number) => {
  const zoom = 10 ** digit;
  const integer = Math.floor(num * zoom);
  return (integer / zoom).toFixed(digit);
};

type Matrix = number[][];
type _Vec<N extends number, T, _A extends T[]> = _A["length"] extends N ? _A : _Vec<N, T, [T, ..._A]>;
type Vector<N extends number, T> = _Vec<N, T, []>;
type SquareMatrix<N extends number> = Vector<N, Vector<N, number>>;
type Add<A extends number, B extends number> = [...Vector<A, 0>, ...Vector<B, 0>]["length"] & number;
type AugmentedMatrix<N extends number> = Vector<N, Vector<Add<N, 1>, number>>;

export const vector = <N extends number, T = number>(n: N, zero: T): Vector<N, T> =>
  // @ts-expect-error cannot check
  Array.from({ length: n }, () => structuredClone(zero));

const vectorOrder = <N extends number>(mat: Vector<N, any>): N => {
  // @ts-expect-error cannot check.
  return mat.length;
};

export const isSquareMatrix = <N extends number>(mat: Matrix): mat is SquareMatrix<N> => {
  const n = mat.length;
  return mat.every((r) => r.length === n);
};

export const cofactor = <N extends number>(mat: SquareMatrix<N>, r: number, c: number): number => {
  const data: Matrix = mat;
  const cofactor = data.filter((_, i) => i !== r).map((row) => row.filter((_, j) => j !== c));
  if (isSquareMatrix(cofactor)) {
    return det(cofactor);
  }
  return 0;
};

export const det = <N extends number>(mat: SquareMatrix<N>): number => {
  const data: Matrix = mat;
  if (!isSquareMatrix<N>(mat)) {
    throw new Error(`input is not a square matrix.`);
  }
  let sum = 0,
    sign = 1,
    n = vectorOrder(mat);
  if (n === 1) {
    return data[0]![0]!;
  }
  for (let i = 0, l = n; i < l; ++i) {
    sum += sign * data[i]![0]! * cofactor(mat, i, 0);
    sign *= -1;
  }
  return sum;
};

export const solve = <N extends number>(mat: AugmentedMatrix<N>): Vector<N, number> => {
  const data: Matrix = mat;
  const n = vectorOrder(mat);
  const solution = vector(n, 0);
  const A = data.map((r) => r.slice(0, -1));
  if (!isSquareMatrix(A)) {
    throw new Error(`Invalid augmented matrix demension.`);
  }
  const d = det(A);
  for (let i = 0; i < n; ++i) {
    const square = structuredClone(A);
    for (let j = 0; j < n; ++j) {
      const squareData: Matrix = square;
      squareData[j]![i]! = data[j]!.at(-1)!;
    }
    const vec: number[] = solution;
    vec[i] = det(square) / d;
  }
  return solution;
};
