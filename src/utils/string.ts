/**
 * 搜素匹配，返回一个匹配系数
 */
export const searchMatch = (searchText: string, candidate: string): number | null => {
  if (searchText === candidate) {
    return 0;
  }
  if (searchText.toUpperCase() === abbr(candidate).toUpperCase()) {
    return 0.5;
  }
  const index = candidate.toLowerCase().indexOf(searchText.toLowerCase());
  if (index === -1) {
    return null;
  }
  return 1 + index + Math.log(candidate.length);
};

export const trimSlash = (str: string): string => {
  let i = str.length - 1;
  for (let char = str[i]; char === "/"; ) {
    i--;
    char = str[i];
  }
  return str.slice(0, i);
};

export const pad2 = (n: number) => `${n}`.padStart(2, "0");

export const abbr = (s: string) =>
  s
    .split(/\s|[\.\-\[\]]/)
    .map((part) => part.trim().at(0))
    .filter((c) => !!c)
    .join("");

export const formatDateTime = (date: Date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ` + formatTime(date);

export const formatTime = (date: Date) =>
  `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}.${date
    .getMilliseconds()
    .toString()
    .padStart(3, "0")}`;

const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const charset = upper + upper.toLowerCase() + "0123456789";

export const randomString = (length: number) =>
  Array.from({ length }, () => charset[Math.floor(Math.random() * charset.length)]);
