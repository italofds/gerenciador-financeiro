<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { Check } from "@lucide/vue";
import { cn } from "@/lib/utils";

const props = defineProps<{ checked: boolean; class?: HTMLAttributes["class"] }>();
const emit = defineEmits<{ "update:checked": [value: boolean] }>();
</script>

<template>
  <button
    type="button"
    role="checkbox"
    :aria-checked="checked"
    :data-state="checked ? 'checked' : 'unchecked'"
    :class="
      cn(
        'grid place-content-center h-4 w-4 shrink-0 rounded-sm border border-primary shadow cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
        props.class,
      )
    "
    @click="emit('update:checked', !checked)"
  >
    <Check v-if="checked" class="h-4 w-4" />
  </button>
</template>
