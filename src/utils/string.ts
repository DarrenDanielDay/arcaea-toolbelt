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
