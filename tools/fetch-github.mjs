#!/usr/bin/env node
/**
 * 从 GitHub 拉取账号信息、组织、以及各组织下的仓库，生成 src/data/github.json。
 *
 * 为什么要预生成而不是浏览器直接请求：
 *   未认证的 GitHub API 限额是 60 次/小时（按 IP 算），访客一多就 403，
 *   而且国内直连 api.github.com 不稳定。构建期抓一次、烘进静态产物最省事。
 *
 * 认证说明：
 *   - 不带 token 也能跑，但只能看到**公开**仓库
 *   - 带 GITHUB_TOKEN 能看到你账号权限内的更多信息，不过脚本最后仍会过滤掉私有仓库
 *     （站点是公开的，私有仓库放上去别人点开就是 404）
 *
 * 单独跑：
 *   node tools/fetch-github.mjs
 *   GITHUB_TOKEN=$(gh auth token) node tools/fetch-github.mjs
 */

import { writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { site } from '../src/data/site.js'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = resolve(ROOT, 'src/data/github.json')

/* ── 配置全部来自 src/data/site.js 的 site.github，这里不重复写 ── */
const cfg = site.github || {}
const USERNAME = cfg.username || 'X-CODER-ocs'
const ORGS = cfg.orgs || []
const LIMIT_PER_ORG = cfg.limitPerOrg || 8
const SKIP = new Set(cfg.skip || ['.github'])

/* ── GitHub 官方语言配色，用来给 tag 上色 ───────────────────── */
const LANG_COLORS = {
  'C#': '#178600',
  'C++': '#f34b7d',
  C: '#555555',
  Java: '#b07219',
  Kotlin: '#A97BFF',
  Python: '#3572A5',
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  HTML: '#e34c26',
  CSS: '#563d7c',
  SCSS: '#c6538c',
  Vue: '#41b883',
  Svelte: '#ff3e00',
  Dart: '#00B4AB',
  Rust: '#dea584',
  Go: '#00ADD8',
  GLSL: '#5686a5',
  Shell: '#89e051',
  Makefile: '#427819',
  TeX: '#3D6117',
  Batchfile: '#C1F12E',
  Lua: '#000080',
  Ruby: '#701516',
  PHP: '#4F5D95',
  Swift: '#F05138',
  'Objective-C': '#438eff',
  Dockerfile: '#384d54',
  PowerShell: '#012456',
}

function toRgb(hex) {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

async function gh(path) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'cangjie-site-build',
  }
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  }

  // api.github.com 偶发抽风（EOF / SSL），重试几次
  let lastErr
  for (let i = 0; i < 4; i++) {
    try {
      const res = await fetch(`https://api.github.com${path}`, { headers })
      if (res.status === 404) return null
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
      return await res.json()
    } catch (err) {
      lastErr = err
      await new Promise((r) => setTimeout(r, 600 * (i + 1)))
    }
  }
  throw new Error(`${path} 抓取失败: ${lastErr?.message}`)
}

async function main() {
  console.log('从 GitHub 拉取数据…\n')

  const profile = await gh(`/users/${USERNAME}`)
  console.log(`  账号      ${profile.login}  (${profile.public_repos} 个公开仓库)`)

  const orgs = []

  for (const login of ORGS) {
    const [org, repos] = await Promise.all([
      gh(`/orgs/${login}`),
      gh(`/orgs/${login}/repos?per_page=100&sort=updated`),
    ])

    if (!org || !Array.isArray(repos)) {
      console.log(`  跳过      ${login}（读不到）`)
      continue
    }

    const picked = repos
      .filter((r) => !r.fork && !r.archived && !r.private && !SKIP.has(r.name))
      .slice(0, LIMIT_PER_ORG)
      .map((r) => {
        const lang = r.language || null
        return {
          name: r.name,
          url: r.html_url,
          description: r.description || null,
          language: lang,
          color: lang && LANG_COLORS[lang] ? toRgb(LANG_COLORS[lang]) : null,
          stars: r.stargazers_count,
          updated: r.pushed_at,
        }
      })

    if (!picked.length) {
      console.log(`  跳过      ${login}（没有可展示的仓库）`)
      continue
    }

    orgs.push({
      login: org.login,
      name: org.name || org.login,
      url: org.html_url,
      description: org.description || null,
      avatar: org.avatar_url,
      repoCount: repos.filter((r) => !r.fork && !r.archived && !r.private).length,
      repos: picked,
    })

    console.log(`  ${login.padEnd(24)} ${picked.length} 个仓库`)
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    user: {
      login: profile.login,
      name: profile.name,
      bio: profile.bio,
      blog: profile.blog,
      location: profile.location,
      avatar: profile.avatar_url,
      url: profile.html_url,
      publicRepos: profile.public_repos,
      followers: profile.followers,
    },
    orgs,
  }

  await mkdir(dirname(OUT), { recursive: true })
  await writeFile(OUT, JSON.stringify(payload, null, 2) + '\n', 'utf-8')

  const total = orgs.reduce((n, o) => n + o.repos.length, 0)
  console.log(`\n共 ${orgs.length} 个组织 / ${total} 个仓库`)
  console.log(`已写入 ${OUT.replace(ROOT + '/', '')}`)
}

main().catch((err) => {
  console.error('\n抓取失败:', err.message)
  // 构建不该因为 GitHub 抽风就整个挂掉 —— 保留上一次的结果
  console.error('保留已有的 github.json（如果存在）继续构建')
  process.exit(0)
})
