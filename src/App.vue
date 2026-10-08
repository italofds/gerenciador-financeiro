<script setup lang="ts">
import { ref } from "vue";
import { Toaster } from "vue-sonner";
import Ledger from "@/components/finance/Ledger.vue";
import Welcome from "@/components/finance/Welcome.vue";
import type { Profile } from "@/lib/finance";

const profile = ref<Profile | null>(null);
const dirty = ref(false);

const open = (p: Profile) => {
  profile.value = p;
  dirty.value = false;
};
const update = (p: Profile) => {
  profile.value = p;
  dirty.value = true;
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
      :dirty="dirty"
      @update="update"
      @saved="dirty = false"
      @close="profile = null"
    />
    <Welcome v-else @open="open" />
  </div>
  <Toaster position="top-center" :toast-options="toastOptions" />
</template>
