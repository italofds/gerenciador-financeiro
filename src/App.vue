<script setup lang="ts">
import { ref, shallowRef } from "vue";
import { Toaster } from "vue-sonner";
import Ledger from "@/components/finance/Ledger.vue";
import Welcome from "@/components/finance/Welcome.vue";
import type { CloudSession } from "@/lib/cloud";
import type { Profile } from "@/lib/finance";

const profile = ref<Profile | null>(null);
// set while the open profile is linked to a cloud account
const session = shallowRef<CloudSession | null>(null);
const dirty = ref(false);

const open = (p: Profile, s?: CloudSession) => {
  profile.value = p;
  session.value = s ?? null;
  dirty.value = false;
};
const update = (p: Profile) => {
  profile.value = p;
  dirty.value = true;
};
const saved = (s?: CloudSession) => {
  if (s) session.value = s;
  dirty.value = false;
};
const close = () => {
  profile.value = null;
  session.value = null;
};

const toastOptions = {
  classes: {
    toast: "!bg-background !text-foreground !border-border shadow-lg",
    description: "!text-muted-foreground",
  },
};
</script>

<template>
  <div class="mx-auto min-h-screen max-w-md bg-background">
    <Ledger
      v-if="profile"
      :profile="profile"
      :session="session"
      :dirty="dirty"
      @update="update"
      @saved="saved"
      @close="close"
    />
    <Welcome v-else @open="open" />
  </div>
  <Toaster position="top-center" :toast-options="toastOptions" />
</template>
