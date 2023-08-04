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

export function readBinary(file: File): Promise<ArrayBuffer> {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (result instanceof ArrayBuffer) {
        resolve(result);
      } else {
        reject();
      }
    };
    reader.readAsArrayBuffer(file);
  });
}
