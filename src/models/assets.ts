export enum BannerType {
  Course = "course",
  ArcaeaOnline = "aol",
}

export interface CourseBanner {
  type: BannerType.Course;
  file?: string;
  level: number;
}

export interface ArcaeaOnlineBanner {
  type: BannerType.ArcaeaOnline;
  file: string;
  year: number;
  month: number;
}

export type Banner = CourseBanner | ArcaeaOnlineBanner;