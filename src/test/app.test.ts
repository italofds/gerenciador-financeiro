import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMemoryHistory } from "vue-router";

import App from "@/App.vue";
import { createAppRouter } from "@/router";

const mountApp = async (path = "/") => {
  const router = createAppRouter(createMemoryHistory());
  const wrapper = mount(App, { attachTo: document.body, global: { plugins: [router] } });
  await router.push(path);
  await flushPromises();
  return { router, wrapper };
};

// popstate navigation (the browser back button) settles asynchronously
const back = async (router: ReturnType<typeof createAppRouter>) => {
  router.back();
  await flushPromises();
};

const createProfile = async (wrapper: ReturnType<typeof mount>) => {
  await wrapper
    .findAll("button")
    .find((b) => b.text().includes("Novo perfil"))!
    .trigger("click");
  await wrapper.find("input:not([type=file])").setValue("Casa");
  await wrapper.find("form").trigger("submit");
  await flushPromises();
};

describe("App", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("only offers the cloud when the API address is configured", async () => {
    const { wrapper: offline } = await mountApp();
    expect(offline.text()).not.toContain("Abrir da nuvem");
    offline.unmount();

    vi.stubEnv("VITE_API_URL", "https://api.test");
    const { wrapper: online } = await mountApp();
    expect(online.text()).toContain("Abrir da nuvem");
    online.unmount();
  });

  it("lets the user choose between the file and the cloud when saving", async () => {
    vi.stubEnv("VITE_API_URL", "https://api.test");
    const { wrapper } = await mountApp();
    await createProfile(wrapper);

    await wrapper
      .findAll("button")
      .find((b) => b.text().includes("Salvar"))!
      .trigger("click");
    await flushPromises();
    expect(document.body.textContent).toContain("Baixar arquivo .json");
    expect(document.body.textContent).toContain("Salvar na nuvem");

    // without a session, saving to the cloud asks for the id and password first
    const toCloud = [...document.body.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("Salvar na nuvem"),
    )!;
    toCloud.click();
    await flushPromises();
    expect(document.body.querySelector("input[type=password]")).not.toBeNull();

    wrapper.unmount();
  });

  it("shows the welcome screen and opens the ledger for a new profile", async () => {
    const { wrapper } = await mountApp();

    expect(wrapper.text()).toContain("Abrir arquivo");

    await createProfile(wrapper);

    expect(wrapper.text()).toContain("Casa");
    expect(wrapper.text()).toContain("Conta corrente");

    wrapper.unmount();
  });

  it("closes sheets and the ledger with the browser back button", async () => {
    const { router, wrapper } = await mountApp();
    await createProfile(wrapper);
    expect(router.currentRoute.value.name).toBe("ledger");

    await wrapper
      .findAll("button")
      .find((b) => b.text().includes("Cartões"))!
      .trigger("click");
    await flushPromises();
    expect(document.body.querySelector("[role=dialog]")?.textContent).toContain("Cadastrar cartão");

    await back(router);
    expect(router.currentRoute.value.name).toBe("ledger");
    expect(document.body.querySelector("[role=dialog]")).toBeNull();

    await back(router);
    expect(router.currentRoute.value.name).toBe("welcome");
    expect(wrapper.text()).toContain("Abrir arquivo");

    wrapper.unmount();
  });

  it("asks before leaving a profile with unsaved changes", async () => {
    const { router, wrapper } = await mountApp();
    await createProfile(wrapper);
    const button = (text: string) =>
      [...document.body.querySelectorAll("button")].find((b) => b.textContent?.includes(text))!;

    button("Cartões").click();
    await flushPromises();
    button("Cadastrar cartão").click();
    await flushPromises();
    expect(router.currentRoute.value.name).toBe("card");
    const name = document.body.querySelector<HTMLInputElement>("[role=dialog] input")!;
    name.value = "Nubank";
    name.dispatchEvent(new Event("input"));
    document.body.querySelector("[role=dialog] form")!.dispatchEvent(new Event("submit"));
    await flushPromises();
    // saving the card goes back to the list instead of stacking another history entry
    expect(router.currentRoute.value.name).toBe("cards");
    expect(document.body.querySelector("[role=dialog]")?.textContent).toContain("Nubank");

    await back(router);
    expect(router.currentRoute.value.name).toBe("ledger");

    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    await back(router);
    expect(confirm).toHaveBeenCalledOnce();
    expect(router.currentRoute.value.name).toBe("ledger");
    expect(wrapper.text()).toContain("Casa");

    confirm.mockReturnValue(true);
    await back(router);
    expect(router.currentRoute.value.name).toBe("welcome");

    confirm.mockRestore();
    wrapper.unmount();
  });

  it("sends the ledger routes back to the welcome screen when no profile is open", async () => {
    const { router, wrapper } = await mountApp("/perfil/cartoes");
    expect(router.currentRoute.value.name).toBe("welcome");
    expect(wrapper.text()).toContain("Abrir arquivo");
    wrapper.unmount();
  });
});
