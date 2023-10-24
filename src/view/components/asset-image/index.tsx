import loading from "../../../assets/loading.gif";
import { isSubscribable, signal, useAutoRun } from "hyplate";
import type { HTMLImageElementAttributes, BindingPattern } from "hyplate/types";
import { PromiseOr, isString } from "../../../utils/misc";

type ImageSource = PromiseOr<string | null>;

type AssetImageProps = JSX.JSXAttributes<Omit<HTMLImageElementAttributes, "src">, HTMLImageElement> & {
  src: BindingPattern<ImageSource>;
  noLoading?: boolean;
};

export const AssetImage = ({ src, noLoading, ...props }: AssetImageProps) => {
  const $src = signal<string | null>(null);
  let resolveingPromise: Promise<string | null> | null = null;
  const handleSource = (source: ImageSource) => {
    if (!source || isString(source)) {
      $src.set(source || null);
      return;
    }
    resolveingPromise = source;
    if (!noLoading) {
      $src.set(loading);
    }
    source
      .then((url) => {
        // Only the last resolved promise apply.
        if (resolveingPromise === source) {
          $src.set(url);
        }
      })
      .catch(() => {
        if (resolveingPromise === source) {
          $src.set(null);
        }
      });
  };
  isSubscribable(src)
    ? useAutoRun(() => {
        handleSource(src());
      })
    : handleSource(src);
  return <img src={$src} {...props}></img>;
};
