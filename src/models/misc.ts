export interface ArcaeaToolbeltMeta {
  version: string;
  apk: string;
  time: number;
}

export type UpdatePayload<T extends object, K extends keyof T> = Pick<T, K> & Partial<Omit<T, K>>;
