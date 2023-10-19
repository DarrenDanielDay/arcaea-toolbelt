import { Future, clone, element } from "hyplate";
import { SVGSVGElementAttributes } from "hyplate/types";

type SVGIconProps = JSX.JSXAttributes<SVGSVGElementAttributes, SVGSVGElement> & {
  src: string;
};

const memorySVGCache = new Map<string, SVGSVGElement>();

const fetchSVG = async (src: string) => {
  const response = await fetch(src);
  const svg = await response.text();
  const template = element("template");
  template.innerHTML = svg;
  const el = template.content.firstElementChild;
  // await delay(400000);
  if (!(el instanceof SVGSVGElement)) throw new Error("Invalid SVG URL.");
  return el;
};

const getSVG = async (src: string) => {
  const cached = memorySVGCache.get(src);
  if (cached) {
    return clone(cached);
  }
  const newEl = await fetchSVG(src);
  memorySVGCache.set(src, newEl);
  return newEl;
};

export const SVGIcon = ({ src, ...props }: SVGIconProps) => {
  const { width, height } = props;
  const fallback =
    width && height ? <div style={`display: inline-block; width: ${width}px; height: ${height}px;`}></div> : undefined;
  return (
    <Future promise={getSVG(src)} fallback={fallback}>
      {(el) => {
        return <svg ref={el} {...props}></svg>;
      }}
    </Future>
  );
};
