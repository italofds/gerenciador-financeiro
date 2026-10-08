<script setup lang="ts">
import { computed, ref } from "vue";
import Button from "@/components/ui/Button.vue";
import Input from "@/components/ui/Input.vue";
import Label from "@/components/ui/Label.vue";
import type { Card, FinRecord, RecordInput, Recurrence, Scope } from "@/lib/finance";

export type RecordInitial = FinRecord & {
  curAmount?: number | undefined;
  curDescription?: string | undefined;
  curSource?: string | undefined;
};

const props = defineProps<{
  cards: Card[];
  initial?: RecordInitial | undefined;
  defaultDate: string;
  isEdit?: boolean;
}>();
const emit = defineEmits<{ save: [input: RecordInput, scope: Scope]; delete: [scope: Scope] }>();

const initial = props.initial;
const startAmount = initial?.curAmount ?? initial?.amount;
const kind = ref<"in" | "out">(startAmount !== undefined && startAmount >= 0 ? "in" : "out");
const cents = ref(startAmount !== undefined ? Math.round(Math.abs(startAmount) * 100) : 0);
const description = ref(initial?.curDescription ?? initial?.description ?? "");
const date = ref(initial?.date ?? props.defaultDate);
const source = ref(initial?.curSource ?? initial?.source ?? "account");
const rec = ref<Recurrence["type"]>(initial?.recurrence.type ?? "none");
const months = ref(String(initial?.recurrence.months ?? 12));
const recurring = !!initial && initial.recurrence.type !== "none";
const scope = ref<Scope>("one");

const format = (c: number) =>
  (c / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const value = computed(() => format(cents.value));
const num = computed(() => cents.value / 100);
const valid = computed(
  () =>
    num.value > 0 &&
    !!description.value.trim() &&
    !!date.value &&
    (rec.value !== "limited" || +months.value >= 1),
);

const onAmountInput = (e: Event) => {
  const t = e.target as HTMLInputElement;
  const d = t.value.replace(/\D/g, "").slice(0, 11);
  cents.value = d ? parseInt(d, 10) : 0;
  // keep the field masked even when the typed character doesn't change the amount
  t.value = format(cents.value);
};
const onAmountFocus = (e: FocusEvent) => {
  const t = e.target as HTMLInputElement;
  setTimeout(() => t.setSelectionRange(t.value.length, t.value.length));
};

const submit = () => {
  if (!valid.value) return;
  emit(
    "save",
    {
      amount: kind.value === "in" ? num.value : -num.value,
      description: description.value.trim().slice(0, 80),
      date: date.value,
      source: source.value,
      recurrence:
        rec.value === "limited"
          ? { type: "limited", months: Math.min(600, +months.value) }
          : { type: rec.value },
    },
    scope.value,
  );
};

const chipBase = "flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors";
const chipOff = "border-border bg-card text-muted-foreground";
const chip = (active: boolean) =>
  `${chipBase} ${active ? "border-primary bg-primary text-primary-foreground" : chipOff}`;
const outChip = computed(
  () =>
    `${chipBase} ${
      kind.value === "out"
        ? "border-destructive bg-destructive text-destructive-foreground"
        : chipOff
    }`,
);

const recurrences: { type: Recurrence["type"]; label: string }[] = [
  { type: "none", label: "Única" },
  { type: "limited", label: "Limitada" },
  { type: "unlimited", label: "Ilimitada" },
];
const scopes: { scope: Scope; label: string; deleteLabel: string }[] = [
  { scope: "one", label: "Só este", deleteLabel: "só este mês" },
  { scope: "forward", label: "Deste em diante", deleteLabel: "deste mês em diante" },
  { scope: "all", label: "Todos", deleteLabel: "todos" },
];
const deleteLabel = computed(() =>
  recurring ? scopes.find((s) => s.scope === scope.value)?.deleteLabel : "registro",
);
</script>

<template>
  <form class="space-y-4" @submit.prevent="submit">
    <div class="flex gap-2">
      <button type="button" :class="chip(kind === 'in')" @click="kind = 'in'">+ Entrada</button>
      <button type="button" :class="outChip" @click="kind = 'out'">− Saída</button>
    </div>
    <div class="space-y-1.5">
      <Label>Valor (R$)</Label>
      <Input
        inputmode="numeric"
        :model-value="value"
        :class="`num h-14 text-right text-2xl ${kind === 'in' ? 'text-income' : 'text-expense'}`"
        @input="onAmountInput"
        @focus="onAmountFocus"
      />
    </div>
    <div class="space-y-1.5">
      <Label>Descrição</Label>
      <Input v-model="description" maxlength="80" placeholder="Ex.: Aluguel" />
    </div>
    <div class="space-y-1.5">
      <Label>Data</Label>
      <Input v-model="date" type="date" />
    </div>
    <div class="space-y-1.5">
      <Label>Origem</Label>
      <select
        v-model="source"
        class="h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
      >
        <option value="account">Conta corrente</option>
        <option v-for="c in cards" :key="c.id" :value="c.id">Cartão · {{ c.name }}</option>
      </select>
    </div>
    <div class="space-y-1.5">
      <Label>Recorrência</Label>
      <div class="flex gap-2">
        <button
          v-for="r in recurrences"
          :key="r.type"
          type="button"
          :class="chip(rec === r.type)"
          @click="rec = r.type"
        >
          {{ r.label }}
        </button>
      </div>
      <div v-if="rec === 'limited'" class="flex items-center gap-2 pt-2">
        <Input v-model="months" type="number" min="1" class="w-24" />
        <span class="text-sm text-muted-foreground">meses</span>
      </div>
    </div>
    <div v-if="isEdit && recurring" class="space-y-1.5 rounded-xl bg-muted p-3">
      <Label>Aplicar alteração a</Label>
      <div class="flex gap-2">
        <button
          v-for="s in scopes"
          :key="s.scope"
          type="button"
          :class="chip(scope === s.scope)"
          @click="scope = s.scope"
        >
          {{ s.label }}
        </button>
      </div>
    </div>
    <Button type="submit" class="h-12 w-full rounded-xl" :disabled="!valid">
      {{ isEdit ? "Salvar alterações" : "Adicionar registro" }}
    </Button>
    <Button
      v-if="isEdit"
      variant="ghost"
      class="w-full text-destructive"
      @click="emit('delete', recurring ? scope : 'all')"
    >
      Excluir {{ deleteLabel }}
    </Button>
  </form>
</template>
