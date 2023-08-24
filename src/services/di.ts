import type { Container, Token } from "classic-di";

export const Inject =
  <T>(token: Token<T>) =>
  <E extends Node>(
    _target: ClassAccessorDecoratorTarget<E, T>,
    context: ClassAccessorDecoratorContext<E, T>
  ): ClassAccessorDecoratorResult<E, T> => {
    if (context.static) {
      throw new Error("Cannot inject for static property.");
    }
    return {
      get() {
        for (let node: Node | null = this; node; node = getParentContext(node)) {
          const container = node[$$provider];
          if (container) {
            const resolution = container.resolve(token);
            if (!resolution.circular) {
              return container.create(resolution.path);
            }
          }
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
  at[$$provider] = container;
};
