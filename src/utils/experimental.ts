import { style } from "hyplate";
import { PromiseOr } from "./misc";
import { future } from "./future";

export const startViewTransition = (callback: ViewTransitionCallback, document = window.document): ViewTransition => {
  if (document.startViewTransition) {
    return document.startViewTransition(callback);
  } else {
    const finished = future();
    const ready = future();
    const updated = future();
    queueMicrotask(async () => {
      try {
        await callback();
        updated.done();
        ready.done();
        finished.done();
      } catch (error) {
        updated.abort(error);
        ready.abort(error);
        finished.abort(error);
      }
    });
    return {
      finished: finished.promise,
      ready: ready.promise,
      updateCallbackDone: updated.promise,
      skipTransition() {
        const message = new DOMException("Transition was skipped");
        ready.abort(message);
        updated.done();
        finished.done();
      },
    };
  }
};

export type ViewTransitionElement = HTMLElement | MathMLElement | SVGElement;

const vtn = "viewTransitionName";

type HideInTransitionCallback = () => PromiseOr<void>;

export interface TransitionToggleOptions {
  name?: string;
  main: ViewTransitionElement;
  show: (
    hideInTransition: (callback: HideInTransitionCallback) => Promise<void>
  ) => PromiseOr<ViewTransitionElement | void>;
}

type StyleRestore = Partial<CSSStyleDeclaration>;

export class TransitionToggle {
  #transitionName;
  #options;
  #hasTransitionName;
  constructor(options: TransitionToggleOptions) {
    this.#hasTransitionName = !!options.name;
    this.#transitionName = options?.name ?? `transition-pair-${crypto.randomUUID()}`;
    this.#options = options;
  }

  get transitionName() {
    return this.#transitionName;
  }

  async startViewTransition() {
    const { main, show } = this.#options;
    const mainRestore = this.#touch(main);
    const document = main.ownerDocument;
    const hideFuture = future();
    const vt = startViewTransition(async () => {
      this.#fade(main);
      const hideInTransition = async (hide: HideInTransitionCallback) => {
        let shadowRestore: StyleRestore | undefined;
        if (shadow) {
          shadowRestore = this.#touch(shadow);
        }
        try {
          const vt2 = startViewTransition(async () => {
            if (shadow) {
              this.#fade(shadow);
            }
            this.#recover(main, mainRestore);
            this.#show(main);
            await hide();
          }, document);
          await vt2.updateCallbackDone;
          await vt2.ready;
          await vt2.finished;
          hideFuture.done();
        } catch (error) {
          hideFuture.abort(error);
        } finally {
          this.#recover(main, mainRestore);
          if (shadow && shadowRestore) {
            this.#recover(shadow, shadowRestore);
          }
        }
      };
      const shadow = await show(hideInTransition);
      if (shadow) {
        this.#show(shadow);
      } else {
        if (!this.#hasTransitionName) {
          vt.skipTransition();
          throw new Error("Transition Toggle: options.show() should return a shadow element.");
        }
      }
    }, document);
    await vt.updateCallbackDone;
    await vt.ready;
    await vt.finished;
    return hideFuture;
  }

  #touch(main: ViewTransitionElement) {
    const visibility = main.style.visibility;
    const name = main.style[vtn];
    style(main, vtn, this.#transitionName);
    return {
      visibility,
      [vtn]: name,
    };
  }

  #fade(main: ViewTransitionElement) {
    style(main, vtn, "none");
    style(main, "visibility", "hidden");
  }

  #show(shadow: ViewTransitionElement) {
    style(shadow, vtn, this.transitionName);
  }

  #recover(main: ViewTransitionElement, restore: StyleRestore) {
    Object.assign(main.style, restore);
  }
}
