<script setup lang="ts">
import { onBeforeUnmount, watch } from "vue";

const props = defineProps<{ open: boolean; title: string }>();
const emit = defineEmits<{ close: [] }>();

const onKey = (e: KeyboardEvent) => {
  if (e.key === "Escape") emit("close");
};
const release = () => {
  document.body.style.overflow = "";
  window.removeEventListener("keydown", onKey);
};

watch(
  () => props.open,
  (open) => {
    if (!open) return release();
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
  },
  { immediate: true },
);
onBeforeUnmount(release);
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet-fade">
      <div v-if="open" class="fixed inset-0 z-50 bg-black/80" @click="emit('close')" />
    </Transition>
    <Transition name="sheet-slide">
      <div
        v-if="open"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
        class="fixed inset-x-0 bottom-0 z-50 mx-auto mt-24 flex h-auto max-w-md flex-col rounded-t-[10px] border bg-background"
      >
        <div class="mx-auto mt-4 h-2 w-[100px] rounded-full bg-muted" />
        <div class="grid gap-1.5 p-4 text-center sm:text-left">
          <h2 class="font-display text-xl font-semibold leading-none tracking-tight">
            {{ title }}
          </h2>
        </div>
        <div class="max-h-[75vh] overflow-y-auto px-4 pb-6"><slot /></div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sheet-fade-enter-active,
.sheet-fade-leave-active {
  transition: opacity 0.25s ease;
}
.sheet-fade-enter-from,
.sheet-fade-leave-to {
  opacity: 0;
}
.sheet-slide-enter-active,
.sheet-slide-leave-active {
  transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
}
.sheet-slide-enter-from,
.sheet-slide-leave-to {
  transform: translateY(100%);
}
</style>
