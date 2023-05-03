export function readFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const { result } = reader;
      if (typeof result === "string") {
        resolve(result);
      } else {
        reject();
      }
    };
    reader.onerror = reject;
    reader.readAsText(file, "utf-8");
  });
}
