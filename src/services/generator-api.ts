import { RPC, WindowMessageHub } from "../utils/rpc";
import { CharacterData, CharacterImage } from "../models/character";
import { B30Response } from "../models/profile";
import { Grade } from "../models/music-play";
import { ClipConfig, Size } from "../utils/image-clip";
import { AssetsInfo } from "../models/file";
import { Banner } from "../models/assets";

export { BannerType } from "../models/assets";
export { CharacterImageKind, CharacterStatus } from "../models/character";
export { Grade, Side, ClearRank, Difficulty } from "../models/music-play";

export interface ImageFile {
  filename: string;
  resourceURL: URL;
  distURL: string;
  blob: Blob;
  blobURL: string;
}

export interface ImageCandidate {
  url: URL;
}

export interface CandidateResult<T extends ImageCandidate> {
  type: "basic";
  image: ImageFile | null;
  candidate: T;
}

export interface CustomImageResult {
  type: "custom";
  image: ImageFile;
}

export type PickImageResult<T extends ImageCandidate> = CandidateResult<T> | CustomImageResult;

export interface CustomImageOptions {
  single?: string;
  clip?: {
    config: ClipConfig;
    canvas: Size;
  };
}

export interface PickImageOptions {
  title: string;
  defaultSelected?: URL;
  display: {
    width: number;
    height: number;
    columns: number;
  };
  custom?: CustomImageOptions;
}

export interface FileExportOptions {
  filename?: string;
  /**
   * 默认为true，自动触发下载
   */
  autoDownload?: boolean;
}

export type HostAPI = {
  getAssetsInfo(): Promise<AssetsInfo>;
  getSongList(): Promise<any>;
  getPackList(): Promise<any>;
  getAllCharacters(): Promise<CharacterData[]>;
  getPreference(): Promise<any>;
  savePreference(preference: any): Promise<void>;
  resolveAssets(paths: string[]): Promise<URL[]>;
  resolveCovers(
    query: {
      songId: string;
      difficulty: number;
      highQuality?: boolean;
    }[]
  ): Promise<URL[]>;
  resolveCharacterImages(query: CharacterImage[]): Promise<URL[]>;
  resolvePotentialBadge(rating: number): Promise<URL>;
  resolveGradeImgs(grades: Grade[]): Promise<URL[]>;
  resolveBackgrounds(): Promise<URL[]>;
  resolveBanners(banners: Banner[]): Promise<URL[]>
  getImages(resources: URL[]): Promise<(ImageFile | null)[]>;
  /**
   * 用户选择图片后resolve
   * 用户取消后resolve为null
   */
  pickImage<T extends ImageCandidate>(candidates: T[], options: PickImageOptions): Promise<PickImageResult<T> | null>;
  /**
   * 用户点击完成以后resolve
   */
  exportAsImage(data: Blob, options?: FileExportOptions): Promise<void>;
};

export type ClientAPI = {
  setB30(response: B30Response): Promise<void>;
};

export const createRpc = (impl: ClientAPI) =>
  new RPC<ClientAPI, HostAPI>({
    hub: new WindowMessageHub(() => {
      const parent = window.parent;
      if (parent === window) {
        throw new Error("No parent window detected.");
      }
      return {
        input: window,
        output: parent,
      };
    }),
    impl,
  });
