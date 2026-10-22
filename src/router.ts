import {
  createRouter,
  createWebHashHistory,
  type RouteRecordName,
  type RouteRecordRaw,
  type Router,
  type RouterHistory,
} from "vue-router";
import Ledger from "@/components/finance/Ledger.vue";
import Welcome from "@/components/finance/Welcome.vue";

export type SheetName = "record" | "card" | "cards" | "save" | "cloud";

declare module "vue-router" {
  interface RouteMeta {
    // profundidade na navegação: 0 é a tela inicial, 1 o livro-caixa e acima dele as folhas
    depth: number;
    sheet?: SheetName;
  }
}

// Todas as rotas do livro-caixa usam o mesmo componente, que é reaproveitado entre elas: abrir
// uma folha não perde o mês exibido. O perfil só existe na memória, então essas rotas voltam à
// tela inicial quando não há perfil aberto (veja App.vue).
const routes: RouteRecordRaw[] = [
  { path: "/", name: "welcome", component: Welcome, meta: { depth: 0 } },
  { path: "/perfil", name: "ledger", component: Ledger, meta: { depth: 1 } },
  {
    // `id` ausente cria um registro; ao editar, a query `mes` diz qual mês está sendo editado
    path: "/perfil/registro/:id?",
    name: "record",
    component: Ledger,
    meta: { depth: 2, sheet: "record" },
  },
  { path: "/perfil/cartoes", name: "cards", component: Ledger, meta: { depth: 2, sheet: "cards" } },
  {
    path: "/perfil/cartoes/cartao/:id?",
    name: "card",
    component: Ledger,
    meta: { depth: 3, sheet: "card" },
  },
  { path: "/perfil/salvar", name: "save", component: Ledger, meta: { depth: 2, sheet: "save" } },
  {
    path: "/perfil/salvar/nuvem",
    name: "cloud",
    component: Ledger,
    meta: { depth: 3, sheet: "cloud" },
  },
  { path: "/:rest(.*)*", redirect: "/" },
];

// Hash: o app é servido como arquivos estáticos (GitHub Pages), sem reescrita de URL no servidor.
export const createAppRouter = (history: RouterHistory = createWebHashHistory()) =>
  createRouter({ history, routes });

/**
 * Volta pelo histórico até a rota `name`, mais rasa que a atual, para que o botão voltar do
 * navegador não reabra o que acabou de ser fechado. Funciona porque cada rota só é aberta com
 * `push` a partir da rota logo abaixo dela (a tela inicial, o livro-caixa ou a folha de onde
 * saiu), e as rotas do livro-caixa não abrem direto pela URL: sem perfil, voltam para `/`.
 */
export const leaveTo = (router: Router, name: RouteRecordName) => {
  const steps = router.currentRoute.value.meta.depth - router.resolve({ name }).meta.depth;
  if (steps > 0) router.go(-steps);
};
