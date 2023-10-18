export const clone = <T>(json: T): T => JSON.parse(JSON.stringify(json));
