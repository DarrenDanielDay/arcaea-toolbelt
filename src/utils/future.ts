export interface Task<T> {
  promise: Promise<T>;
  done(result: T): void;
  abort(reason?: any): void;
}

export interface CompleteSignal {
  promise: Promise<void>;
  done(): void;
  abort(reason?: any): void;
}

export const future: {
  (): CompleteSignal;
  <T>(): Task<T>;
} = () => {
  let done: any, abort: any;
  const promise = new Promise<any>((resolve, reject) => {
    done = resolve;
    abort = reject;
  });
  return {
    promise,
    get done() {
      return done;
    },
    get abort() {
      return abort;
    },
  };
};
