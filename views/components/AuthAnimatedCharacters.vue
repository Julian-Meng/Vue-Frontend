<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  activeField: {
    type: String,
    default: '',
  },
  showPassword: {
    type: Boolean,
    default: false,
  },
  passwordLength: {
    type: Number,
    default: 0,
  },
  shakeSignal: {
    type: Number,
    default: 0,
  },
})

const mouseX = ref(0)
const mouseY = ref(0)
const isBlinking = ref(false)
const isShaking = ref(false)

let blinkTimer = 0
let blinkResetTimer = 0
let shakeResetTimer = 0

const faceOffset = computed(() => {
  const viewportWidth = window.innerWidth || 1
  const viewportHeight = window.innerHeight || 1

  const ratioX = mouseX.value / viewportWidth - 0.5
  const ratioY = mouseY.value / viewportHeight - 0.5

  return {
    x: Math.max(-12, Math.min(12, ratioX * 22)),
    y: Math.max(-8, Math.min(8, ratioY * 18)),
  }
})

const isPeeking = computed(() => props.passwordLength > 0 && !props.showPassword)

const leftEyeStyle = computed(() => {
  const x = isPeeking.value ? -4 : faceOffset.value.x
  const y = isPeeking.value ? -5 : faceOffset.value.y
  return {
    transform: `translate(${x}px, ${y}px) scaleY(${isBlinking.value ? 0.2 : 1})`,
  }
})

const rightEyeStyle = computed(() => {
  const x = isPeeking.value ? -4 : faceOffset.value.x
  const y = isPeeking.value ? -5 : faceOffset.value.y
  return {
    transform: `translate(${x}px, ${y}px) scaleY(${isBlinking.value ? 0.2 : 1})`,
  }
})

const mouthStyle = computed(() => {
  if (isPeeking.value) {
    return {
      width: '14px',
      borderRadius: '999px',
      transform: 'translateY(3px)',
    }
  }

  if (props.activeField) {
    return {
      width: '20px',
      borderRadius: '999px',
      transform: 'translateY(-1px)',
    }
  }

  return {
    width: '16px',
    borderRadius: '999px',
  }
})

function scheduleBlink() {
  const delay = Math.random() * 2600 + 2200

  blinkTimer = window.setTimeout(() => {
    isBlinking.value = true

    blinkResetTimer = window.setTimeout(() => {
      isBlinking.value = false
      scheduleBlink()
    }, 140)
  }, delay)
}

function handleMouseMove(event) {
  mouseX.value = event.clientX
  mouseY.value = event.clientY
}

watch(
  () => props.shakeSignal,
  () => {
    isShaking.value = true
    window.clearTimeout(shakeResetTimer)
    shakeResetTimer = window.setTimeout(() => {
      isShaking.value = false
    }, 680)
  },
)

onMounted(() => {
  window.addEventListener('mousemove', handleMouseMove)
  scheduleBlink()
})

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', handleMouseMove)
  window.clearTimeout(blinkTimer)
  window.clearTimeout(blinkResetTimer)
  window.clearTimeout(shakeResetTimer)
})
</script>

<template>
  <div class="auth-characters-root" :class="{ peeking: isPeeking, shaking: isShaking }">
    <div class="character character-main" :class="{ typing: activeField }">
      <div class="face">
        <span class="eye" :style="leftEyeStyle"></span>
        <span class="eye" :style="rightEyeStyle"></span>
        <span class="mouth" :style="mouthStyle"></span>
      </div>
    </div>

    <div class="character character-side" :class="{ typing: activeField }">
      <div class="face small">
        <span class="eye small-eye" :style="leftEyeStyle"></span>
        <span class="eye small-eye" :style="rightEyeStyle"></span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-characters-root {
  position: relative;
  width: min(360px, 100%);
  height: 180px;
  margin: 0 auto;
}

.character {
  position: absolute;
  bottom: 0;
  border-radius: 24px 24px 0 0;
  transition: transform 0.28s ease;
}

.character-main {
  left: 28px;
  width: 160px;
  height: 170px;
  background: #6c3ff5;
}

.character-side {
  right: 36px;
  width: 110px;
  height: 140px;
  background: #2d2d2d;
}

.face {
  position: absolute;
  left: 50%;
  top: 34px;
  transform: translateX(-50%);
  width: 82px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.face.small {
  width: 58px;
  top: 28px;
}

.eye {
  width: 14px;
  height: 14px;
  background: #fff;
  border-radius: 999px;
  transform-origin: center;
  transition: transform 0.1s ease-out;
}

.small-eye {
  width: 12px;
  height: 12px;
}

.mouth {
  position: absolute;
  left: 50%;
  bottom: -20px;
  height: 4px;
  background: #ffffffde;
  transform: translateX(-50%);
  transition: all 0.24s ease;
}

.typing.character-main {
  transform: translateX(8px);
}

.typing.character-side {
  transform: translateX(-6px);
}

.peeking .character-main {
  transform: translateX(12px) rotate(-2deg);
}

.peeking .character-side {
  transform: translateX(-8px) rotate(2deg);
}

.shaking .character-main {
  animation: character-shake-main 0.68s cubic-bezier(0.36, 0, 0.2, 1);
}

.shaking .character-side {
  animation: character-shake-side 0.68s cubic-bezier(0.36, 0, 0.2, 1);
}

@keyframes character-shake-main {
  0%,
  100% {
    transform: translateX(0) rotate(0deg);
  }

  20% {
    transform: translateX(8px) rotate(3deg);
  }

  40% {
    transform: translateX(-8px) rotate(-3deg);
  }

  60% {
    transform: translateX(6px) rotate(2deg);
  }

  80% {
    transform: translateX(-5px) rotate(-2deg);
  }
}

@keyframes character-shake-side {
  0%,
  100% {
    transform: translateX(0) rotate(0deg);
  }

  20% {
    transform: translateX(-6px) rotate(-2deg);
  }

  40% {
    transform: translateX(6px) rotate(2deg);
  }

  60% {
    transform: translateX(-5px) rotate(-1.5deg);
  }

  80% {
    transform: translateX(4px) rotate(1.5deg);
  }
}
</style>
