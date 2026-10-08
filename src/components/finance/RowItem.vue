<script setup lang="ts">
import { Repeat } from "@lucide/vue";
import Checkbox from "@/components/ui/Checkbox.vue";
import { fmt, type Row } from "@/lib/finance";

defineProps<{ row: Row; done: boolean }>();
const emit = defineEmits<{ toggle: []; open: [] }>();
</script>

<template>
  <li class="flex items-center gap-3 px-4 py-3">
    <Checkbox
      :checked="done"
      class="h-5 w-5 shrink-0"
      aria-label="Efetivado"
      @update:checked="emit('toggle')"
    />
    <button
      :disabled="!!row.auto"
      class="flex min-w-0 flex-1 items-center gap-3 text-left"
      @click="emit('open')"
    >
      <div class="min-w-0 flex-1">
        <div
          :class="`truncate text-sm font-semibold ${done ? 'text-muted-foreground line-through' : ''}`"
        >
          {{ row.description }}
        </div>
        <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>dia {{ String(row.day).padStart(2, "0") }}</span>
          <span v-if="row.recurrenceLabel" class="flex items-center gap-0.5">
            <Repeat class="h-3 w-3" />{{ row.recurrenceLabel }}
          </span>
          <span v-if="row.auto" class="rounded bg-secondary px-1.5 py-px">automático</span>
        </div>
      </div>
      <div
        :class="`num shrink-0 text-sm font-bold ${row.amount < 0 ? 'text-expense' : 'text-income'}`"
      >
        {{ fmt(row.amount) }}
      </div>
    </button>
  </li>
</template>
