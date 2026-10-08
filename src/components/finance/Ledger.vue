<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { ChevronLeft, ChevronRight, CreditCard, Download, Landmark, Plus, X } from "@lucide/vue";
import { toast } from "vue-sonner";
import Button from "@/components/ui/Button.vue";
import BottomSheet from "@/components/finance/BottomSheet.vue";
import CardForm from "@/components/finance/CardForm.vue";
import RecordForm, { type RecordInitial } from "@/components/finance/RecordForm.vue";
import RowItem from "@/components/finance/RowItem.vue";
import {
  addYm,
  computeMonth,
  deleteRecord,
  fmt,
  uid,
  updateRecord,
  ymLabel,
  ymOf,
  type Card,
  type Profile,
  type RecordInput,
  type Row,
  type Scope,
} from "@/lib/finance";

type SheetName = "record" | "card" | "cards";

const props = defineProps<{ profile: Profile; dirty: boolean }>();
const emit = defineEmits<{ update: [profile: Profile]; saved: []; close: [] }>();

const today = new Date();
const ym = ref(ymOf(today));
const anim = ref("");
const sheet = ref<SheetName | null>(null);
// last opened sheet, so its content stays rendered while the sheet animates out
const view = ref<SheetName>("record");
const editing = ref<{ recordId: string; ym: string } | null>(null);
const editCard = ref<Card | null>(null);
let touch: { x: number; y: number } | null = null;

watch(sheet, (s) => {
  if (s) view.value = s;
});

const groups = computed(() => computeMonth(props.profile, ym.value));
const label = computed(() => ymLabel(ym.value));
const account = computed(() => groups.value[0]!);
const isCurrent = computed(() => ym.value === ymOf(today));
const defaultDate = computed(() =>
  isCurrent.value ? today.toISOString().slice(0, 10) : `${ym.value}-01`,
);

const editRec = computed(() =>
  editing.value ? props.profile.records.find((r) => r.id === editing.value?.recordId) : undefined,
);
const recordInitial = computed<RecordInitial | undefined>(() => {
  const r = editRec.value;
  if (!r || !editing.value) return undefined;
  const ov = r.overrides[editing.value.ym];
  return { ...r, curAmount: ov?.amount, curDescription: ov?.description, curSource: ov?.source };
});
const recordKey = computed(() =>
  editing.value ? `${editing.value.recordId}${editing.value.ym}` : `new${ym.value}`,
);
const sheetTitle = computed(() => {
  if (view.value === "cards") return "Cartões de crédito";
  if (view.value === "card") return editCard.value ? "Editar cartão" : "Novo cartão";
  return editing.value ? "Editar registro" : "Novo registro";
});

const update = (p: Profile) => emit("update", p);

const slide = (forward: boolean) => {
  anim.value = forward
    ? "animate-in slide-in-from-right-8 fade-in"
    : "animate-in slide-in-from-left-8 fade-in";
};
const go = (n: number) => {
  slide(n > 0);
  ym.value = addYm(ym.value, n);
};
const goToday = () => {
  slide(ymOf(today) > ym.value);
  ym.value = ymOf(today);
};

const save = () => {
  const blob = new Blob([JSON.stringify(props.profile, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${props.profile.name.replace(/[^\w-]+/g, "_") || "financas"}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  emit("saved");
  toast.success("Arquivo salvo");
};

const close = () => {
  if (!props.dirty || confirm("Há alterações não salvas. Fechar mesmo assim?")) emit("close");
};

const toggle = (key: string) =>
  update({ ...props.profile, done: { ...props.profile.done, [key]: !props.profile.done[key] } });

const closeSheet = () => {
  sheet.value = sheet.value === "card" ? "cards" : null;
};
const newRecord = () => {
  editing.value = null;
  sheet.value = "record";
};
const openRow = (r: Row) => {
  if (!r.recordId) return;
  editing.value = { recordId: r.recordId, ym: ym.value };
  sheet.value = "record";
};
const openCard = (c: Card | null) => {
  editCard.value = c;
  sheet.value = "card";
};

const saveRecord = (input: RecordInput, scope: Scope) => {
  const p = props.profile;
  if (editRec.value && editing.value)
    update(updateRecord(p, editRec.value.id, editing.value.ym, scope, input));
  else update({ ...p, records: [...p.records, { ...input, id: uid(), overrides: {} }] });
  sheet.value = null;
};
const removeRecord = (scope: Scope) => {
  if (editRec.value && editing.value)
    update(deleteRecord(props.profile, editRec.value.id, editing.value.ym, scope));
  sheet.value = null;
};

const saveCard = (c: Omit<Card, "id">) => {
  const p = props.profile;
  const id = editCard.value?.id;
  update({
    ...p,
    cards: id
      ? p.cards.map((x) => (x.id === id ? { ...x, ...c } : x))
      : [...p.cards, { ...c, id: uid() }],
  });
  sheet.value = "cards";
};
const removeCard = () => {
  const id = editCard.value?.id;
  if (!id || !confirm("Excluir o cartão? Registros dele passarão para a conta corrente.")) return;
  const p = props.profile;
  update({
    ...p,
    cards: p.cards.filter((x) => x.id !== id),
    records: p.records.map((r) => (r.source === id ? { ...r, source: "account" } : r)),
  });
  sheet.value = "cards";
};

const onPointerDown = (e: PointerEvent) => {
  if (!sheet.value) touch = { x: e.clientX, y: e.clientY };
};
const onPointerUp = (e: PointerEvent) => {
  if (!touch) return;
  const dx = e.clientX - touch.x;
  const dy = e.clientY - touch.y;
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
  touch = null;
};
</script>

<template>
  <div
    class="min-h-screen touch-pan-y select-none pb-28"
    @pointerdown="onPointerDown"
    @pointerup="onPointerUp"
    @pointercancel="touch = null"
  >
    <header class="bg-hero rounded-b-[2rem] px-5 pb-6 pt-5 text-primary-foreground">
      <div class="flex items-center justify-between gap-2">
        <button
          class="flex min-w-0 items-center gap-2 text-sm text-primary-foreground/80"
          @click="close"
        >
          <X class="h-4 w-4 shrink-0" /><span class="truncate">{{ profile.name }}</span>
        </button>
        <div class="flex shrink-0 gap-2">
          <Button size="sm" variant="secondary" class="rounded-full" @click="sheet = 'cards'">
            <CreditCard class="h-4 w-4" /> Cartões
          </Button>
          <Button
            size="sm"
            class="relative rounded-full bg-accent text-accent-foreground hover:bg-accent/90"
            @click="save"
          >
            <Download class="h-4 w-4" /> Salvar
            <span
              v-if="dirty"
              class="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-destructive"
            />
          </Button>
        </div>
      </div>
      <div class="mt-6 flex items-center justify-between">
        <button
          aria-label="Mês anterior"
          class="grid h-10 w-10 place-items-center rounded-full bg-primary-foreground/10"
          @click="go(-1)"
        >
          <ChevronLeft />
        </button>
        <div class="text-center">
          <div class="font-display text-2xl font-bold">{{ label.month }}</div>
          <div class="text-sm text-primary-foreground/70">{{ label.year }}</div>
        </div>
        <button
          aria-label="Próximo mês"
          class="grid h-10 w-10 place-items-center rounded-full bg-primary-foreground/10"
          @click="go(1)"
        >
          <ChevronRight />
        </button>
      </div>
      <div class="mt-6 grid grid-cols-2 gap-3">
        <div class="rounded-2xl bg-primary-foreground/10 p-3">
          <div class="text-xs text-primary-foreground/70">Saldo previsto</div>
          <div class="num text-lg font-bold">{{ fmt(account.total) }}</div>
        </div>
        <div class="rounded-2xl bg-accent p-3 text-accent-foreground">
          <div class="text-xs opacity-75">Já efetivado</div>
          <div class="num text-lg font-bold">{{ fmt(account.doneTotal) }}</div>
        </div>
      </div>
      <p v-if="isCurrent" class="mt-3 text-center text-xs text-primary-foreground/60">
        Arraste para os lados para trocar de mês
      </p>
      <div v-else class="mt-3 text-center">
        <button
          class="rounded-full bg-primary-foreground/15 px-4 py-1.5 text-xs font-semibold"
          @click="goToday"
        >
          Voltar ao mês atual
        </button>
      </div>
    </header>

    <main :key="ym" :class="`space-y-4 px-4 pt-5 duration-300 ${anim}`">
      <section
        v-for="g in groups"
        :key="g.id"
        class="overflow-hidden rounded-2xl border border-border bg-card"
      >
        <div class="flex items-center gap-3 border-b border-border px-4 py-3">
          <div
            :class="`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${g.id === 'account' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-primary'}`"
          >
            <Landmark v-if="g.id === 'account'" class="h-4 w-4" />
            <CreditCard v-else class="h-4 w-4" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="truncate font-display font-semibold">{{ g.name }}</div>
            <div v-if="g.dueDay" class="text-xs text-muted-foreground">
              Vence dia {{ g.dueDay }} · fatura cai na conta no mês seguinte
            </div>
          </div>
        </div>
        <div v-if="g.rows.length === 0" class="px-4 py-6 text-center text-sm text-muted-foreground">
          Nenhum registro neste mês
        </div>
        <ul v-else class="divide-y divide-border">
          <RowItem
            v-for="r in g.rows"
            :key="r.key"
            :row="r"
            :done="!!profile.done[r.key]"
            @toggle="toggle(r.key)"
            @open="openRow(r)"
          />
        </ul>
        <div class="grid grid-cols-2 gap-2 bg-muted px-4 py-3 text-sm">
          <div>
            <div class="text-xs text-muted-foreground">Saldo</div>
            <div :class="`num font-bold ${g.total < 0 ? 'text-expense' : 'text-income'}`">
              {{ fmt(g.total) }}
            </div>
          </div>
          <div class="text-right">
            <div class="text-xs text-muted-foreground">Efetivado</div>
            <div class="num font-bold">{{ fmt(g.doneTotal) }}</div>
          </div>
        </div>
      </section>
    </main>

    <button
      aria-label="Novo registro"
      class="fixed bottom-6 left-1/2 flex h-14 -translate-x-1/2 items-center gap-2 rounded-full bg-primary px-6 font-semibold text-primary-foreground shadow-xl"
      @click="newRecord"
    >
      <Plus class="h-5 w-5" /> Novo registro
    </button>

    <BottomSheet :open="sheet !== null" :title="sheetTitle" @close="closeSheet">
      <RecordForm
        v-if="view === 'record'"
        :key="recordKey"
        :cards="profile.cards"
        :default-date="defaultDate"
        :is-edit="!!editRec"
        :initial="recordInitial"
        @save="saveRecord"
        @delete="removeRecord"
      />
      <div v-else-if="view === 'cards'" class="space-y-2">
        <button
          v-for="c in profile.cards"
          :key="c.id"
          class="flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left"
          @click="openCard(c)"
        >
          <CreditCard class="h-5 w-5 shrink-0 text-primary" />
          <span class="min-w-0 flex-1 truncate font-semibold">{{ c.name }}</span>
          <span class="shrink-0 text-sm text-muted-foreground">dia {{ c.dueDay }}</span>
        </button>
        <p v-if="profile.cards.length === 0" class="py-4 text-center text-sm text-muted-foreground">
          Nenhum cartão cadastrado
        </p>
        <Button class="h-12 w-full rounded-xl" @click="openCard(null)">
          <Plus class="h-4 w-4" /> Cadastrar cartão
        </Button>
      </div>
      <CardForm
        v-else
        :key="editCard?.id ?? 'new'"
        :initial="editCard ?? undefined"
        :can-delete="!!editCard"
        @save="saveCard"
        @delete="removeCard"
      />
    </BottomSheet>
  </div>
</template>
