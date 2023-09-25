import "bootstrap/dist/css/bootstrap.css";
import "../view/components/fancy-dialog/style.css";
import { AutoRender, computed, element, mount, nil, signal } from "hyplate";
import { generate, generateVersionMeta } from "./auto-generate-data-files";
import { APKResponse, downloadToLocal, getLatestVersion } from "./get-latest-version";
import { FC, Signal } from "hyplate/types";
import { JSXChildNode } from "hyplate/types";
import { apkName, getProjectRootDirectory } from "./shared";

function createModal() {
  const dialog = element("dialog");
  const content = signal(nil);
  dialog.onclose = () => {
    content.set(nil);
  };
  return [
    dialog,
    content,
    <dialog ref={dialog}>
      <AutoRender>{() => content()}</AutoRender>
    </dialog>,
  ] as const;
}

const [latestDialog, latestContent, latest] = createModal();
const [progressDialog, progressContent, progress] = createModal();
const [alertDialog, alertContent, alert] = createModal();

const selectedVersion = signal("");

function showAlert(msg: JSXChildNode) {
  alertContent.set(
    <Modal
      footer={
        <button class="btn btn-primary" onClick={() => alertDialog.close()}>
          确定
        </button>
      }
    >
      {msg}
    </Modal>
  );
  alertDialog.showModal();
}

progressDialog.oncancel = (e) => e.preventDefault();

const Modal: FC<{ footer?: JSXChildNode }, JSXChildNode> = ({ children, footer }) => {
  return (
    <div class="modal-root">
      <div class="modal-content mb-3">{children}</div>
      <div class="modal-footer">{footer ?? nil}</div>
    </div>
  );
};

const APKInfo: FC<{ apkInfo: APKResponse }> = ({ apkInfo }) => {
  const { url, version } = apkInfo;
  const downloadDirectly = async () => {
    const total = signal(0),
      received = signal(0);
    const controller = new AbortController();
    progressContent.set(<ProgressModal now={received} total={total} controller={controller}></ProgressModal>);
    try {
      const projectRoot = await getProjectRootDirectory();
      progressDialog.showModal();
      await downloadToLocal(projectRoot, apkInfo, total, received, controller.signal);
      showAlert(<div>下载完成</div>);
    } finally {
      progressDialog.close();
    }
  };
  return (
    <Modal
      footer={[
        <button class="btn btn-primary" onClick={downloadDirectly}>
          直接下载到项目内
        </button>,
        <button class="btn btn-secondary" onClick={() => generateVersionMeta(apkInfo)}>
          生成meta
        </button>,
        <button class="btn btn-danger" onClick={() => latestDialog.close()}>
          关闭
        </button>,
      ]}
    >
      <div>
        <span>版本：</span>
        <span>{version}</span>
      </div>
      <div>
        <span>下载链接：</span>
      </div>
      <div>
        <span>
          <a href={url} download={apkName(version)} class="text-break">
            {url}
          </a>
        </span>
      </div>
    </Modal>
  );
};

const ProgressModal: FC<{ total: Signal<number>; now: Signal<number>; controller?: AbortController }> = ({
  total,
  now,
  controller,
}) => {
  return (
    <Modal
      footer={
        controller ? (
          <button
            class="btn btn-danger"
            onClick={() => {
              controller.abort();
            }}
          >
            取消
          </button>
        ) : undefined
      }
    >
      <div class="m-3">
        下载进度：{now} Byte / {total} Byte
      </div>
      <div role="progressbar" class="progress" aria-aria-valuemin={0} aria-valuemax={total} aria-valuenow={now}>
        <div class="progress-bar" style:width={computed(() => `${(now() / total()) * 100 || 0}%`)}></div>
      </div>
    </Modal>
  );
};

mount(
  <div class="m-3">
    <div class="row my-3">
      <div class="col-auto">
        <button
          class="btn btn-primary"
          onClick={async () => {
            const apkInfo = await getLatestVersion();
            selectedVersion.set(apkInfo.version);
            latestContent.set(<APKInfo apkInfo={apkInfo}></APKInfo>);
            latestDialog.showModal();
          }}
        >
          获取最新版本
        </button>
      </div>
    </div>
    <form>
      <div class="row my-3">
        <div class="col-auto">
          <label for="version" class="col-form-label">
            版本
          </label>
        </div>
        <div class="col-auto">
          <input id="version" class="form-control" h-model={selectedVersion} required></input>
        </div>
        <div class="col-auto">
          <button
            type="button"
            class="btn btn-primary"
            onClick={async function () {
              if (!this.form!.reportValidity()) return;
              const version = selectedVersion();
              await generate(version);
              showAlert("生成完毕");
            }}
          >
            生成数据文件
          </button>
        </div>
      </div>
    </form>
    {latest}
    {progress}
    {alert}
  </div>,
  document.querySelector("main")!
);
