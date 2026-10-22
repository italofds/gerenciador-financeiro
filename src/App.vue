<script setup lang="ts">
import { onBeforeUnmount, ref, shallowRef } from "vue";
import { RouterView, useRouter } from "vue-router";
import { Toaster } from "vue-sonner";
import type { CloudSession } from "@/lib/cloud";
import type { Profile } from "@/lib/finance";

const router = useRouter();
const profile = ref<Profile | null>(null);
// set while the open profile is linked to a cloud account
const session = shallowRef<CloudSession | null>(null);
const dirty = ref(false);

const open = (p: Profile, s?: CloudSession) => {
  profile.value = p;
  session.value = s ?? null;
  dirty.value = false;
  void router.push({ name: "ledger" });
};
const update = (p: Profile) => {
  profile.value = p;
  dirty.value = true;
};
const saved = (s?: CloudSession) => {
  if (s) session.value = s;
  dirty.value = false;
};

const stopGuard = router.beforeEach((to, from) => {
  // the profile only lives in memory: after a reload there is nothing to show in the ledger
  if (to.meta.depth > 0 && !profile.value) return { name: "welcome", replace: true };
  if (
    from.meta.depth > 0 &&
    to.meta.depth === 0 &&
    dirty.value &&
    !confirm("Há alterações não salvas. Fechar mesmo assim?")
  )
    return false;
  return true;
});
const stopClose = router.afterEach((to, _from, failure) => {
  if (failure || to.meta.depth > 0) return;
  profile.value = null;
  session.value = null;
});
onBeforeUnmount(() => {
  stopGuard();
  stopClose();
});

const toastOptions = {
  classes: {
    toast: "!bg-background !text-foreground !border-border shadow-lg",
    description: "!text-muted-foreground",
  },
};
</script>

<template>
  <div class="mx-auto min-h-screen max-w-md bg-background">
    <RouterView v-slot="{ Component, route }">
      <component :is="Component" v-if="route.meta.depth === 0" @open="open" />
      <component
        :is="Component"
        v-else-if="profile"
        :profile="profile"
        :session="session"
        :dirty="dirty"
        @update="update"
        @saved="saved"
      />
    </RouterView>
  </div>
  <Toaster position="top-center" :toast-options="toastOptions" />
</template>
