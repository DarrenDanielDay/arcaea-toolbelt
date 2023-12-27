/**
 * 搜素匹配，返回一个匹配系数
 */
export const searchMatch = (searchText: string, candidate: string): number | null => {
  if (searchText === candidate) {
    return 0;
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
