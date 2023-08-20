import "bootstrap/dist/css/bootstrap.css";
import { mount } from "hyplate";
import { generate } from "./auto-generate-data-files";

mount(
  <div class="m-3">
    <div class="row">
      <div class="col">
        <button class="btn btn-primary" onClick={generate}>
          生成数据
        </button>
      </div>
    </div>
  </div>,
  document.body
);
