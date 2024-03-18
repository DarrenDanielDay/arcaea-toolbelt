import { docsPage } from "../shared";
import html from "bundle-text:./index.html";
import { query } from "../../utils/component";
import { download } from "../../utils/download";

docsPage(html);

function parseWindowsPath(value: string) {
  const pattern = /^(\w:)([\\\/]\w+)*/;
  const match = value.match(pattern);
  if (!match) return null;
  const [_, root, rest] = match;
  return {
    root,
    rest,
  };
}

function isValidPath(value: string) {
  const parsed = parseWindowsPath(value);
  if (!parsed) return false;
  const { root } = parsed;
  return !!root;
}

function generateScriptContent(
  installOrShellPath: string,
  port: number,
  exportFolder: string
): [valid: boolean, content: string] {
  if (!isValidPath(installOrShellPath)) {
    return [false, "MuMu模拟器安装路径或shell路径不正确"];
  }
  const maxPort = 65535;
  if (isNaN(port) || port < 0 || port > maxPort) {
    return [false, `端口不正确，应当是0~${maxPort}的整数`];
  }
  if (!isValidPath(exportFolder)) {
    return [false, "导出路径不正确"];
  }
  const { root } = parseWindowsPath(installOrShellPath)!;
  const shellPath =
    installOrShellPath.split(/[\\\/]/).at(-1) === "shell"
      ? installOrShellPath
      : installOrShellPath.replace(/[\\\/]?$/, "\\shell");
  return [
    true,
    `\
${root}
cd "${shellPath}"
.\\adb.exe root
.\\adb.exe kill-server
.\\adb.exe start-server
.\\adb.exe connect 127.0.0.1:${port}
.\\adb.exe -s 127.0.0.1:${port} pull /data/data/moe.low.arc/files/st3 "${exportFolder}"
pause
`,
  ];
}

function bindInputs() {
  const { installPath, port, exportPath, scriptContent, downloadScript } = query({
    installPath: "input#install-path",
    port: "input#port",
    exportPath: "input#export-path",
    scriptContent: "div#script-content",
    downloadScript: "button#download-script",
  } as const)(document.body);
  let script = "";
  let valid = false;
  function updateScript() {
    [valid, script] = generateScriptContent(installPath.value, port.valueAsNumber, exportPath.value);
  }
  function handleChange() {
    updateScript();
    scriptContent.textContent = script;
    downloadScript.disabled = !valid;
  }
  function downloadScriptFile() {
    if (valid) {
      download(URL.createObjectURL(new Blob([script], { type: "text/plain" })), "extract-st3.bat");
    }
  }
  for (const input of [installPath, port, exportPath]) {
    input.oninput = handleChange;
    input.onchange = handleChange;
    input.onpaste = handleChange;
  }
  downloadScript.onclick = downloadScriptFile;
  handleChange();
}

bindInputs();
