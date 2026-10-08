# Instruções para agentes

Aplicativo de finanças pessoais em Vue 3, apenas frontend. Veja o [README](README.md) para
funcionalidades, scripts e estrutura de pastas.

## Restrições do projeto

- **Sem backend.** Não adicione servidor, API, autenticação nem banco de dados. Os dados do
  usuário existem só na memória e no arquivo `.json` que ele abre e salva.
- **Compatibilidade do arquivo salvo.** O `.json` é o tipo `Profile` de `src/lib/finance.ts`
  serializado. Arquivos já salvos pelos usuários precisam continuar abrindo: ao mudar esses
  tipos, trate a ausência dos campos novos na leitura (em `Welcome.vue`).
- **Página única.** Não há roteador; `App.vue` alterna entre `Welcome` e `Ledger`. Só adicione
  `vue-router` se surgir de fato uma segunda rota.
- **Interface em português do Brasil**, pensada para celular (coluna de largura `max-w-md`).

## Convenções de código

- Componentes em arquivo único com `<script setup lang="ts">`, props e eventos tipados por
  `defineProps` e `defineEmits`.
- As regras de negócio ficam em `src/lib/finance.ts` como funções puras que recebem um `Profile`
  e devolvem outro. Os componentes não alteram o perfil no lugar: emitem `update` com o novo
  objeto, e `App.vue` é o único dono do estado.
- Os componentes de `src/components/ui/` aceitam uma prop `class` e a combinam com `cn()` de
  `src/lib/utils.ts`, para que classes passadas por quem usa substituam as padrão.
- Estilo com utilitários do Tailwind. Cores, raios e fontes são tokens definidos em
  `src/styles.css`; use os tokens (`bg-primary`, `text-income`, `text-expense`...) em vez de
  cores fixas, e declare cores novas em `oklch`.
- Ícones vêm de `@lucide/vue`; avisos (toasts), de `vue-sonner`.
- Importe a partir de `src` com o alias `@/`.

## Antes de concluir uma alteração

```sh
npm run typecheck
npm test
npm run build
```

O `tsconfig.json` é estrito (`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`); corrija
os erros de tipo em vez de afrouxar a configuração.

Formate com Prettier apenas os arquivos que você alterou. `npm run format` reformata o projeto
inteiro, incluindo arquivos que ainda não seguem o Prettier, e gera um diff grande sem relação
com a tarefa.
