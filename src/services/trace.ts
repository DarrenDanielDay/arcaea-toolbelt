import { Logger } from "./declarations";

export interface LoggerMixin {
  logger: Logger;
}

export function trace<T extends LoggerMixin>(msg: string) {
  return (target: Function, context: ClassMethodDecoratorContext<T>) => {
    const fn = function (this: T, ...args: any[]): any {
      return this.logger.debug.trace(msg, target.apply(this, args));
    };
    Object.defineProperty(fn, "name", {
      ...Object.getOwnPropertyDescriptor(target, "name"),
      value: target.name,
    });
    return fn;
  };
}
