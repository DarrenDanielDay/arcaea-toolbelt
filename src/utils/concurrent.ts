export const concurrently = <T, R>(source: T[], task: (input: T) => Promise<R>, poolSize: number): Promise<R[]> => {
  return new Promise<R[]>((resolve, reject) => {
    let working = 0,
      nextIndex = 0;
    const results = Array.from(source, () => null as R);
    const allScheduled = () => nextIndex >= source.length;
    const startOneTask = () => {
      const taskIndex = nextIndex;
      const input = source[taskIndex]!;
      task(input)
        .then((result) => {
          working--;
          results[taskIndex] = result;
          const done = allScheduled();
          if (!done) {
            queueMicrotask(startOneTask);
            return;
          }
          if (!working) {
            resolve(results);
          }
        })
        .catch(reject);
      nextIndex++;
      working++;
      if (working < poolSize) {
        queueMicrotask(startOneTask);
      }
    };
    if (!allScheduled()) {
      startOneTask();
    }
  });
};
