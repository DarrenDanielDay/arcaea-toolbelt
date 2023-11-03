const ua = navigator.userAgent;
export const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);
