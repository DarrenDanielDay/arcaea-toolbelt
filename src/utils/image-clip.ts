//#region typedefs

type DeepPartial<T> = T extends object
  ?
      | {
          [K in keyof T]?: DeepPartial<T[K]>;
        }
      | undefined
  : T | undefined | null;

export type RenderContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
export interface Vecter2D {
  x: number;
  y: number;
}
export type Position = Vecter2D;

export interface Size {
  width: number;
  height: number;
}

export interface Rectangle {
  position: Position;
  size: Vecter2D;
}

export interface ImageSource {
  bitmap: ImageBitmap;
  area: Rectangle;
}

export interface EditingImageTransform {
  position: Position;
  scale: number;
}

export type DrawMode = "frame" | "batch" | "sync";

export type BackgroundOptions = {
  type: "grid";
} & TransparentGridOptions;

export interface MaskStyle {
  fillStyle: string;
}

export interface BoundOptions {
  /**
   * When set to true, controller will adjust the clipping area
   * to prevent it from containing contents outside of the source image.
   * @default true
   */
  clip: boolean;
  /**
   * When set to true, controller will only trigger changes
   * if the event point is inside the image area.
   * This option is ignored when resizing with mouse.
   * @default true
   */
  image: boolean;
  /**
   * The range of scale.
   */
  scale: {
    /**
     * @default 0
     */
    min: number;
    /**
     * @default 16
     */
    max: number;
  };
}

export interface TransparentGridOptions {
  /**
   * The color of first cell.
   */
  color1: string;
  color2: string;
  /**
   * The grid cell length (both width and height).
   * @default 16
   */
  length: number;
}

export interface ClipConfig {
  /**
   * The rectangle area to extract as image.
   * The origin is the center of canvas.
   */
  area: Rectangle;
  /**
   * Clip path.
   * The origin is the center of canvas.
   */
  clipPath: string;
}

export interface Options {
  /**
   * "frame": redraw on every animation frame.
   * "sync": redraw on every event.
   * "batch": batch redraws in events in next animation frame.
   */
  mode: DrawMode;
  bound: BoundOptions;
  /**
   * Defines the transparent part as background.
   * Default to draw grid.
   */
  background: BackgroundOptions;
  /**
   * Configures the mask style.
   */
  mask: MaskStyle;
  /**
   * The clip path options.
   */
  clip: ClipConfig;
}

interface MouseSnapshot {
  image: EditingImageTransform;
  start: Position;
  point: Position;
}

interface TouchSnapshot {
  image: EditingImageTransform;
  touches: Position[];
}
//#endregion

//#region vector utils
export const zero: Vecter2D = Object.freeze({ x: 0, y: 0 });

const inRange = (value: number, min: number, max: number) => min <= value && value <= max;

const contains = (area: Rectangle, point: Vecter2D) => {
  const { position, size } = area;
  return inRange(point.x, position.x, position.x + size.x) && inRange(point.y, position.y, position.y + size.y);
};

export const bound = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export const boundPoint = (v: Vecter2D, min: Vecter2D, max: Vecter2D): Vecter2D => ({
  x: bound(v.x, min.x, max.x),
  y: bound(v.y, min.y, max.y),
});

export const expand = (v: Vecter2D): [number, number] => [v.x, v.y];

export const point = (v: Vecter2D) => `${v.x},${v.y}`;

export const fromSize = (size: Size): Vecter2D => ({
  x: size.width,
  y: size.height,
});

const clone = structuredClone;

const patchDeep = <T>(value: DeepPartial<T>, defaults: T): T => {
  if (value == null) {
    return defaults;
  }
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    // @ts-expect-error
    return value;
  }
  // @ts-expect-error
  return Object.fromEntries(
    // @ts-expect-error
    Object.entries(defaults).map(([k, v]) => [k, patchDeep(value[k], v)])
  );
};

export const add = (a: Vecter2D, b: Vecter2D): Vecter2D => ({
  x: a.x + b.x,
  y: a.y + b.y,
});

export const mult = (v: Vecter2D, k: number): Vecter2D => ({
  x: v.x * k,
  y: v.y * k,
});

export const div = (v: Vecter2D, k: number): Vecter2D => ({
  x: v.x / k,
  y: v.y / k,
});

export const average = (...points: Vecter2D[]): Vecter2D =>
  div(
    points.reduce((prev, curr) => add(prev, curr)),
    points.length
  );

export const zoom = (v: Vecter2D, factor: Vecter2D): Vecter2D => ({
  x: v.x * factor.x,
  y: v.y * factor.y,
});

export const sub = (a: Vecter2D, b: Vecter2D) => add(a, mult(b, -1));

export const radius = (v: Vecter2D) => Math.hypot(v.x, v.y);

const getMouseOffset = (mouse: MouseEvent): Position => ({
  x: mouse.offsetX,
  y: mouse.offsetY,
});

const getTouchOffset = (touch: Touch): Position => {
  const target = touch.target;
  const offset = {
    x: touch.pageX,
    y: touch.pageY,
  };
  if (!(target instanceof HTMLElement)) {
    return offset;
  }
  const rect = target.getBoundingClientRect();
  return sub(offset, rect);
};

//#endregion

export class ImageClipperCanvasController {
  /**
   * Generate rectangle clip area
   * @param canvasSize canvas 2D size
   * @param rectSize default to half of canvas size
   */
  static rect(canvasSize: Vecter2D, rectSize?: Vecter2D): ClipConfig {
    rectSize ??= div(canvasSize, 2);
    const halfRectSize = div(rectSize, 2);
    const rectStart = mult(halfRectSize, -1);
    const clipPath = `m\
 ${point(rectStart)}\
 ${rectSize.x},0\
 0,${rectSize.y}\
 ${-rectSize.x},0\
 z`;
    return {
      area: {
        position: rectStart,
        size: rectSize,
      },
      clipPath,
    };
  }
  static diamond(width: number): ClipConfig {
    const rectSize: Vecter2D = { x: width, y: width };
    const halfRectSize = div(rectSize, 2);
    const position = mult(halfRectSize, -1);
    const clipPath = `m\
 0,${-halfRectSize.y}\
 ${halfRectSize.x},${halfRectSize.y}\
 ${-halfRectSize.x},${halfRectSize.y}\
 ${-halfRectSize.x},${-halfRectSize.y}\
 z`;
    return {
      area: {
        position,
        size: rectSize,
      },
      clipPath,
    };
  }
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  clipConfig: ClipConfig;
  background: ImageData | null = null;
  source: ImageSource | null = null;
  transform: EditingImageTransform;
  options: Options;
  readonly mode: DrawMode;
  private af: ReturnType<typeof window.requestAnimationFrame> = -1;
  private mouseSnapshot: MouseSnapshot | null = null;
  private touchSnapshot: TouchSnapshot | null = null;
  constructor(canvas: HTMLCanvasElement, options?: DeepPartial<Options>) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d")!;
    this.options = patchDeep<Options>(options, {
      background: {
        type: "grid",
        color1: "rgba(0,0,0,0.2)",
        color2: "#ffffff",
        length: 16,
      },
      bound: {
        clip: true,
        image: true,
        scale: {
          min: 0,
          max: 16,
        },
      },
      clip: ImageClipperCanvasController.rect(fromSize(canvas)),
      mask: {
        fillStyle: "rgba(0,0,0,0.5)",
      },
      mode: "batch",
    });
    this.clipConfig = this.options.clip;
    this.mode = this.options.mode;
    this.transform = {
      position: clone(zero),
      scale: 1,
    };
  }

  //#region computed properties
  get baseZoom(): Vecter2D {
    const { width, height } = this.canvas.getBoundingClientRect();
    return {
      x: this.canvas.width / width,
      y: this.canvas.height / height,
    };
  }

  get imageArea(): Rectangle | null {
    const {
      transform: { position, scale },
      source,
    } = this;
    if (!source) {
      return null;
    }
    const {
      area: { size },
    } = source;
    return {
      position,
      size: mult(size, scale),
    };
  }

  get clipArea(): Rectangle {
    const { area } = this.clipConfig;
    return {
      ...area,
      position: add(area.position, div(fromSize(this.canvas), 2)),
    };
  }
  //#endregion

  //#region settings, immutable updates
  setClip(config: ClipConfig) {
    this.clipConfig = config;
    this.schedule();
  }
  setImage(bitmap: ImageBitmap, area?: Rectangle) {
    this.source = {
      bitmap,
      area: area ?? {
        position: zero,
        size: fromSize(bitmap),
      },
    };
    this.boundPosition();
    this.schedule();
  }
  setBackground(backgound: BackgroundOptions) {
    this.options.background = backgound;
    this.background = this.createBackground();
    this.schedule();
  }
  //#endregion

  //#region draws
  draw() {
    const { context } = this;
    this.scoped(context, this.clearCanvas);
    this.scoped(context, this.drawBackground);
    this.scoped(context, this.drawImage);
    this.scoped(context, this.drawMask);
  }

  scoped(context: RenderContext, draw: (context: RenderContext) => void) {
    context.save();
    draw(context);
    context.restore();
  }

  clearCanvas = (context: RenderContext) => {
    const { width, height } = this.canvas;
    context.clearRect(0, 0, width, height);
  };

  drawBackground = (context: RenderContext) => {
    context.putImageData((this.background ??= this.createBackground()), 0, 0);
  };

  #drawGridBackground(context: RenderContext) {
    let {
      options: { background },
    } = this;
    if (background.type === "grid") {
      // draw grid backgound
      const { width, height } = this.canvas;
      const { color1, color2, length } = background;
      const maxColumn = width / length,
        maxRow = height / length;
      for (let row = 0; row < maxRow; row++) {
        for (let column = 0; column < maxColumn; column++) {
          context.fillStyle = (row + column) % 2 ? color2 : color1;
          context.fillRect(column * length, row * length, length, length);
        }
      }
    }
  }

  drawImage = (ctx: RenderContext) => {
    const { source } = this;
    if (!source) {
      return;
    }
    const { position, scale } = this.transform;
    const { area, bitmap } = source;
    ctx.drawImage(
      bitmap,
      ...expand(area.position),
      ...expand(area.size),
      ...expand(position),
      ...expand(mult(area.size, scale))
    );
  };

  drawMask = (context: RenderContext) => {
    const { width, height } = this.canvas;
    const path2d = new Path2D();
    path2d.rect(0, 0, width, height);
    path2d.addPath(this.createClip());
    context.clip(path2d, "evenodd");
    context.fillStyle = this.options.mask.fillStyle;
    context.fillRect(0, 0, width, height);
  };

  createClip() {
    const { clipPath } = this.clipConfig;
    const path2d = new Path2D();
    const canvasCenter = div(fromSize(this.canvas), 2);
    path2d.addPath(new Path2D(`M ${point(canvasCenter)} ${clipPath}`));
    return path2d;
  }

  createBackground() {
    const canvas = document.createElement("canvas");
    canvas.width = this.canvas.width;
    canvas.height = this.canvas.height;
    const context = canvas.getContext("2d")!;
    this.#drawGridBackground(context);
    return context.getImageData(0, 0, canvas.width, canvas.height);
  }

  move(d: Vecter2D) {
    // Bound movement
    Object.assign(this.transform.position, add(this.transform.position, d));
    this.boundPosition();
  }

  zoom(center: Position, scale: number) {
    const { transform } = this;
    // dest = src * scale + position
    const sourcePostion = div(sub(center, transform.position), transform.scale);
    const scaleBound = this.options.bound.scale;
    const newScale = bound(scale, scaleBound.min, scaleBound.max);
    transform.scale = newScale;
    // position = dest - src * scale
    this.transform.position = sub(center, mult(sourcePostion, newScale));
    this.boundPosition();
  }

  boundPosition() {
    if (!this.options.bound.clip) {
      return;
    }
    const {
      source,
      transform: { position, scale },
    } = this;
    if (!source) {
      return;
    }
    const clip = this.clipArea;
    const { area: src } = source;
    const minScale = Math.max(clip.size.y / src.size.y, clip.size.x / src.size.y);
    this.transform.scale = Math.max(scale, minScale);
    const minBound = sub(add(clip.position, clip.size), mult(src.size, this.transform.scale));
    const maxBound = clip.position;
    Object.assign(position, boundPoint(position, minBound, maxBound));
  }
  //#endregion

  //#region events
  start() {
    const subscribe = <K extends keyof HTMLElementEventMap>(
      event: K,
      handler: (event: HTMLElementEventMap[K]) => void
    ) => {
      this.canvas.addEventListener(event, handler);
      return () => {
        this.canvas.removeEventListener(event, handler);
      };
    };
    const subscriptions = [
      subscribe("mousedown", this.handleMouseDown),
      subscribe("mouseup", this.handleMouseUp),
      subscribe("mousemove", this.handleMouseMove),
      subscribe("wheel", this.handleWheel),
      subscribe("touchstart", this.handleTouchChange),
      subscribe("touchend", this.handleTouchChange),
      subscribe("touchmove", this.handleTouchMove),
    ];
    switch (this.mode) {
      case "frame": {
        const frame = () => {
          this.draw();
          this.af = requestAnimationFrame(frame);
        };
        this.af = requestAnimationFrame(frame);
        subscriptions.push(() => {
          cancelAnimationFrame(this.af);
        });
        break;
      }
      case "sync": {
        this.draw();
        break;
      }
      case "batch":
      default: {
        subscriptions.push(() => {
          const af = this.af;
          if (~af) {
            return;
          }
          cancelAnimationFrame(af);
        });
        break;
      }
    }
    return () => {
      for (const unsubscribe of [...subscriptions].reverse()) {
        unsubscribe();
        subscriptions.pop();
      }
    };
  }

  schedule() {
    switch (this.mode) {
      case "frame":
        break;
      case "sync":
        this.draw();
        break;
      case "batch":
      default:
        this.batch();
        break;
    }
  }

  batch() {
    if (~this.af) {
      return;
    }
    this.af = requestAnimationFrame(this.frame);
  }

  private frame = () => {
    this.draw();
    this.af = -1;
  };

  private handleMouseDown = (e: MouseEvent) => {
    const { imageArea } = this;
    if (!imageArea) {
      return;
    }
    const clickPoint = this.getClickPoint(e);
    if (this.options.bound.image && !contains(imageArea, clickPoint)) {
      return;
    }
    this.mouseSnapshot = {
      image: clone(this.transform),
      start: clickPoint,
      point: clickPoint,
    };
  };

  private handleMouseUp = () => {
    this.mouseSnapshot = null;
  };

  private handleMouseMove = (e: MouseEvent) => {
    const { mouseSnapshot } = this;
    if (!mouseSnapshot) {
      return;
    }
    const { imageArea } = this;
    if (!imageArea) {
      return;
    }
    const clickPoint = this.getClickPoint(e);
    if (e.ctrlKey) {
      // scale center is the center of canvas
      const center = div(fromSize(this.canvas), 2);
      const initOffset = sub(mouseSnapshot.start, center);
      const initR = radius(initOffset);
      const currentOffset = sub(clickPoint, center);
      const currentR = radius(currentOffset);
      this.zoom(center, (mouseSnapshot.image.scale * currentR) / initR);
    } else {
      if (this.options.bound.image && !contains(imageArea, clickPoint)) {
        return;
      }
      this.move(sub(clickPoint, mouseSnapshot.point));
    }
    this.mouseSnapshot = {
      ...mouseSnapshot,
      point: clickPoint,
    };
    this.schedule();
  };

  private handleTouchChange = (e: TouchEvent) => {
    if (e.touches.length) {
      const touches = this.getTouchPoints(e);
      this.touchSnapshot = {
        image: clone(this.transform),
        touches,
      };
    } else {
      this.touchSnapshot = null;
    }
  };

  private handleTouchMove = (e: TouchEvent) => {
    const { imageArea } = this;
    if (!imageArea) {
      return;
    }
    const touches = this.getTouchPoints(e);
    if (this.options.bound.image && touches.every((touch) => !contains(imageArea, touch))) {
      return;
    }
    e.preventDefault();
    const { touchSnapshot: touchChangeSnapshot } = this;
    if (!touchChangeSnapshot) {
      return;
    }
    if (touches.length === 1) {
      const touch = touches[0]!;
      this.move(sub(touch, touchChangeSnapshot.touches[0]!));
    } else {
      const [a1, b1] = touches;
      const [a2, b2] = touchChangeSnapshot.touches;
      if (!(a1 && a2 && b1 && b2)) {
        return;
      }
      const c1 = average(a1, b1);
      const c2 = average(a2, b2);
      const movement = sub(c1, c2);
      const scale = radius(sub(a1, b1)) / radius(sub(a2, b2));
      this.zoom(average(c1, c2), scale * touchChangeSnapshot.image.scale);
      this.move(movement);
    }
    this.touchSnapshot = {
      image: clone(this.transform),
      touches,
    };
    this.schedule();
  };

  private handleWheel = (e: WheelEvent) => {
    const imageArea = this.imageArea;
    if (!imageArea) {
      return;
    }
    if (this.options.bound.image && !contains(imageArea, this.getClickPoint(e))) {
      return;
    }
    e.preventDefault();
    const { deltaY } = e;
    if (deltaY == null) {
      // not supported
      return;
    }
    const scale = deltaY < 0 ? 1.5 : 1 / 1.5;
    this.zoom(this.getClickPoint(e), scale * this.transform.scale);
    this.schedule();
  };

  private getClickPoint(e: MouseEvent) {
    return zoom(getMouseOffset(e), this.baseZoom);
  }

  private getTouchPoints(e: TouchEvent) {
    const { baseZoom } = this;
    return Array.from(e.touches).map((touch) => zoom(getTouchOffset(touch), baseZoom));
  }

  //#endregion

  //#region methods
  async clip(options?: ImageEncodeOptions) {
    const canvas = new OffscreenCanvas(...expand(fromSize(this.canvas)));
    const context = canvas.getContext("2d")!;
    const path2d = this.createClip();
    const { clipArea } = this;
    context.clip(path2d);
    this.drawImage(context);
    const exportImageData = context.getImageData(...expand(clipArea.position), ...expand(clipArea.size));
    const exportBitmap = await createImageBitmap(exportImageData);
    const exportCanvas = new OffscreenCanvas(...expand(clipArea.size));
    exportCanvas.getContext("bitmaprenderer")!.transferFromImageBitmap(exportBitmap);
    const blob = await exportCanvas.convertToBlob(options);
    exportBitmap.close();
    return blob;
  }
  //#endregion
}
