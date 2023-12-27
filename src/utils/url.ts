const blobURLRegistry = new FinalizationRegistry<string>((url) => {
  console.debug(`Revoking Object URL: ${url}`);
  return URL.revokeObjectURL(url);
});

export const managedBlobURL = (blob: Blob): string => {
  const url = URL.createObjectURL(blob);
  blobURLRegistry.register(blob, url);
  return url;
};