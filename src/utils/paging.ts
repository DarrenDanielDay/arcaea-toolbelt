export const pageInto = <T>(arr: T[], pageSize: number): T[][] => {
  const paged: T[][] = [];
  const pageCount = Math.ceil(arr.length / pageSize);
  for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
    const begin = pageIndex * pageSize,
      end = begin + pageSize;
    paged.push(arr.slice(begin, end));
  }
  return paged;
};
