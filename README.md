# Gerenciador Financeiro

Aplicativo web para controlar entradas, saídas e cartões de crédito mês a mês.

Cada perfil é um arquivo `.json` que você abre e salva no próprio dispositivo. Opcionalmente, o
perfil também pode ser guardado na nuvem, protegido por id e senha, por meio de uma API de
armazenamento genérico que fica num repositório separado (compartilhada com outros apps).

## Funcionalidades

- Criar um perfil novo ou abrir um perfil `.json` salvo anteriormente.
- Abrir e salvar o perfil na nuvem com id de usuário e senha. Os dados são cifrados no navegador
  antes do envio: o servidor não consegue lê-los e a senha nunca sai do dispositivo. Uma senha
  esquecida não pode ser recuperada.
- Registrar entradas e saídas na conta corrente ou em um cartão de crédito.
- Recorrência única, limitada (N meses) ou ilimitada (mensal).
- Editar ou excluir um registro recorrente só no mês atual, dali em diante ou em todos os meses.
- Cadastrar cartões com dia de vencimento; a fatura de um mês entra automaticamente na conta
  corrente do mês seguinte.
- Saldo do mês anterior transportado automaticamente para o mês seguinte.
- Marcar registros como efetivados e comparar o saldo previsto com o já efetivado.
- Navegar entre meses pelas setas ou arrastando a tela para os lados.
- Instalar o app na tela inicial do celular (PWA) e abri-lo sem conexão. No Android, use
  **Instalar app** no menu do Chrome; no iPhone, **Compartilhar → Adicionar à Tela de Início** no
  Safari. A instalação exige que o app esteja publicado em HTTPS.

As alterações ficam só na memória até você tocar em **Salvar** e escolher entre baixar o arquivo
`.json` atualizado ou salvar na nuvem. Um ponto vermelho no botão indica alterações ainda não
salvas.

## Como rodar

Requer Node.js 22 ou superior e npm.

```sh
npm install
npm run dev
```

### Nuvem (opcional)

As opções de nuvem só aparecem quando a variável `VITE_API_URL` aponta para a API. Sem ela, o app
trabalha apenas com arquivos.

- Em desenvolvimento, `.env.development` já aponta para `http://localhost:8080`. Suba a API
  (repositório separado, `cloud-blob-api`) seguindo o README dela.
- Em produção, crie `.env.production` com o endereço da API publicada antes de `npm run build`
  ou `npm run deploy`:

  ```sh
  VITE_API_URL=https://endereco-da-sua-api
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
vite.config.ts              Build, manifesto do app instalável e service worker
public/                     Favicon e ícones do app instalado
src/
  main.ts                   Ponto de entrada
  App.vue                   Alterna entre a tela inicial e o livro-caixa
  styles.css                Tailwind e tokens de cor, raio e fonte
  components/
    finance/                Telas e formulários do app
    ui/                     Componentes base (botão, campo, checkbox, rótulo)
  lib/
    finance.ts              Tipos e regras de negócio (recorrência, faturas, saldos)
    cloud.ts                Cifragem do perfil e chamadas à API de nuvem
    utils.ts                Utilitário de classes CSS
  test/                     Testes e configuração do ambiente de teste
```

A API de nuvem (Express e MongoDB) vive num repositório separado (`cloud-blob-api`), compartilhado
com outros apps que também guardam um perfil cifrado na nuvem.

## Tecnologias

- Vue 3 com `<script setup>` e TypeScript
- Vite e `vite-plugin-pwa`
- Tailwind CSS 4
- Vitest e Vue Test Utils
