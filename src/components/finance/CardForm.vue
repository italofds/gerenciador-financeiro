<script setup lang="ts">
import { computed, ref } from "vue";
import Button from "@/components/ui/Button.vue";
import Input from "@/components/ui/Input.vue";
import Label from "@/components/ui/Label.vue";
import type { Card } from "@/lib/finance";

const props = defineProps<{ initial?: Card | undefined; canDelete?: boolean }>();
const emit = defineEmits<{ save: [card: Omit<Card, "id">]; delete: [] }>();

const name = ref(props.initial?.name ?? "");
const dueDay = ref(String(props.initial?.dueDay ?? 10));
const valid = computed(
  () => name.value.trim().length > 0 && +dueDay.value >= 1 && +dueDay.value <= 31,
);

const submit = () => {
  if (valid.value) emit("save", { name: name.value.trim().slice(0, 40), dueDay: +dueDay.value });
};
</script>

<template>
  <form class="space-y-4" @submit.prevent="submit">
    <div class="space-y-1.5">
      <Label>Nome do cartão</Label>
      <Input v-model="name" maxlength="40" placeholder="Ex.: Nubank" />
    </div>
    <div class="space-y-1.5">
      <Label>Dia de vencimento</Label>
      <Input v-model="dueDay" type="number" min="1" max="31" />
    </div>
    <Button type="submit" class="h-12 w-full rounded-xl" :disabled="!valid">Salvar cartão</Button>
    <Button
      v-if="canDelete"
      variant="ghost"
      class="w-full text-destructive"
      @click="emit('delete')"
    >
      Excluir cartão
    </Button>
  </form>
</template>
