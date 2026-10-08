<script setup lang="ts">
import { ref } from "vue";
import { FolderOpen, UserPlus, Wallet } from "@lucide/vue";
import { toast } from "vue-sonner";
import Button from "@/components/ui/Button.vue";
import Input from "@/components/ui/Input.vue";
import { newProfile, type FinRecord, type Profile } from "@/lib/finance";

const emit = defineEmits<{ open: [profile: Profile] }>();

const fileRef = ref<HTMLInputElement | null>(null);
const name = ref("");
const creating = ref(false);
const vFocus = { mounted: (el: HTMLElement) => el.focus() };

const load = async (e: Event) => {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    if (!Array.isArray(data.records) || !Array.isArray(data.cards)) throw new Error();
    emit("open", {
      name: String(data.name ?? "Perfil"),
      cards: data.cards,
      records: data.records.map((r: Partial<FinRecord>) => ({ overrides: {}, ...r }) as FinRecord),
      done: data.done ?? {},
    });
  } catch {
    toast.error("Arquivo inválido. Selecione um .json salvo por este app.");
  }
};

const create = () => {
  if (name.value.trim()) emit("open", newProfile(name.value.trim().slice(0, 40)));
};
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <div class="bg-hero rounded-b-[2.5rem] px-7 pb-14 pt-16 text-primary-foreground">
      <div
        class="mb-10 grid h-14 w-14 place-items-center rounded-2xl bg-accent text-accent-foreground"
      >
        <Wallet class="h-7 w-7" />
      </div>
      <h1 class="font-display text-4xl font-bold leading-tight">Seu dinheiro,<br />mês a mês.</h1>
      <p class="mt-3 text-primary-foreground/75">
        Os dados ficam só com você, em um arquivo no seu dispositivo.
      </p>
    </div>
    <div class="-mt-8 space-y-3 px-5">
      <input
        ref="fileRef"
        type="file"
        accept=".json,application/json"
        class="hidden"
        @change="load"
      />
      <button
        class="flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-5 text-left shadow-sm"
        @click="fileRef?.click()"
      >
        <div
          class="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-secondary text-primary"
        >
          <FolderOpen />
        </div>
        <div class="min-w-0">
          <div class="font-display font-semibold">Abrir arquivo</div>
          <div class="text-sm text-muted-foreground">Carregar um perfil .json salvo</div>
        </div>
      </button>
      <button
        v-if="!creating"
        class="flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-5 text-left shadow-sm"
        @click="creating = true"
      >
        <div
          class="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground"
        >
          <UserPlus />
        </div>
        <div class="min-w-0">
          <div class="font-display font-semibold">Novo perfil</div>
          <div class="text-sm text-muted-foreground">Começar do zero</div>
        </div>
      </button>
      <form
        v-else
        class="space-y-3 rounded-2xl border border-border bg-card p-5"
        @submit.prevent="create"
      >
        <div class="font-display font-semibold">Nome do perfil</div>
        <Input v-model="name" v-focus maxlength="40" placeholder="Ex.: Finanças da casa" />
        <Button type="submit" class="h-11 w-full rounded-xl" :disabled="!name.trim()">
          Criar perfil
        </Button>
      </form>
    </div>
  </div>
</template>
