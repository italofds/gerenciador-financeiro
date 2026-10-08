import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";

import App from "@/App.vue";

const createProfile = async (wrapper: ReturnType<typeof mount>) => {
  await wrapper
    .findAll("button")
    .find((b) => b.text().includes("Novo perfil"))!
    .trigger("click");
  await wrapper.find("input:not([type=file])").setValue("Casa");
  await wrapper.find("form").trigger("submit");
};

describe("App", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("only offers the cloud when the API address is configured", async () => {
    const offline = mount(App, { attachTo: document.body });
    expect(offline.text()).not.toContain("Abrir da nuvem");
    offline.unmount();

    vi.stubEnv("VITE_API_URL", "https://api.test");
    const online = mount(App, { attachTo: document.body });
    expect(online.text()).toContain("Abrir da nuvem");
    online.unmount();
  });

  it("lets the user choose between the file and the cloud when saving", async () => {
    vi.stubEnv("VITE_API_URL", "https://api.test");
    const wrapper = mount(App, { attachTo: document.body });
    await createProfile(wrapper);

    await wrapper
      .findAll("button")
      .find((b) => b.text().includes("Salvar"))!
      .trigger("click");
    expect(document.body.textContent).toContain("Baixar arquivo .json");
    expect(document.body.textContent).toContain("Salvar na nuvem");

    // without a session, saving to the cloud asks for the id and password first
    const toCloud = [...document.body.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("Salvar na nuvem"),
    )!;
    toCloud.click();
    await wrapper.vm.$nextTick();
    expect(document.body.querySelector("input[type=password]")).not.toBeNull();

    wrapper.unmount();
  });

  it("shows the welcome screen and opens the ledger for a new profile", async () => {
    const wrapper = mount(App, { attachTo: document.body });

    expect(wrapper.text()).toContain("Abrir arquivo");

    const newProfile = wrapper.findAll("button").find((b) => b.text().includes("Novo perfil"));
    await newProfile!.trigger("click");
    await wrapper.find("input:not([type=file])").setValue("Casa");
    await wrapper.find("form").trigger("submit");

    expect(wrapper.text()).toContain("Casa");
    expect(wrapper.text()).toContain("Conta corrente");

    wrapper.unmount();
  });
});
