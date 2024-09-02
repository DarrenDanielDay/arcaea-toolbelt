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
