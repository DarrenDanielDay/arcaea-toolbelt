export const uuid =
  crypto.randomUUID?.bind(crypto) ??
  (() => {
    const now = Date.now();
    const random = Math.floor(Math.random() * 0xffffffff);
    return `${now.toString(16)}-${random.toString(16)}`;
  });
