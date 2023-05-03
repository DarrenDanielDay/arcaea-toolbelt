import { Disposable, effect } from "./component";

export const onClickElsewhere = (disposable: Disposable, panel: Element, onClick: (e: MouseEvent) => void) => {
  effect(disposable, () => {
    const handler = (e: MouseEvent) => {
      const path = e.composedPath();
      if (!path.includes(panel)) {
        onClick(e);
      }
    };
    window.addEventListener("click", handler);
    return () => {
      window.removeEventListener("click", handler);
    };
  });
};
