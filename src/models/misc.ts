export interface ArcaeaToolbeltMeta {
  version: string;
  apk: string;
  time: number;
  index: {
    file: string;
    hash: string;
  }[];
}
export interface ChartExpressInfo {
  constant: number;
}

export interface ChartExpress {
  songId: string;
  charts: (ChartExpressInfo | null)[];
}

export type UpdatePayload<T extends object, K extends keyof T> = Pick<T, K> & Partial<Omit<T, K>>;
