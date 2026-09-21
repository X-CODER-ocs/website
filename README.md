# cangjie-site

个人主页。视觉语言参照 [tiouo.cc](https://tiouo.cc) 重建，但换成了**正经的 Vue 3 + Vite 源码工程**——原站只能拿到压缩混淆过的构建产物，改不动。

## 快速开始

```bash
npm install
npm run dev        # → http://127.0.0.1:5178
```

打包：

```bash
npm run build      # 产物在 dist/，纯静态，丢哪都能跑
npm run preview    # 本地预览打包结果
```

## 改内容：只动一个文件

日常改文字、链接、项目列表，**只需要改 `src/data/site.js`**，存盘浏览器会自动热更新。

| 想改什么 | 改哪里 |
|---|---|
| 名字、终端提示符 | `site.name` / `site.user` / `site.host` |
| 页脚超大水印 | `site.watermark`（别超过 6 个字符，它是 `24vw` 撑满屏宽的） |
| 首屏终端文案 | `site.terminal.*` |
| 社交图标 | `site.socials`——**`url` 留空字符串这一项就不显示**，填上自动出现 |
| 项目列表 | `site.projects`；整个区不想要就把 `showProjects` 设成 `false` |
| 自我介绍 | `site.about.paragraphs` |
| 联系方式链接 | `site.contact.url`（QQ 加好友短链，点 Contact 直接跳转） |

## 中英双语

站点自带中英切换，**默认跟随浏览器语言**，用户手动切过的选择会记在 `localStorage` 里。

约定很简单：`site.js` 里任何写成 `{ zh: '…', en: '…' }` 的字段都会跟着语言走，
模板里用 `t(...)` 取值就行（实现只有 60 行，见 `src/composables/useLocale.js`）：

```js
motto: { zh: '迎着所有不确定，勇往直前。', en: 'Forge ahead bravely…' }
```

```html
<p>{{ t(site.terminal.motto) }}</p>
```

项目名、链接、颜色这些语言无关的字段照旧直接写字符串，`t()` 会原样返回。
切换按钮在首屏社交图标那一行的末尾（写着「中」或「EN」），点一下切换。

## 换头像

头像不是普通图片——它是**一帧一帧用字符画出来的像素画**。换的时候要重新生成像素矩阵：

```bash
# 1. 把你的照片放进 public/，命名 avatar.png
# 2. 重新生成
npm run pixels
```

脚本一条龙做完三件事：

| 输出 | 用途 |
|---|---|
| `src/data/pixels.js` | 像素矩阵，宽屏那个逐帧显影的像素画用它 |
| `tools/preview.png` | 预览图，按真实观感渲染，先看像不像再决定 |
| `public/avatar-cutout.png` | 抠完背景、裁到主体的版本，窄屏的圆形头像用它 |

**它会自动抠背景 + 裁到主体**，你不用手动处理：

- 抠底用 flood-fill 从四角往里吃，只吃「与边缘连通」的纯色区域，所以主体内部的同色块不会被误伤
- 填成纯黑之后 `getbbox()` 天然把黑色当空白，主体包围盒直接就有了，再扩成正方形（四周留 6% 呼吸空间）
- 所以白底/纯色底的图丢进去就行，黑站点上不会出现一个大白方块

不想要这些处理就关掉：

```bash
python3 tools/make-pixels.py --no-bg          # 不抠背景
python3 tools/make-pixels.py --no-trim        # 不裁剪，保留原始构图
python3 tools/make-pixels.py ~/Downloads/me.jpg   # 指定别的图片
python3 tools/make-pixels.py --rows 48        # 提高精度（列数自动跟着变）
python3 tools/make-pixels.py --placeholder    # 换回程序化占位图
```

> 脚本依赖 Pillow（`pip install Pillow`）。这台机器的系统 `python3` 已经自带。
> 注意：`--no-bg` 时 `avatar-cutout.png` 会退化成原图的直接拷贝，配置里引用的文件始终存在。

## 像素画的原理

这是整站最容易踩坑的地方，值得单独说清楚。

网页上每个"像素"其实是一个 `█` 字符。而**字符格子不是正方形**——它是 **6px 宽 × 13px 高**的竖长条。

所以矩阵必须先反向拉宽，才能在显示时被压回正常比例：

```
列数 = 行数 × (图宽 / 图高) × (格子高 / 格子宽)
     = 行数 × (图宽 / 图高) × (13 / 6)
```

1:1 的正方图、36 行 → `36 × 1 × 2.1667 = 78` 列。
渲染出来是 `78 × 6 = 468px` 宽、`36 × 13 = 468px` 高，正好还原成正方形。

**矩阵比例错了，画面就会横向拉长。** 这就是 `tools/make-pixels.py` 存在的意义——它替你算这个比例，你只要给图片。

顺带一提：阿里妈妈方圆体里根本没有 `█` 这个字形，浏览器实际用的是 `monospace` 回退字体。所以 `.pixel` 的宽高在 CSS 里被**写死**了，不靠字体度量，跨平台不会漂。

## 目录结构

```
cangjie-site/
├── index.html                     入口
├── vite.config.js                 构建配置（base: './'，放子路径也不会 404）
├── .github/workflows/deploy.yml   push 到 main 就自动构建并发布到 Pages
├── public/                        原样拷贝到产物根目录
│   ├── avatar.png                 头像原图（换这个，然后跑 npm run pixels）
│   ├── avatar-cutout.png          抠底版（脚本生成，窄屏圆形头像用）
│   └── favicon.svg
├── src/
│   ├── main.js
│   ├── App.vue                    组合根
│   ├── assets/fonts/              阿里妈妈方圆体 VF（2.6MB）
│   ├── styles/global.css          网格背景、像素格子尺寸、全局变量
│   ├── composables/
│   │   └── useLocale.js           中英切换：locale 状态 + t() 取值
│   ├── data/
│   │   ├── site.js                ← 内容配置，日常只改这个
│   │   ├── icons.js               SVG 图标素材
│   │   └── pixels.js              像素矩阵（自动生成，别手改）
│   └── components/
│       ├── LayoutView.vue         骨架：双层滚动背景 / 回顶
│       ├── TitleBar.vue           顶栏
│       ├── HeaderView.vue         首屏
│       ├── ProjectsSection.vue    关于 + 项目
│       └── FooterView.vue         页脚
├── tests/pixels.test.js           jsdom 挂载测试
└── tools/
    ├── make-pixels.py             像素矩阵生成器（换头像）
    ├── import-contact.py          联系方式图导入
    ├── smoke.mjs                  SSR 冒烟测试
    └── preview.png                生成结果预览（自动产出）
```

## 换联系方式二维码

不用自己抠图裁图。截图丢给脚本就行：

```bash
python3 tools/import-contact.py                    # 自动找桌面最新的截图
python3 tools/import-contact.py 某张图.png         # 指定图片
python3 tools/import-contact.py --clipboard        # 从剪贴板取（Cmd+Ctrl+Shift+4 截的）
```

两种图它都认：

| 图长什么样 | 怎么处理 |
|---|---|
| **名片式长图**（头像 + 昵称 + QQ 号 + 二维码 + 水印） | 默认**保持长方形**，只裁掉多余白边、四周补 3% 留白 |
| **纯二维码图** | 加 `--qr-only --square`：只留二维码，并补回静默区 |

`--square` 那个静默区值得单说：二维码四周必须留白才扫得出来，**自己截图裁太紧贴上去就会扫不出来**，
这是最容易翻车的地方。默认四周各 8%，可以 `--quiet 0.12` 加宽。

弹窗布局也跟着调了：竖长图按**高度**收敛、横图按宽度收敛，两者都给下面那行提示文字留了位置，不会顶出屏幕。

## 相比原站改了什么

扒下来之后发现原站有两处功能其实**没在跑**——代码和样式都在包里，但渲染出来是空的。这个版本把它们接上了：

| | 原站 | 这个版本 |
|---|---|---|
| 像素头像 | **死代码**。渲染函数往一个 `ref` 上 appendChild，但那个 ref 从来没绑定到任何元素（`avatar-container` 在整个 JS 里出现 0 次），所以 `if (!el) return` 直接返回，2844 个 RGB 值和整套逐帧逻辑白写 | 真正实现，逐帧显影正常工作 |
| 作品集区 | **空壳**。5 个项目数据完整定义还排了序，但没赋给变量直接丢弃；render 返回 `j("",!0)` 只输出一个注释节点 | 做出来了，带滚动进场动画 |
| `FotterView` | 组件名拼错了（少个 o） | 改成 `FooterView` |
| 联系方式 | Hero 用 `i@tiouo.xyz`、页脚用 `tiouo@qq.com`、弹窗写 QQ 号，三处不一致 | 统一在 `site.contact` 配置 |

另外原站把 5 个组件全塞在一个 61KB 的 chunk 里，这里拆成了正经的 SFC，每个组件一个文件一份样式。

## 字体授权

`src/assets/fonts/AlimamaFangYuanTi-VF.ttf` 是**阿里妈妈方圆体**，阿里妈妈官方发布的免费商用字体（个人和企业都可免费商用），不是从原站"继承"来的版权内容。

2.6MB 是整站最重的资源，占了 86%。如果在意首屏，可以转成 `woff2`（通常能砍掉一半以上）：

```bash
pip install fonttools brotli
fonttools ttLib.woff2 compress -o AlimamaFangYuanTi.woff2 AlimamaFangYuanTi-VF.ttf
```

然后把 `global.css` 里的 `@font-face` 换成 `.woff2`。

## 自测

```bash
npm run smoke   # SSR 冒烟：整棵树渲染成 HTML 再断言关键内容（14 项）
npm test        # jsdom 真实挂载：像素画逐帧显影、中英切换、链接跳转（11 项）
```

两个测试是互补的。SSR 跑不到 `onMounted`，而像素画的渲染逻辑恰恰全在 `onMounted` 里，
所以另外有一组放进 jsdom 里真挂一次组件 —— `npm test` 会实际等到 2808 个像素全部画完才断言，
并且会检查它在中途**没有**一次画满（确认"逐帧"这个行为本身是对的）。

## 部署

**已经配好了，推上去就生效。** 仓库 `X-CODER-ocs/website` 的 Pages 发布源设成了
**GitHub Actions**（不是从分支发布），`.github/workflows/deploy.yml` 会在每次 push 到 `main` 时
跑 `npm test` → `npm run build` → 发布 `dist/`。

- 线上地址：**https://x-coder-ocs.github.io/website/**
- 看部署状态：`gh run list --repo X-CODER-ocs/website`
- 手动触发：仓库 Actions 页点 "Run workflow"

产物是纯静态 + 相对路径（`base: './'`），所以换别的托管也不用改配置：

- **Vercel / Netlify**：导入仓库，框架选 Vite，零配置
- **纯本地**：`npm run build` 后直接双击 `dist/index.html` 也能打开

## 许可

代码随便用。字体遵循阿里妈妈的免费商用条款。图标来自 Simple Icons（CC0）和 Font Awesome Free（CC BY 4.0）。
