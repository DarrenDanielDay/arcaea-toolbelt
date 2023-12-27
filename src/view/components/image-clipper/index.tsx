import { sheet as dialogSheet } from "../fancy-dialog/style.css.js";
import { sheet } from "./style.css.js";
import { Component, HyplateElement, element } from "hyplate";
import { bootstrap } from "../../styles";
import { ClipConfig, ImageClipperCanvasController, Size } from "../../../utils/image-clip";

export
@Component({
  tag: "image-clipper",
  styles: [bootstrap, dialogSheet, sheet],
})
class ImageClipper extends HyplateElement {
  dialog = element("dialog");
  canvas = element("canvas");
  controller = new ImageClipperCanvasController(this.canvas);

  override render() {
    return (
      <dialog ref={this.dialog} onCancel={(e) => e.preventDefault()}>
        <canvas ref={this.canvas}></canvas>
        <p>电脑操作：鼠标拖动可移动图片，按住Ctrl+鼠标拖动可放缩，也可滚轮放缩</p>
        <div class="actions">
          <button type="button" class="btn btn-primary" onClick={() => this.dialog.close()}>
            裁剪
          </button>
        </div>
      </dialog>
    );
  }

  clip(image: ImageBitmap, clipConfig: ClipConfig, canvasSize: Size) {
    return new Promise<Blob>((resolve) => {
      this.canvas.width = canvasSize.width;
      this.canvas.height = canvasSize.height;
      this.controller.setImage(image);
      this.controller.setClip(clipConfig);
      const stop = this.controller.start();
      this.dialog.onclose = async () => {
        stop();
        const blob = await this.controller.clip();
        resolve(blob);
      };
      this.dialog.showModal();
      const { width } = this.dialog.getBoundingClientRect();
      const x = width - 32;
      this.canvas.style.width = `${x}px`;
      this.canvas.style.height = `${(canvasSize.height * x) / canvasSize.width}px`;
    });
  }
}
