<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { site } from '../data/site.js'
import { t } from '../composables/useLocale.js'

/* 卡片滚进视口时才淡入上移，触发一次就 unobserve，不重复播 */
const cards = ref([])
let io = null

onMounted(() => {
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

  cards.value.forEach((el) => el && io.observe(el))
})

onUnmounted(() => {
  io?.disconnect()
})
</script>

<template>
  <section id="about" class="about">
    <h2 class="section-title">{{ t(site.about.title) }}</h2>
    <div class="intro">
      <p v-for="p in t(site.about.paragraphs)" :key="p">{{ p }}</p>
    </div>

    <template v-if="site.projects.length">
      <h2 id="work" class="section-title">{{ t(site.about.workTitle) }}</h2>
      <div class="project-grid">
        <a
          v-for="(p, i) in site.projects"
          :key="p.name"
          :ref="(el) => (cards[i] = el)"
          class="project-card"
          :href="p.url"
          target="_blank"
          rel="noopener noreferrer"
        >
          <h3 class="project-name">
            {{ p.name }}
            <span class="arrow">→</span>
          </h3>
          <p class="project-desc">{{ t(p.description) }}</p>
          <div class="tags">
            <span
              v-for="tag in p.tags"
              :key="tag.name"
              class="tag"
              :style="{
                color: `rgb(${tag.color.join(',')})`,
                backgroundColor: `rgba(${tag.color.join(',')}, 0.14)`,
              }"
            >
              {{ tag.name }}
            </span>
          </div>
        </a>
      </div>
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

.project-grid {
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 25px;
}

.project-card {
  display: block;
  padding: 22px 24px;
  border-radius: 12px;
  background-color: #ffffff1a;
  color: #fff;
  /* 收起来的状态，等 IntersectionObserver 加 .animate-in */
  opacity: 0;
  transform: translateY(20px);
  transition:
    opacity 0.8s ease-out,
    transform 0.8s ease-out,
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
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
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
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.tag {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.75rem;
}

@media (min-width: 768px) {
  .project-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
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
}
</style>
