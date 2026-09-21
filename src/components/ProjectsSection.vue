<script setup>
import { onMounted, onUnmounted } from 'vue'
import { site } from '../data/site.js'
import { t } from '../composables/useLocale.js'
// 构建前由 tools/fetch-github.mjs 生成，别手改这个 json
import github from '../data/github.json'

/* 卡片滚进视口才淡入上移。直接在 mounted 里查 DOM ——
   列表是构建期数据、挂载时已经渲染完，不需要用 ref 回调一个个收集 */
let io = null

onMounted(() => {
  const cards = document.querySelectorAll('.project-card')
  if (!cards.length) return

  io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in')
          io.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.1 },
  )

  cards.forEach((el) => io.observe(el))
})

onUnmounted(() => {
  io?.disconnect()
})

/** 把 ISO 时间转成「3 天前」这种，跟着语言走 */
function updatedAgo(iso) {
  if (!iso) return ''
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days <= 0) return t({ zh: '今天更新', en: 'updated today' })
  if (days < 30) return t({ zh: `${days} 天前更新`, en: `${days}d ago` })
  const months = Math.floor(days / 30)
  if (months < 12) return t({ zh: `${months} 个月前更新`, en: `${months}mo ago` })
  return t({ zh: `${Math.floor(months / 12)} 年前更新`, en: `${Math.floor(months / 12)}y ago` })
}

/** 语言 tag：有 GitHub 官方配色就用，没有就灰色 */
function langStyle(rgb) {
  if (!rgb) return {}
  const c = rgb.join(',')
  return { color: `rgb(${c})`, backgroundColor: `rgba(${c}, 0.14)` }
}
</script>

<template>
  <section id="about" class="about">
    <h2 class="section-title">{{ t(site.about.title) }}</h2>
    <div class="intro">
      <p v-for="p in t(site.about.paragraphs)" :key="p">{{ p }}</p>
    </div>

    <template v-if="site.showWork && github.orgs.length">
      <h2 id="work" class="section-title">{{ t(site.about.workTitle) }}</h2>

      <div v-for="org in github.orgs" :key="org.login" class="org">
        <a class="org-head" :href="org.url" target="_blank" rel="noopener noreferrer">
          <img class="org-avatar" :src="org.avatar" :alt="org.login" loading="lazy" />
          <span class="org-name">{{ org.name }}</span>
          <span class="org-count">{{ org.repoCount }}</span>
        </a>

        <div class="project-grid">
          <a
            v-for="repo in org.repos"
            :key="repo.name"
            class="project-card"
            :href="repo.url"
            target="_blank"
            rel="noopener noreferrer"
          >
            <h3 class="project-name">
              {{ repo.name }}
              <span class="arrow">→</span>
            </h3>
            <p class="project-desc">
              {{ repo.description || t(site.about.noDescription) }}
            </p>
            <div class="tags">
              <span v-if="repo.language" class="tag" :style="langStyle(repo.color)">
                {{ repo.language }}
              </span>
              <span class="tag tag-dim">{{ updatedAgo(repo.updated) }}</span>
            </div>
          </a>
        </div>
      </div>

      <p class="more">
        <a
          :href="`https://github.com/${site.github.username}`"
          target="_blank"
          rel="noopener noreferrer"
        >
          {{ t(site.about.moreOnGithub) }} →
        </a>
      </p>
    </template>
  </section>
</template>

<style scoped>
.about {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px 140px;
}

.section-title {
  font-size: 36px;
  margin-top: 64px;
  margin-bottom: 28px;
  color: #fff;
}

.intro {
  max-width: 760px;
  line-height: 1.75;
  color: #ffffffb3;
}

.intro p + p {
  margin-top: 0.9rem;
}

/* ── 组织分组 ── */
.org + .org {
  margin-top: 44px;
}

.org-head {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  padding: 6px 14px 6px 6px;
  border-radius: 999px;
  background: #ffffff14;
  transition: background-color 0.25s ease;
}

.org-head:hover {
  background: #ffffff26;
}

.org-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
}

.org-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: #fff;
}

.org-count {
  font-size: 0.75rem;
  color: #ffffff80;
  padding: 1px 8px;
  border-radius: 999px;
  background: #ffffff1a;
}

/* ── 仓库卡片 ── */
.project-grid {
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 18px;
}

.project-card {
  display: block;
  padding: 20px 22px;
  border-radius: 12px;
  background-color: #ffffff1a;
  color: #fff;
  /* 收起来的状态，等 IntersectionObserver 加 .animate-in */
  opacity: 0;
  transform: translateY(16px);
  transition:
    opacity 0.7s ease-out,
    transform 0.7s ease-out,
    background-color 0.3s ease;
}

.project-card.animate-in {
  opacity: 1;
  transform: translateY(0);
}

.project-card:hover {
  background-color: #ffffff26;
  transform: translateY(-4px);
}

.project-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.125rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  word-break: break-word;
}

.arrow {
  opacity: 0;
  transform: translateX(-4px);
  transition: all 0.25s ease;
}

.project-card:hover .arrow {
  opacity: 1;
  transform: translateX(0);
}

.project-desc {
  font-size: 0.875rem;
  line-height: 1.6;
  color: #fff9;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.tag {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 0.75rem;
}

.tag-dim {
  color: #ffffff80;
  background-color: #ffffff14;
}

.more {
  margin-top: 36px;
  text-align: right;
}

.more a {
  font-size: 0.9rem;
  color: #ffffffb3;
  border-bottom: 1px solid #ffffff40;
  padding-bottom: 2px;
  transition: color 0.25s ease;
}

.more a:hover {
  color: #fff;
  border-color: #fff;
}

@media (min-width: 768px) {
  .project-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1200px) {
  .project-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 648px) {
  .section-title {
    font-size: 28px;
    margin-top: 44px;
  }

  .about {
    padding-bottom: 90px;
  }

  .more {
    text-align: left;
  }
}
</style>
