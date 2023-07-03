export const clickElsewhere = (panel: Element, onClick: (e: MouseEvent) => void) => {
  const handler = (e: MouseEvent) => {
    const path = e.composedPath();
    if (!path.includes(panel)) {
      onClick(e);
    }
  };
  window.addEventListener("click", handler);
  return () => {
    window.removeEventListener("click", handler);
  };
};
