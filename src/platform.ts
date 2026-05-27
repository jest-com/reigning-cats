const MOBILE_RE =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;

export function isMobile(): boolean {
  return MOBILE_RE.test(navigator.userAgent);
}

// Device pixel ratio, for rendering text at native resolution on HiDPI screens.
export function dpr(): number {
  return window.devicePixelRatio || 1;
}
