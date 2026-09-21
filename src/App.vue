<script setup>
import LayoutView from './components/LayoutView.vue'
import HeaderView from './components/HeaderView.vue'
import ProjectsSection from './components/ProjectsSection.vue'
import { site } from './data/site.js'
</script>

<template>
  <div class="root">
    <LayoutView>
      <HeaderView />
      <ProjectsSection v-if="site.showProjects" />
    </LayoutView>
  </div>
</template>

<style scoped>
.root {
  width: 100%;
  min-height: 100vh;
}
</style>
