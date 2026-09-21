import { icons } from './icons.js'

/**
 * ============================================================
 *  站点内容配置 —— 日常只改这个文件就够了
 * ============================================================
 *
 *  关于双语：凡是 `{ zh: '…', en: '…' }` 这样的字段都会跟着语言切换走
 *  （取值逻辑在 src/composables/useLocale.js 的 t()）。
 *  项目名、链接、颜色这些语言无关的照旧直接写字符串。
 */

// QQ 加好友短链。Contact 按钮和社交图标共用这一个，想换联系方式改这一行就够
const QQ_LINK = 'https://qm.qq.com/q/Jjjl1fH1OE'

export const site = {
  /* ---------- 1. 身份（语言无关） ---------- */

  name: 'xLord_cangjie',
  // 页脚超大水印用的短名，会用 24vw 字号撑满屏幕宽度，别超过 6 个字符
  watermark: 'xLord',
  // 终端提示符 xlord@cangjie
  user: 'xlord',
  host: 'cangjie',

  /* ---------- 2. 首屏终端文案 ---------- */

  terminal: {
    // 命令本身不翻译，保持 whoami 才有终端味
    command: 'whoami',
    output: 'xLord_cangjie',
    roles: {
      zh: ['全栈开发', '开源共建者'],
      en: ['Full-stack Developer', 'Open Source Builder'],
    },
    // 左边竖线那段引言
    motto: {
      zh: '迎着所有不确定，勇往直前。',
      en: 'Forge ahead bravely against all uncertainties.',
    },
    // 最后一行 // 开头的碎碎念，留空则不显示
    status: {
      zh: '做真正跑得起来的东西。',
      en: 'Building things that actually work.',
    },
  },

  /* ---------- 3. 头像 ---------- */
  // 换头像：把新照片覆盖 public/avatar.png，然后跑 `npm run pixels`
  // 这张是脚本抠完背景、裁到主体的版本，窄屏的圆形头像用它；
  // 宽屏那个像素画走的是 src/data/pixels.js 里的矩阵，不用管这里
  avatar: './avatar-cutout.png',

  /* ---------- 4. 联系方式 ---------- */
  // 点 Contact / Get in Touch 直接打开这个链接
  contact: {
    url: QQ_LINK,
  },

  /* ---------- 5. 社交链接 ---------- */
  // url 留空字符串 = 该项不显示，填上就自动出现
  socials: [
    { name: 'GitHub', icon: icons.github, url: 'https://github.com/X-CODER-ocs', color: '#ffffff' },
    { name: 'Bilibili', icon: icons.bilibili, url: '', color: '#00aeec' },
    { name: 'Email', icon: icons.mail, url: '', color: '#f47060' },
    { name: 'QQ', icon: icons.qq, url: QQ_LINK, color: '#db9807' },
  ],

  /* ---------- 6. 关于区 ---------- */
  // TODO 这两段是我按印象写的，换成你自己的话
  about: {
    title: { zh: '关于', en: 'About' },
    workTitle: { zh: '项目', en: 'Work' },
    paragraphs: {
      zh: [
        '我做跨平台应用和开发工具，主要围绕 .NET 生态和现代 Web 技术栈——比起代码写得多漂亮，我更在意它是不是真的能跑起来。',
        '目前在组织 Open Code Studio，维护几个开源项目，偶尔也做点和 Minecraft 相关的东西。',
      ],
      en: [
        'I build cross-platform applications and developer tooling, mostly around the .NET ecosystem and the modern web stack — and I care more about whether something actually runs than how clever it looks.',
        'Currently organizing Open Code Studio, maintaining a few open source projects, and occasionally shipping Minecraft-related things.',
      ],
    },
  },

  /* ---------- 7. 项目列表 ---------- */
  // 不想展示项目区就设成 false
  showProjects: true,
  // TODO 仓库链接请核对一遍，我按记忆填的
  projects: [
    {
      name: 'MChub',
      url: 'https://github.com/CodeHub-develop/MChub',
      description: {
        zh: '基于 .NET 10 和 Avalonia 的跨平台工作台。',
        en: 'A cross-platform workspace built on .NET 10 and Avalonia.',
      },
      tags: [
        { name: '.NET 10', color: [139, 69, 167] },
        { name: 'Avalonia', color: [139, 69, 167] },
        { name: 'App', color: [1, 220, 255] },
      ],
    },
    {
      name: 'JVM-MCL-Server',
      url: 'https://github.com/Open-code-Studio/JMCL-for-servers',
      description: {
        zh: '带网页控制面板的无界面 Minecraft 服务端启动器。',
        en: 'Headless Minecraft server launcher with a web control panel.',
      },
      tags: [
        { name: 'Spring Boot', color: [23, 134, 0] },
        { name: 'React', color: [65, 184, 131] },
        { name: 'Docker', color: [0, 191, 255] },
      ],
    },
    {
      name: 'open-panel',
      url: 'https://github.com/Open-code-Studio/open-panel',
      description: {
        zh: '用 Flutter 写的跨平台远程控制面板。',
        en: 'Cross-platform remote control panel built with Flutter.',
      },
      tags: [
        { name: 'Flutter', color: [65, 184, 131] },
        { name: 'Dart', color: [0, 191, 255] },
        { name: 'App', color: [1, 220, 255] },
      ],
    },
    {
      name: 'OWD.K-MD3',
      url: 'https://github.com/Open-code-Studio',
      description: {
        zh: '遵循 Material Design 3 的配置驱动文档框架。',
        en: 'A config-driven documentation framework following Material Design 3.',
      },
      tags: [
        { name: 'TypeScript', color: [0, 191, 255] },
        { name: 'MD3', color: [206, 103, 141] },
      ],
    },
  ],

  /* ---------- 8. 页脚 ---------- */

  footer: {
    copyright: {
      zh: '用热爱和代码打造。',
      en: 'Crafted with passion and code.',
    },
    // 版权归属跳转链接
    ownerUrl: 'https://github.com/X-CODER-ocs',
  },

  /* ---------- 9. 按钮文案 ---------- */

  buttons: {
    about: { zh: '关于', en: 'About' },
    contact: { zh: '联系我', en: 'Get in Touch' },
    topbarContact: { zh: '联系', en: 'Contact' },
  },
}

export default site
