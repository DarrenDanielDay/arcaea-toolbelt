# Arcaea Toolbelt

[Arcaea](https://arcaea.lowiro.com/)相关在线工具

工具主体：

<https://darrendanielday.github.io/arcaea-toolbelt>

定数、搭档、地图等数据 & 数据维护工具：

<https://github.com/DarrenDanielDay/arcaea-toolbelt-data>

Arcaea Online 高仿 Best 30 图生成器

<https://github.com/DarrenDanielDay/arcaea-toolbelt-aol-b30>

---

```txt
回来吧查分机器人😭
我最骄傲的信仰😭
历历在目的r10😭
眼泪莫名在流淌😭
依稀记得b30😭
还有给力的成绩😭
把616给打退😭
就算三星也不累😭
```

## 功能 & TODO

[主站](https://darrendanielday.github.io/arcaea-toolbelt)功能：

- [x] 手动录入成绩 & 单曲潜力值计算
- [x] `st3`存档成绩导入
- [x] `b30/r10`计算 & `b39`看板 & 导出图片
- [x] 存档内成绩查询 & 统计
- [x] 定数范围查谱 & 随机谱面抽取 & 新版本定数速递
- [x] 世界模式地图预览
- [x] 世界模式剩余进度计算
- [x] 世界模式步数正算
- [x] 世界模式控步数逆算
- [ ] Beyond 绳子相关计算

配套脚本工具功能：

- [x] 查看注册时间
- [x] ~~Web API 查分~~
- [x] 获取角色精确数据
- [x] 基于 Beyond 能量槽的谱面定数测算
- [x] 好友最近游玩记录一览

## For developers

1. Clone all repos in same directory:

```sh
mkdir DarrenDanielDay     # You can use any other directory name.
cd DarrenDanielDay
git clone https://github.com/DarrenDanielDay/arcaea-toolbelt
git clone https://github.com/DarrenDanielDay/arcaea-toolbelt-data
git clone https://github.com/DarrenDanielDay/arcaea-toolbelt-aol-b30
```

2. Install dependencies for all repos ([Node.JS](https://nodejs.org) >= 18 is required):

```sh
# install dependencies & start dev mode
# should be run in different terminal

# terminal 1 the main site
cd DarrenDanielDay/arcaea-toolbelt
npm install
npm run start

# terminal 2 the data site
cd DarrenDanielDay/arcaea-toolbelt-data
npm install
npm run start

# terminal 3 the player b30 generator template site (optional)
cd DarrenDanielDay/arcaea-toolbelt-aol-b30
npm install
npm run start
```

And then open <http://localhost:1234> in a modern browser.

Open <http://localhost:1236> for data tools.

To debug in [`Microsoft Edge`](https://www.microsoft.com/edge) with [`vscode`](https://code.visualstudio.com), press `F5`.

References of third-party libraries:

- [parcel](https://parceljs.org/)
- [sql.js](https://sql.js.org)

You'll see `JSX` code in components, but this project is **NOT** using [`react`](https://react.dev) or [`solidjs`](https://www.solidjs.com). This project is a trial of my own UI library for building [`Web Components`](https://developer.mozilla.org/en-US/docs/Web/API/Web_components) called [`hyplate`](https://github.com/DarrenDanielDay/hyplate).

## Thanks to

- [Arcaea 中文 Wiki](https://wiki.arcaea.cn/)
- [Arcaea-Infinity](Arcaea-Infinity)
- [YukiChan](https://github.com/bsdayo/YukiChan/)

## License

MIT License

以后可能会换成[616SB License](https://github.com/Arcaea-Infinity/616SBLicense)（
