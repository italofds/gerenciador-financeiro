import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import App from "@/App.vue";

describe("App", () => {
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
