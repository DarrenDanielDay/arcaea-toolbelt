import { sheet } from "./style.css.js";
import { Component, Future, HyplateElement } from "hyplate";
import { bootstrap } from "../../styles";
import { Inject } from "../../../services/di.js";
import { $Logger, Logger, LogLevel } from "../../../services/declarations.js";
import { formatDateTime, formatTime } from "../../../utils/string.js";
import { FC } from "hyplate/types";
import { confirm, FancyDialog } from "../fancy-dialog/index.js";
import { isString } from "../../../utils/misc.js";

export
@Component({
  tag: "logger-panel",
  styles: [bootstrap, sheet],
})
class LoggerPanel extends HyplateElement {
  @Inject($Logger)
  accessor logger!: Logger;

  override render() {
    return (
      <Future promise={this.logger.getHistory()}>
        {(logs) => (
          <div>
            {logs.map((log) => {
              const date = new Date(log.timestamp);
              return (
                <details>
                  <summary class="log-item">
                    <span class="time" title={formatDateTime(date)}>
                      {formatTime(date)}
                    </span>
                    <span class="level" var:log-level={`var(--log-level-${log.level})`}>
                      {this.level(log.level)}
                    </span>
                    <span class="log-content">
                      {log.content.map((item) => (
                        <span class="loggable">{isString(item) ? item : JSON.stringify(item)}</span>
                      ))}
                    </span>
                  </summary>
                  <pre>{log.stack}</pre>
                </details>
              );
            })}
          </div>
        )}
      </Future>
    );
  }

  level(level: LogLevel) {
    switch (level) {
      case LogLevel.Warning:
        return "warn";
      default:
        return LogLevel[level].toLowerCase();
    }
  }
}

export const LoggerButton: FC<{ title?: string }> = ({ title }) => {
  const dialog = new FancyDialog();
  const panel = new LoggerPanel();
  return (
    <>
      <button
        type="button"
        class="btn btn-secondary"
        onClick={() => {
          const delLogs = async () => {
            if (await confirm("确认删除日志？")) {
              await panel.logger.clear();
            }
          };
          dialog.showConfirm(
            <div>
              <h3>日志</h3>
              {panel}
            </div>,
            (done, cancel) => {
              return [
                <button type="button" class="btn btn-danger" onClick={() => delLogs().then(done)}>
                  删除日志
                </button>,
                <button type="button" class="btn btn-primary" onClick={cancel}>
                  关闭
                </button>,
              ];
            }
          );
        }}
      >
        {title ?? "查看日志"}
      </button>
      <fancy-dialog ref={dialog}></fancy-dialog>
    </>
  );
};
