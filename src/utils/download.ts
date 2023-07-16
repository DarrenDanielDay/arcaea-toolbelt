export function download(url: string, filename: string) {
  const link = document.createElement("a");
  link.download = filename;
  link.href = url;
  link.click();
}

export function downloadJSON(json: object, filename: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(json, undefined, 2) + "\n"], { type: "application/json" }));
  download(url, filename);
}
