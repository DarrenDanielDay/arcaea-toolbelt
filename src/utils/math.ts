export const inferRange = (value: number, digit: number, round: boolean): [number, number] => {
  const int = Math.floor(value * 10 ** digit);
  const padded = int * 10;
  const base = 10 ** (digit + 1);
  const min = padded - (round ? 5 : 0),
    max = padded + (round ? 5 : 9);
  return [min / base, max / base];
};

export const isInt = Number.isInteger;

export const divide = (a: number, b: number) => {
  const quotient = Math.floor(a / b);
  const remainder = a - quotient * b;
  return [quotient, remainder] as const;
};

export const sum = (arr: number[]) => arr.reduce((s, curr) => s + curr, 0);
