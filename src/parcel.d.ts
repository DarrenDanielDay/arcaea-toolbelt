declare module "bundle-text:*" {
  const text: string;
  export default text;
}

declare var process: {
  env: {
    BASE_URI: string;
    COMMIT_SHA: string;
  };
};
