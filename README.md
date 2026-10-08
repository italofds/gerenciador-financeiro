# Caixa — Gerenciador financeiro pessoal

Aplicativo web para controlar entradas, saídas e cartões de crédito mês a mês.

É apenas frontend: não há servidor, login nem banco de dados. Cada perfil é um arquivo `.json`
que você abre e salva no próprio dispositivo.

## Funcionalidades

- Criar um perfil novo ou abrir um perfil `.json` salvo anteriormente.
- Registrar entradas e saídas na conta corrente ou em um cartão de crédito.
- Recorrência única, limitada (N meses) ou ilimitada (mensal).
- Editar ou excluir um registro recorrente só no mês atual, dali em diante ou em todos os meses.
- Cadastrar cartões com dia de vencimento; a fatura de um mês entra automaticamente na conta
  corrente do mês seguinte.
- Saldo do mês anterior transportado automaticamente para o mês seguinte.
- Marcar registros como efetivados e comparar o saldo previsto com o já efetivado.
- Navegar entre meses pelas setas ou arrastando a tela para os lados.

As alterações ficam só na memória até você tocar em **Salvar**, que baixa o arquivo `.json`
atualizado. Um ponto vermelho no botão indica alterações ainda não salvas.

## Como rodar

Requer Node.js 22 ou superior e npm.

```sh
npm install
npm run dev
```

## Scripts

| Comando              | O que faz                                            |
| -------------------- | ---------------------------------------------------- |
| `npm run dev`        | Servidor de desenvolvimento com recarga automática   |
| `npm run build`      | Checagem de tipos e build de produção em `dist/`     |
| `npm run preview`    | Serve localmente o build de produção                 |
| `npm run typecheck`  | Checagem de tipos com `vue-tsc`                      |
| `npm test`           | Testes com Vitest                                    |
| `npm run test:watch` | Testes em modo observação                            |
| `npm run lint`       | ESLint                                               |
| `npm run format`     | Formata o código com Prettier                        |

O conteúdo de `dist/` é estático e pode ser publicado em qualquer hospedagem de arquivos.

## Estrutura

```
index.html                  Página única e metadados
src/
  main.ts                   Ponto de entrada
  App.vue                   Alterna entre a tela inicial e o livro-caixa
  styles.css                Tailwind e tokens de cor, raio e fonte
  components/
    finance/                Telas e formulários do app
    ui/                     Componentes base (botão, campo, checkbox, rótulo)
  lib/
    finance.ts              Tipos e regras de negócio (recorrência, faturas, saldos)
    utils.ts                Utilitário de classes CSS
  test/                     Testes e configuração do ambiente de teste
```

## Tecnologias

- Vue 3 com `<script setup>` e TypeScript
- Vite
- Tailwind CSS 4
- Vitest e Vue Test Utils
