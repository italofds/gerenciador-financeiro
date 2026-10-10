<script setup lang="ts">
import { computed, ref } from "vue";
import Button from "@/components/ui/Button.vue";
import Input from "@/components/ui/Input.vue";
import Label from "@/components/ui/Label.vue";
import { isValidId, MIN_PASSWORD, normalizeId, recentCloudIds } from "@/lib/cloud";

const props = defineProps<{ submitLabel: string; busy: boolean; isNew?: boolean }>();
const emit = defineEmits<{ submit: [id: string, password: string] }>();

const recentIds = recentCloudIds();
const id = ref(props.isNew ? "" : recentIds[0] ?? "");
const password = ref("");
const confirmPassword = ref("");
const passwordsMatch = computed(() => !props.isNew || password.value === confirmPassword.value);
const valid = computed(
  () =>
    isValidId(normalizeId(id.value)) &&
    password.value.length >= MIN_PASSWORD &&
    passwordsMatch.value,
);

const submit = () => {
  if (valid.value && !props.busy) emit("submit", normalizeId(id.value), password.value);
};
</script>

<template>
  <form class="space-y-4" @submit.prevent="submit">
    <div class="space-y-1.5">
      <Label>Id do usuário</Label>
      <Input
        v-model="id"
        maxlength="32"
        autocomplete="username"
        autocapitalize="none"
        spellcheck="false"
        placeholder="Ex.: maria.silva"
        :list="recentIds.length ? 'cloud-recent-ids' : undefined"
      />
      <datalist v-if="recentIds.length" id="cloud-recent-ids">
        <option v-for="recentId in recentIds" :key="recentId" :value="recentId" />
      </datalist>
      <p v-if="isNew" class="text-xs text-muted-foreground">
        De 3 a 32 caracteres: letras, números, ponto, hífen ou sublinhado.
      </p>
    </div>
    <div class="space-y-1.5">
      <Label>Senha</Label>
      <Input
        v-model="password"
        type="password"
        :autocomplete="isNew ? 'new-password' : 'current-password'"
        :placeholder="`Mínimo de ${MIN_PASSWORD} caracteres`"
      />
    </div>
    <div v-if="isNew" class="space-y-1.5">
      <Label>Confirmar senha</Label>
      <Input
        v-model="confirmPassword"
        type="password"
        autocomplete="new-password"
        placeholder="Repita a senha"
      />
      <p v-if="confirmPassword.length > 0 && !passwordsMatch" class="text-xs text-destructive">
        As senhas não coincidem.
      </p>
    </div>
    <p v-if="isNew" class="text-xs text-muted-foreground">
      Os dados são cifrados com a sua senha antes de sair deste dispositivo. Se você esquecer a
      senha, não há como recuperá-los: guarde também uma cópia em arquivo.
    </p>
    <Button type="submit" class="h-12 w-full rounded-xl" :disabled="!valid || busy">
      {{ busy ? "Aguarde..." : submitLabel }}
    </Button>
  </form>
</template>
