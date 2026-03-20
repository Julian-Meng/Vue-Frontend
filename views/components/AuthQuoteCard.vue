<script setup>
defineProps({
  quote: {
    type: String,
    default: '',
  },
  from: {
    type: String,
    default: '',
  },
})
</script>

<template>
  <div class="auth-quote-card">
    <p class="auth-quote-text">{{ quote }}</p>
    <p class="auth-quote-from">{{ from ? `- ${from} -` : '' }}</p>
  </div>
</template>

<style scoped>
.auth-quote-card {
  width: 100%;
  min-height: 108px;
  height: 108px;
  background: transparent;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  margin-bottom: 14px;
}

.auth-quote-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: #555;
  display: -webkit-box;
  line-clamp: 3;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.auth-quote-from {
  margin: 6px 0 0;
  font-size: 12px;
  color: #8a8a8a;
  min-height: 18px;
}
</style>
