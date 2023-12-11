export const createInvokeCapture = (handler: (path: string[], args: any[]) => any) => {
  const createProxy = (path: string[]): any =>
    new Proxy(function noop() {}, {
      get(_target, property) {
        if (typeof property === "symbol") throw new Error("Cannot get symbol property.");
        return createProxy([...path, property]);
      },
      apply(_target, _this, argArray) {
        return handler(path, argArray);
      },
    });
  return createProxy([]);
};
