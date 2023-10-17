const sizes = ["B", "KB", "MB"];
const rate = 1024;
export const formatSize = (byteSize: number) => {
  let size = byteSize;
  let i = 0;
  const maxIndex = sizes.length - 1;
  while (i < maxIndex && size >= rate) {
    i++;
    size /= rate;
  }
  return `${size.toFixed(2)}${sizes[i]}`;
};
