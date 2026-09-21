<script setup>
import { icons } from '../data/icons.js'
import { site } from '../data/site.js'
import { t } from '../composables/useLocale.js'

const socials = site.socials.filter((s) => s.url)
const year = new Date().getFullYear()
</script>

<template>
  <footer class="footer-container">
    <div class="footer-content">
      <div class="social-links">
        <a
          v-for="(s, i) in socials"
          :key="s.name"
          class="social-item"
          :style="{ animationDelay: i * 0.1 + 's' }"
          :href="s.url"
          target="_blank"
          rel="noopener noreferrer"
        >
          <div class="social-item-inner">
            <div class="icon-wrapper" :style="{ color: s.color }" v-html="s.icon"></div>
            <h3 class="social-label">{{ s.name }}</h3>
          </div>
        </a>
      </div>

      <a class="touch-button" :href="site.contact.url" target="_blank" rel="noopener noreferrer">
        <span>{{ t(site.buttons.contact) }}</span>
        <div class="tb-icon" v-html="icons.chat"></div>
      </a>
    </div>

    <div class="footer-bottom">
      <h1 class="brand-text">{{ site.watermark }}</h1>
      <p class="copyright">
        © {{ year }}
        <a :href="site.footer.ownerUrl" target="_blank" rel="noopener noreferrer">
          {{ site.name }}
        </a>
        · {{ t(site.footer.copyright) }}
      </p>
    </div>
  </footer>
</template>

<style scoped>
.footer-container {
  position: relative;
  z-index: 10;
  padding: 9rem 0 4rem;
  /* 四层错位径向渐变叠出来的彩色光晕，纯 CSS */
  background:
    radial-gradient(120% 80% at 30% 100%, rgba(255, 20, 147, 0.15), transparent 50%),
    radial-gradient(100% 60% at 70% 90%, rgba(0, 255, 255, 0.12), transparent 60%),
    radial-gradient(90% 70% at 50% 80%, rgba(138, 43, 226, 0.18), transparent 65%),
    radial-gradient(110% 50% at 20% 110%, rgba(255, 215, 0, 0.08), transparent 40%),
    #000000b3;
  mask-image: linear-gradient(to top, black 80%, transparent 100%);
  -webkit-mask-image: linear-gradient(to top, black 80%, transparent 100%);
}

.footer-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 1152px;
  margin: 0 auto;
  padding: 0 1.5rem 2rem;
  text-align: center;
}

.social-links {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.social-item {
  position: relative;
  display: block;
  padding: 0.75rem;
  border-radius: 9999px;
  background-color: #ffffff1a;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
  animation: scaleIn 0.6s ease-out both;
}

.social-item:hover {
  transform: scale(1.05);
  background-color: #fff3;
}

.social-item-inner {
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.icon-wrapper {
  display: flex;
  align-items: center;
  font-size: 1.25rem;
  transition: transform 0.3s ease;
  filter: drop-shadow(0 0 20px rgba(255, 255, 255, 0.5));
}

.icon-wrapper :deep(svg) {
  width: 1em;
  height: 1em;
}

.social-label {
  display: none;
  font-size: 0.875rem;
  font-weight: 500;
  margin: 0;
  color: #fff;
}

.touch-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0 1rem;
  line-height: 2.5rem;
  border: none;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 500;
  color: #000;
  background: #fff;
  transition: all 0.3s ease;
}

.touch-button:hover {
  transform: scale(1.05);
}

.tb-icon {
  width: 16px;
  height: 16px;
  fill: #000;
}

.tb-icon :deep(svg) {
  width: 100%;
  height: 100%;
}

.footer-bottom {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 3rem;
  padding: 0 1.5rem;
}

/* 24vw：直接撑满整屏宽度的大水印 */
.brand-text {
  font-size: 24vw;
  width: auto;
  font-weight: 900;
  letter-spacing: -0.05em;
  line-height: 1;
  margin: 0;
  color: #fff;
  white-space: nowrap;
}

.copyright {
  margin-top: 4rem;
  font-size: 1rem;
  font-weight: 400;
  letter-spacing: normal;
  color: #fff9;
}

.copyright a {
  text-decoration: underline;
  text-underline-offset: 3px;
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@media (min-width: 1024px) {
  .social-label {
    display: block;
  }
}
</style>
