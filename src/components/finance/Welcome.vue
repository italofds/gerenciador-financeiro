<script setup lang="ts">
import { ref } from "vue";
import { Cloud, FolderOpen, UserPlus, Wallet } from "@lucide/vue";
import { toast } from "vue-sonner";
import CloudForm from "@/components/finance/CloudForm.vue";
import Button from "@/components/ui/Button.vue";
import Input from "@/components/ui/Input.vue";
import { cloudEnabled, cloudMessage, openCloud, type CloudSession } from "@/lib/cloud";
import { newProfile, parseProfile, type Profile } from "@/lib/finance";

const emit = defineEmits<{ open: [profile: Profile, session?: CloudSession] }>();

const fileRef = ref<HTMLInputElement | null>(null);
const name = ref("");
const creating = ref(false);
const cloudOn = cloudEnabled();
const cloudOpen = ref(false);
const busy = ref(false);
const vFocus = { mounted: (el: HTMLElement) => el.focus() };

const load = async (e: Event) => {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (!f) return;
  try {
    emit("open", parseProfile(JSON.parse(await f.text())));
  } catch {
    toast.error("Arquivo inválido. Selecione um .json salvo por este app.");
  }
};

const loadCloud = async (id: string, password: string) => {
  busy.value = true;
  try {
    const { profile, session } = await openCloud(id, password);
    emit("open", profile, session);
  } catch (e) {
    toast.error(cloudMessage(e));
  } finally {
    busy.value = false;
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
        {{
          cloudOn
            ? "Os dados ficam em um arquivo no seu dispositivo ou cifrados na nuvem."
            : "Os dados ficam só com você, em um arquivo no seu dispositivo."
        }}
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
      <template v-if="cloudOn">
        <button
          v-if="!cloudOpen"
          class="flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-5 text-left shadow-sm"
          @click="cloudOpen = true"
        >
          <div
            class="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-secondary text-primary"
          >
            <Cloud />
          </div>
          <div class="min-w-0">
            <div class="font-display font-semibold">Abrir da nuvem</div>
            <div class="text-sm text-muted-foreground">Entrar com id e senha</div>
          </div>
        </button>
        <div v-else class="space-y-3 rounded-2xl border border-border bg-card p-5">
          <div class="font-display font-semibold">Abrir da nuvem</div>
          <CloudForm submit-label="Abrir perfil" :busy="busy" @submit="loadCloud" />
        </div>
      </template>
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
