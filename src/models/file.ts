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

