import type { Container, Token } from "classic-di";

let globalContainer: Container | null = null;

export const Inject =
  <T>(token: Token<T> | (new (...args: any[]) => T), options?: { once?: boolean }) =>
  <E extends Node>(
    _target: ClassAccessorDecoratorTarget<E, T>,
    context: ClassAccessorDecoratorContext<E, T>
  ): ClassAccessorDecoratorResult<E, T> => {
    if (context.static) {
      throw new Error("Cannot inject for static property.");
    }
    let injected: any = null;
    return {
      get() {
        if (options?.once && injected) {
          return injected;
        }
        for (let node: Node | null = this; node; node = getParentContext(node)) {
          const container = node[$$provider];
          if (container) {
            const resolution = container.resolve(token);
            if (!resolution.circular) {
              return (injected = container.create(resolution.path));
            }
          }
        }
        const container = globalContainer;
        if (container) {
          const resolution = container.resolve(token);
          if (!resolution.circular) {
            return (injected = container.create(resolution.path));
          }
        }
        if (typeof token === "function") {
          throw new Error(`Cannot create implementation for constructor "${token.name}"`);
        }
        throw new Error(`Cannot find implementation for token "${token.key.description}"`);
      },
    };
  };

const getParentContext = (node: Node): Node | null => {
  if (node instanceof ShadowRoot) {
    return node.host;
  }
  return node.parentNode;
};

const $$provider: unique symbol = Symbol("@@provider");

declare global {
  interface Node {
    [$$provider]?: Container;
  }
}

export const provide = (at: Node, container: Container) => {
  if (!globalContainer) globalContainer = container;
  at[$$provider] = container;
};
