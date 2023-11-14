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

  interface ViewTransition {
    finished: Promise<void>;
    ready: Promise<void>;
    updateCallbackDone: Promise<void>;
    skipTransition(): void;
  }
  type ViewTransitionCallback = () => void | Promise<void>;

  interface Document {
    startViewTransition?(callback: ViewTransitionCallback): ViewTransition;
  }

  interface CSSStyleDeclaration {
    viewTimeline: string;
    viewTimelineAxis: string;
    viewTimelineInset: string;
    viewTimelineName: string;
    viewTransitionName: string;
  }
}

export {};
