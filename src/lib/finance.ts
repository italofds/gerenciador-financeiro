export type Card = { id: string; name: string; dueDay: number };
export type Recurrence = { type: "none" | "limited" | "unlimited"; months?: number };
export type Override = { deleted?: boolean; amount?: number; description?: string; source?: string };
export type FinRecord = {
  id: string;
  amount: number;
  description: string;
  date: string; // YYYY-MM-DD (first occurrence)
  source: string; // "account" or card id
  recurrence: Recurrence;
  endYm?: string; // exclusive end
  overrides: Record<string, Override>;
};
export type Profile = {
  name: string;
  cards: Card[];
  records: FinRecord[];
  done: Record<string, boolean>; // key: recordId@ym | bill:cardId@ym | carry@ym
};

export type Row = {
  key: string;
  recordId?: string;
  auto?: "bill" | "carry";
  description: string;
  amount: number;
  day: number;
  recurrenceLabel?: string | undefined;
};

export const uid = () => Math.random().toString(36).slice(2, 10);
export const ymOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
export const addYm = (ym: string, n: number) => {
  const [y = 0, m = 1] = ym.split("-").map(Number);
  return ymOf(new Date(y, m - 1 + n, 1));
};
export const diffYm = (a: string, b: string) => {
  const [ay = 0, am = 0] = a.split("-").map(Number);
  const [by = 0, bm = 0] = b.split("-").map(Number);
  return (ay - by) * 12 + (am - bm);
};
export const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const ymLabel = (ym: string) => {
  const [y = 0, m = 1] = ym.split("-").map(Number);
  const s = new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "long" });
  return { month: s.charAt(0).toUpperCase() + s.slice(1), year: y };
};

export const newProfile = (name: string): Profile => ({ name, cards: [], records: [], done: {} });

// Reads a saved profile (file or cloud), filling in fields that older versions didn't have.
export function parseProfile(data: unknown): Profile {
  const d = data as Partial<Profile> | null;
  if (!d || !Array.isArray(d.records) || !Array.isArray(d.cards)) throw new Error("invalid profile");
  return {
    name: String(d.name ?? "Perfil"),
    cards: d.cards,
    records: d.records.map((r) => ({ ...r, overrides: r.overrides ?? {} })),
    done: d.done ?? {},
  };
}

export function occurs(r: FinRecord, ym: string) {
  const idx = diffYm(ym, r.date.slice(0, 7));
  if (idx < 0) return -1;
  if (r.endYm && diffYm(ym, r.endYm) >= 0) return -1;
  if (r.recurrence.type === "none" && idx > 0) return -1;
  if (r.recurrence.type === "limited" && idx >= (r.recurrence.months ?? 1)) return -1;
  if (r.overrides[ym]?.deleted) return -1;
  return idx;
}

function recRows(p: Profile, ym: string, source: string): Row[] {
  const rows: Row[] = [];
  for (const r of p.records) {
    const idx = occurs(r, ym);
    if (idx < 0) continue;
    const o = r.overrides[ym] ?? {};
    if ((o.source ?? r.source) !== source) continue;
    let label: string | undefined;
    if (r.recurrence.type === "limited") label = `${idx + 1}/${r.recurrence.months}`;
    if (r.recurrence.type === "unlimited") label = "Mensal";
    rows.push({
      key: `${r.id}@${ym}`,
      recordId: r.id,
      description: o.description ?? r.description,
      amount: o.amount ?? r.amount,
      day: Number(r.date.slice(8, 10)),
      recurrenceLabel: label,
    });
  }
  return rows.sort((a, b) => a.day - b.day);
}

const sum = (rows: Row[]) => rows.reduce((s, r) => s + r.amount, 0);

export function computeMonth(p: Profile, ym: string) {
  const starts = p.records.map((r) => r.date.slice(0, 7)).sort();
  const minYm = starts[0];
  const cache = new Map<string, number>();

  const accountRows = (m: string): Row[] => {
    const rows = recRows(p, m, "account");
    const prev = addYm(m, -1);
    for (const c of p.cards) {
      const total = sum(recRows(p, prev, c.id));
      if (total !== 0)
        rows.push({ key: `bill:${c.id}@${m}`, auto: "bill", description: `Fatura ${c.name}`, amount: total, day: c.dueDay });
    }
    if (minYm && diffYm(prev, minYm) >= 0) {
      rows.unshift({ key: `carry@${m}`, auto: "carry", description: "Saldo do mês anterior", amount: balance(prev), day: 1 });
    }
    return rows.sort((a, b) => (a.auto === "carry" ? -1 : b.auto === "carry" ? 1 : a.day - b.day));
  };

  function balance(m: string): number {
    if (!minYm || diffYm(m, minYm) < 0) return 0;
    if (cache.has(m)) return cache.get(m)!;
    // iterate to avoid deep recursion
    let cur = minYm;
    while (diffYm(m, cur) > 0 && !cache.has(cur)) {
      cache.set(cur, sum(accountRows(cur)));
      cur = addYm(cur, 1);
    }
    const v = sum(accountRows(m));
    cache.set(m, v);
    return v;
  }

  const groups = [
    { id: "account", name: "Conta corrente", dueDay: undefined as number | undefined, rows: accountRows(ym) },
    ...p.cards.map((c) => ({ id: c.id, name: c.name, dueDay: c.dueDay as number | undefined, rows: recRows(p, ym, c.id) })),
  ];
  return groups.map((g) => ({
    ...g,
    total: sum(g.rows),
    doneTotal: sum(g.rows.filter((r) => p.done[r.key])),
  }));
}

export type Scope = "one" | "all" | "forward";

export function deleteRecord(p: Profile, id: string, ym: string, scope: Scope): Profile {
  const records = p.records.flatMap((r) => {
    if (r.id !== id) return [r];
    if (scope === "all" || (scope === "forward" && ym <= r.date.slice(0, 7))) return [];
    if (scope === "forward") return [{ ...r, endYm: ym }];
    return [{ ...r, overrides: { ...r.overrides, [ym]: { ...r.overrides[ym], deleted: true } } }];
  });
  return { ...p, records };
}

export type RecordInput = Omit<FinRecord, "id" | "overrides" | "endYm">;

export function updateRecord(p: Profile, id: string, ym: string, scope: Scope, input: RecordInput): Profile {
  const r = p.records.find((x) => x.id === id);
  if (!r) return p;
  const isRec = r.recurrence.type !== "none";
  if (!isRec || scope === "all" || (scope === "forward" && ym <= r.date.slice(0, 7))) {
    const startYm = scope === "all" || !isRec ? input.date.slice(0, 7) : r.date.slice(0, 7);
    const date = isRec && scope === "all" ? `${r.date.slice(0, 7)}-${input.date.slice(8, 10)}` : input.date;
    void startYm;
    return { ...p, records: p.records.map((x) => (x.id === id ? { ...x, ...input, date } : x)) };
  }
  if (scope === "one") {
    return {
      ...p,
      records: p.records.map((x) =>
        x.id === id
          ? { ...x, overrides: { ...x.overrides, [ym]: { amount: input.amount, description: input.description, source: input.source } } }
          : x,
      ),
    };
  }
  // forward: split
  const idx = diffYm(ym, r.date.slice(0, 7));
  let recurrence = input.recurrence;
  if (recurrence.type === "limited" && r.recurrence.type === "limited" && recurrence.months === r.recurrence.months)
    recurrence = { type: "limited", months: Math.max(1, (r.recurrence.months ?? 1) - idx) };
  const nr: FinRecord = { ...input, recurrence, date: `${ym}-${input.date.slice(8, 10)}`, id: uid(), overrides: {} };
  return { ...p, records: [...p.records.map((x) => (x.id === id ? { ...x, endYm: ym } : x)), nr] };
}
