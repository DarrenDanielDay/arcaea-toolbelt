export const protocol = "arcaea-toolbelt:";

export const toolbelt = {
  data: (path: string) => new URL(path, `${protocol}//data/`),
  assets: (path: string) => new URL(path, `${protocol}//assets/`),
};

/**
 * Arcaea Toolbelt所需游戏相关核心数据的缓存模型。
 * 这些数据不常变化，由于使用GitHub Pages部署，maxage固定600，导致内容无法被合理缓存，
 * 浪费带宽，此模型用于indexedDB缓存，以减少流量，加速二次访问。
 * 部署的子路径是唯一标识，除了meta.json，其他均根据meta内的hash判定是否存在内容更新。
 */
export interface ToolbeltCoreData {
  /**
   * 部署的子路径
   */
  path: string;
  /**
   * 内容版本散列
   */
  hash: string;
  /**
   * 数据主体，直接以对象形式存储
   */
  content: any;
}
