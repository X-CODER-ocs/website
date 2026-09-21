/**
 * 冒烟测试：借用 Vite 的 SSR 能力，把整个应用渲染成 HTML 字符串。
 *
 * 目的是确认组件真的能挂载、模板没有语法错、setup 里没抛异常、
 * 关键内容确实出现在输出里 —— 这些光看 build 成功是看不出来的。
 *
 * 运行：npm run smoke
 */
import { createServer } from 'vite'
import { createSSRApp } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const vite = await createServer({
  root,
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'warn',
})

try {
  // vue 本身由 Node 直接解析（Vite 在 SSR 下会把 node_modules 外部化，
  // 所以 .vue 里 import 的 vue 和这里是同一个实例）；只有 .vue 需要交给 Vite 编译
  const { default: App } = await vite.ssrLoadModule('/src/App.vue')

  const html = await renderToString(createSSRApp(App))

  const checks = [
    ['终端提示符 xlord@cangjie', /xlord@cangjie/],
    ['终端命令 whoami', /whoami/],
    ['首屏输出名', />xLord_cangjie</],
    ['角色行', /Full-stack Developer/],
    ['引言', /Forge ahead bravely/],
    ['社交图标（内联 SVG）', /<svg/],
    ['像素画容器', /pixel-canvas/],
    ['像素矩阵尺寸变量', /--cols:\s*78/],
    ['顶栏', /title-container/],
    ['关于区锚点', /id="about"/],
    ['项目卡片', /project-card/],
    ['项目名 MChub', /MChub/],
    ['页脚超大水印', /brand-text/],
    ['版权年份', /©\s*20\d\d/],
  ]

  let failed = 0
  for (const [label, re] of checks) {
    const ok = re.test(html)
    if (!ok) failed++
    console.log(`  ${ok ? '✓' : '✗'}  ${label}`)
  }

  console.log(`\n渲染输出 ${html.length} 字符`)
  console.log(failed === 0 ? '全部通过' : `${failed} 项未通过`)
  process.exitCode = failed === 0 ? 0 : 1
} catch (err) {
  console.error('\n渲染失败:')
  console.error(err)
  process.exitCode = 1
} finally {
  await vite.close()
}
