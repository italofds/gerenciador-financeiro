import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import RecordForm from "@/components/finance/RecordForm.vue";

describe("RecordForm", () => {
  it("keeps the amount field numeric and formatted with two decimals", async () => {
    const wrapper = mount(RecordForm, { props: { cards: [], defaultDate: "2026-10-08" } });
    const input = wrapper.find("input");
    const el = input.element as HTMLInputElement;

    expect(el.value).toBe("0,00");
    await input.setValue("12a3");
    expect(el.value).toBe("1,23");
    // a character that doesn't change the amount must not stay in the field
    await input.setValue("1,23x");
    expect(el.value).toBe("1,23");
    await input.setValue("1,23-");
    expect(el.value).toBe("1,23");
    await input.setValue("123456");
    expect(el.value).toBe("1.234,56");
    await input.setValue("");
    expect(el.value).toBe("0,00");
  });

  it("highlights the expense option in red", async () => {
    const wrapper = mount(RecordForm, { props: { cards: [], defaultDate: "2026-10-08" } });
    const out = wrapper.findAll("button").find((b) => b.text().includes("Saída"))!;

    expect(out.classes()).toContain("bg-destructive");
    await wrapper
      .findAll("button")
      .find((b) => b.text().includes("Entrada"))!
      .trigger("click");
    expect(out.classes()).not.toContain("bg-destructive");
  });
});
