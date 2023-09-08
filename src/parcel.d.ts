declare module "bundle-text:*" {
  const text: string;
  export default text;
}

declare module "*.svg" {
  const url: string;
  export default url;
}

declare module "*.ico" {
  const url: string;
  export default url;
}
declare module "*.gif" {
  const url: string;
  export default url;
}
declare namespace NodeJS {
  interface ProcessEnv {
    BASE_URI: string;
    COMMIT_SHA: string;
    NODE_ENV: "production" | "development";
  }
}
