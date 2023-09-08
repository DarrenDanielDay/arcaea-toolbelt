import loading from "../../../assets/loading.gif";
import { signal, useAutoRun } from "hyplate";
import { Signal, HTMLImageElementAttributes } from "hyplate/types";

type AssetImageProps = JSX.JSXAttributes<Omit<HTMLImageElementAttributes, "src">, HTMLImageElement> & {
  src: Signal<Promise<string | null>>;
};

export const AssetImage = ({ src, ...props }: AssetImageProps) => {
  const $src = signal<string | null>("");
  let resolveingPromise: Promise<string | null> | null = null;
  useAutoRun(() => {
    const promise = src();
    resolveingPromise = promise;
    $src.set(loading);
    promise
      .then((url) => {
        // Only the last resolved promise apply.
        if (resolveingPromise === promise) {
          $src.set(url);
        }
      })
      .catch(() => {
        if (resolveingPromise === promise) {
          $src.set(null);
        }
      });
  });
  return <img src={$src} {...props}></img>;
};
