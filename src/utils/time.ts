import { divide } from "./math";

const secondMS = 1000;
const minuteMS = 60 * secondMS;
const hourMS = 60 * minuteMS;
const dayMS = 24 * hourMS;
const suffix = ["d", "H", "m", "s"];
const factors = [dayMS, hourMS, minuteMS, secondMS];
export const duration = (time: number, now: number) => {
  const duration = now - time;
  let q = 0,
    r = duration;
  for (let i = 0; i < factors.length; i++) {
    const factor = factors[i]!;
    [q, r] = divide(r, factor);
    if (q > 0) {
      return `${q}${suffix[i]!}`;
    }
  }
  return "now";
};

export const getDateFromDatetimeLocal = (input: HTMLInputElement) => {
  return new Date(input.value);
};

export const setDateToDatetimeLocal = (input: HTMLInputElement, date: Date) => {
  input.value = new Date(+date - date.getTimezoneOffset() * minuteMS).toISOString().slice(0, -5);
};

export const getNow = () => new Date(Date.now());
