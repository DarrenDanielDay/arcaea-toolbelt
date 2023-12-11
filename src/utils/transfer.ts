export const serialize = (value: any): any => {
  if (typeof value !== "object" || value == null) {
    return value;
  }
  if (value instanceof URL) {
    return {
      _url: value.href,
    };
  }
  if (Array.isArray(value)) {
    return value.map((item) => serialize(item));
  }
  const proto = Object.getPrototypeOf(value);
  if (proto === Object.prototype || proto == null) {
    const cloned = Object.create(proto);
    for (const [key, val] of Object.entries(value)) {
      cloned[key] = serialize(val);
    }
    return cloned;
  }
  return value;
};

export const deserialize = (value: any): any => {
  if (typeof value !== "object" || value == null) {
    return value;
  }
  if (typeof value._url === 'string') {
    return new URL(value._url);
  }
  if (Array.isArray(value)) {
    return value.map((item) => deserialize(item));
  }
  const proto = Object.getPrototypeOf(value);
  if (proto === Object.prototype || proto == null) {
    const cloned = Object.create(proto);
    for (const [key, val] of Object.entries(value)) {
      cloned[key] = deserialize(val);
    }
    return cloned;
  }
  return value;
};
