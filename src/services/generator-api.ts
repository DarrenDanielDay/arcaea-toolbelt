import { RPC, WindowMessageHub } from "../utils/rpc";
import { CharacterData, CharacterImage } from "../models/character";
import { B30Response } from "../models/profile";
import { Grade } from "../models/music-play";

export { CharacterImageKind, CharacterStatus } from "../models/character";

export { Grade, Side, ClearRank, Difficulty } from "../models/music-play";

export interface ImageFile {
  filename: string;
  resourceURL: URL;
  distURL: string;
  blob: Blob;
  blobURL: string;
}

export interface PickImageOptions {
  title: string;
  defaultSelected?: URL;
  display: {
    width: number;
    height: number;
    columns: number;
  };
}

export interface FileExportOptions {
  filename?: string;
  /**
   * 默认为true，自动触发下载
   */
  autoDownload?: boolean;
}

export type HostAPI = {
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
  getImages(resources: URL[]): Promise<ImageFile[]>;
  /**
   * 用户选择图片后resolve
   * 用户取消后resolve为null
   */
  pickImage(resources: URL[], options: PickImageOptions): Promise<URL | null>;
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
