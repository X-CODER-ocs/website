/**
 * 像素头像的真实挂载测试。
 *
 * SSR 冒烟（tools/smoke.mjs）跑不到 onMounted 里的逻辑，而像素画的逐帧显影
 * 恰恰整个都在那儿。这里放到 jsdom 里真挂一次组件，确认它真的画得出来。
 *
 * 运行：npm test
 */
import { describe, it, expect, afterEach } from 'vitest'
import { createApp, nextTick } from 'vue'
import HeaderView from '../src/components/HeaderView.vue'
import LayoutView from '../src/components/LayoutView.vue'
import { pixels, pixelCols, pixelRows } from '../src/data/pixels.js'
import { setLocale } from '../src/composables/useLocale.js'

const TOTAL = pixelCols * pixelRows

let mounted = []

function mount(Component) {
  const root = document.createElement('div')
  document.body.appendChild(root)
  const app = createApp(Component)
  app.mount(root)
  const entry = { root, app }
  mounted.push(entry)
  return entry
}

async function waitFor(predicate, timeout = 10000) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    if (predicate()) return true
    await new Promise((r) => setTimeout(r, 40))
  }
  return predicate()
}

afterEach(() => {
  mounted.forEach(({ root, app }) => {
    try {
      app.unmount()
      root.remove()
    } catch {
      /* 清理失败无所谓 */
    }
  })
  mounted = []
})

describe('像素矩阵数据', () => {
  it('是 78 列 x 36 行的二维数组', () => {
    expect(pixelCols).toBe(78)
    expect(pixelRows).toBe(36)
    expect(pixels).toHaveLength(pixelRows)
    for (const row of pixels) {
      expect(row).toHaveLength(pixelCols)
    }
    expect(pixels.flat()).toHaveLength(TOTAL)
  })

  it('每个像素都是合法的 0-255 整数 RGB', () => {
    for (const [r, g, b] of pixels.flat()) {
      for (const v of [r, g, b]) {
        expect(Number.isInteger(v)).toBe(true)
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(255)
      }
    }
  })
})

describe('首屏像素画逐帧显影', () => {
  it('容器存在，并且是"逐帧"画出来的，不是一次塞满', async () => {
    const { root } = mount(HeaderView)

    const canvas = root.querySelector('.pixel-canvas')
    expect(canvas).not.toBeNull()
    // 尺寸变量得挂上，否则 CSS 算不出宽高
    expect(canvas.style.getPropertyValue('--cols')).toBe(String(pixelCols))
    expect(canvas.style.getPropertyValue('--rows')).toBe(String(pixelRows))

    // 起手 300ms 才开始画，这里等到中途看一眼，应该只画了一部分
    await new Promise((r) => setTimeout(r, 520))
    const midway = root.querySelectorAll('.pixel').length
    expect(midway).toBeGreaterThan(0)
    expect(midway).toBeLessThan(TOTAL)
  }, 15000)

  it('最终会把 2808 个像素一个不落地画完', async () => {
    const { root } = mount(HeaderView)

    const finished = await waitFor(() => root.querySelectorAll('.pixel').length >= TOTAL)
    expect(finished).toBe(true)
    expect(root.querySelectorAll('.pixel')).toHaveLength(TOTAL)
  }, 20000)

  it('每行开头插入一个 <br>，共 35 个（首行不加）', async () => {
    const { root } = mount(HeaderView)
    await waitFor(() => root.querySelectorAll('.pixel').length >= TOTAL)

    const canvas = root.querySelector('.pixel-canvas')
    expect(canvas.querySelectorAll('br')).toHaveLength(pixelRows - 1)
  }, 20000)

  it('像素颜色确实取自矩阵，而不是随便涂的', async () => {
    const { root } = mount(HeaderView)
    await waitFor(() => root.querySelectorAll('.pixel').length >= TOTAL)

    const spans = root.querySelectorAll('.pixel')
    const norm = (s) => s.replace(/\s+/g, '')

    // 首行第一个、第二行第一个、最后一行最后一个
    const probes = [
      [0, 0],
      [1, 0],
      [pixelRows - 1, pixelCols - 1],
    ]
    for (const [row, col] of probes) {
      const [r, g, b] = pixels[row][col]
      const span = spans[row * pixelCols + col]
      expect(norm(span.style.color)).toBe(`rgb(${r},${g},${b})`)
      expect(span.textContent).toBe('█')
    }
  }, 20000)
})

describe('联系方式跳转（已从弹图改成直接跳链接）', () => {
  it('首屏的 Contact 按钮就是一条指向 QQ 的外链', () => {
    const { root } = mount(HeaderView)
    const links = [...root.querySelectorAll('a[href]')]
    const contact = links.find((a) => (a.getAttribute('href') || '').includes('qm.qq.com'))

    expect(contact).toBeTruthy()
    expect(contact.getAttribute('target')).toBe('_blank')
    expect(contact.getAttribute('rel')).toContain('noopener')
  })

  it('顶栏和页脚用的是同一个链接，且没有弹窗残留', () => {
    const { root } = mount(LayoutView)
    // 顶栏 Contact + 页脚 Get in Touch + 页脚社交图标里的 QQ
    const links = [...root.querySelectorAll('a[href*="qm.qq.com"]')]
    expect(links.length).toBeGreaterThanOrEqual(3)

    // 弹窗整套应该已经拆干净了
    expect(root.querySelector('.modal-overlay')).toBeNull()
    expect(root.querySelector('.modal-content')).toBeNull()
  })
})

describe('中英切换', () => {
  afterEach(() => setLocale('en'))

  it('切到中文后首屏文案跟着变', () => {
    setLocale('en')
    const en = mount(HeaderView)
    expect(en.root.textContent).toContain('Full-stack Developer')

    setLocale('zh')
    const zh = mount(HeaderView)
    expect(zh.root.textContent).toContain('全栈开发')
    expect(zh.root.textContent).not.toContain('Full-stack Developer')
  })

  it('切换按钮上写的是"另一种语言"，点一下就切过去', async () => {
    setLocale('en')
    const { root } = mount(HeaderView)

    const btn = root.querySelector('.locale-toggle')
    expect(btn).not.toBeNull()
    // 当前英文，按钮提示切到中文
    expect(btn.textContent.trim()).toBe('中')

    btn.click()
    await nextTick()

    expect(root.querySelector('.locale-toggle').textContent.trim()).toBe('EN')
    expect(root.textContent).toContain('全栈开发')
  })

  it('没配置的语言（url 为空的社交项）不会因为翻译逻辑出问题', () => {
    setLocale('zh')
    const { root } = mount(HeaderView)
    // Bilibili / Email 的 url 是空的，应该被过滤掉
    const socials = [...root.querySelectorAll('.app')]
    const names = socials.map((el) => el.getAttribute('title')).filter(Boolean)
    expect(names).not.toContain('Bilibili')
    expect(names).toContain('GitHub')
  })
})
