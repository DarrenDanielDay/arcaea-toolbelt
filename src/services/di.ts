export interface Token<T> {
  name: string;
  default?: T;
}

export const token = <T>(name: string): Token<T> => ({ name });

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
          const provider = node[$$provider];
          if (provider?.has(token)) {
            return provider.get(token)!;
          }
        }
        throw new Error(`Cannot find implementation for token "${token.name}"`);
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

class Provider {
  map = new WeakMap<Token<unknown>, unknown>();
  has(token: Token<unknown>): boolean {
    return this.map.has(token);
  }
  set<T>(token: Token<T>, implementation: T): void {
    this.map.set(token, implementation);
  }
  get<T>(token: Token<T>): T | null {
    // @ts-expect-error skip runtime type check
    return this.map.get(token);
  }
}

declare global {
  interface Node {
    [$$provider]?: Provider;
  }
}

export const provide = <T>(token: Token<T>, at: Node, implementation: T) => {
  const provider = (at[$$provider] ??= new Provider());
  provider.set(token, implementation);
};
