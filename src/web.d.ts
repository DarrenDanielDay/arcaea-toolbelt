interface FilePickerType {
  description?: string;
  /**
   * MIME type => array of extensions
   */
  accept?: {
    [MIME: string]: string[];
  };
}
declare global {
  interface Window {
    showDirectoryPicker(options?: {
      id?: string;
      mode?: "read" | "readwrite";
      startIn?: FileSystemHandle;
    }): Promise<FileSystemDirectoryHandle>;
    showOpenFilePicker(options?: {
      multiple?: boolean;
      excludeAcceptAllOption?: boolean;
      types?: FilePickerType[];
    }): Promise<FileSystemFileHandle[]>;
  }
}

export {};
