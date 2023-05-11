export const getFormData = <T extends Record<string, string>>(form: HTMLFormElement): T => {
  const result: Record<string, string> = {};
  const formData = new FormData(form);
  formData.forEach((value, key) => {
    if (typeof value === "string") {
      result[key] = value;
    }
  });
  // @ts-expect-error Dynamic Implementation
  return result;
};
