<script setup>
import LayoutView from './components/LayoutView.vue'
import HeaderView from './components/HeaderView.vue'
import ProjectsSection from './components/ProjectsSection.vue'
</script>

<template>
  <div class="root">
    <LayoutView>
      <HeaderView />
      <ProjectsSection />
    </LayoutView>
  </div>
</template>

<style scoped>
.root {
  width: 100%;
  min-height: 100vh;
}
</style>
