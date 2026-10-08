# Instruções para agentes

Aplicativo de finanças pessoais em Vue 3, com uma API opcional (`api/`) para guardar o perfil na
nuvem. Veja o [README](README.md) para funcionalidades, scripts e estrutura de pastas.

## Restrições do projeto

- **O frontend funciona sem a API.** O perfil existe na memória e no arquivo `.json` que o
  usuário abre e salva. As opções de nuvem só aparecem quando `VITE_API_URL` está definida
  (`cloudEnabled()` em `src/lib/cloud.ts`); nenhuma funcionalidade pode depender dela.
- **O servidor nunca lê os dados do usuário.** O perfil é cifrado no navegador em
  `src/lib/cloud.ts` e a senha não sai do dispositivo: a API recebe só a chave de autenticação
  derivada e um blob opaco. Não envie à API senha, perfil em claro nem campos dele, e não adicione
  rotas que precisem interpretar o conteúdo do perfil.
- **A API é só armazenamento.** `api/` é um projeto Node separado (Express e MongoDB), com
  `package.json` próprio. As regras de negócio continuam no frontend.
- **Compatibilidade dos dados salvos.** O `.json` e o conteúdo cifrado na nuvem são o tipo
  `Profile` de `src/lib/finance.ts` serializado. Perfis já salvos pelos usuários precisam
  continuar abrindo: ao mudar esses tipos, trate a ausência dos campos novos em `parseProfile`.
  Mudar a derivação de chaves ou o formato do blob em `src/lib/cloud.ts` torna ilegíveis os
  perfis já salvos na nuvem; crie uma nova versão (`v`) e continue lendo a anterior.
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

Se a alteração tocar em `api/`, rode também dentro dessa pasta:

```sh
npm run typecheck
npm test
npm run build
```

O contrato das rotas é implementado em `api/src/app.ts` e consumido em `src/lib/cloud.ts`; ao
mudar um lado, mude o outro e a API simulada de `src/test/cloud.test.ts`.

O `tsconfig.json` é estrito (`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`); corrija
os erros de tipo em vez de afrouxar a configuração.

Formate com Prettier apenas os arquivos que você alterou. `npm run format` reformata o projeto
inteiro, incluindo arquivos que ainda não seguem o Prettier, e gera um diff grande sem relação
com a tarefa.
