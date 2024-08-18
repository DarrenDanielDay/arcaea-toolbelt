import { Banner } from "./assets";

/**
 * 用户上传的文件存储模型
 */
export interface UploadedFile {
  /**
   * 格式：arcaea-toolbelt://vfs/{site}/{path}
   */
  url: string;
  blob: Blob;
}

export interface SongAssetsInfo {
  id: string;
  covers: string[];
}


export interface AssetsInfo {
  songs: SongAssetsInfo[];
  banners: Banner[];
}