# Gerenciador Financeiro — API de nuvem

API em Express que guarda no MongoDB o perfil de cada usuário do [Gerenciador Financeiro](../README.md).

Ela é só armazenamento: o perfil chega cifrado pelo navegador e a API não tem como lê-lo. A senha
do usuário nunca é enviada; a API recebe uma chave de autenticação derivada dela e guarda apenas
o hash dessa chave.

## Rotas

| Rota                         | Corpo                    | Respostas                                       |
| ---------------------------- | ------------------------ | ----------------------------------------------- |
| `POST /v1/profiles`          | `{ id, authKey, blob }`  | `201 { rev: 1 }`, `409` id em uso               |
| `POST /v1/profiles/:id/open` | `{ authKey }`            | `200 { blob, rev }`, `401`                      |
| `PUT /v1/profiles/:id`       | `{ authKey, blob, rev }` | `200 { rev }`, `401`, `409 { rev }` em conflito |
| `GET /healthz`               |                          | `200`                                           |

- `id`: de 3 a 32 caracteres entre `a-z`, `0-9`, `.`, `_` e `-`.
- `blob`: `{ v: 1, iv, data }`, o perfil cifrado com AES-GCM, em base64url.
- `rev`: revisão do perfil. O `PUT` só grava se `rev` for a revisão atual; caso contrário
  responde `409` com a revisão guardada, para o app perguntar antes de sobrescrever.
- O corpo é limitado a 512 kB e cada IP a 100 requisições a cada 15 minutos.

## Variáveis de ambiente

| Variável      | Obrigatória | Padrão                   | Descrição                                         |
| ------------- | ----------- | ------------------------ | ------------------------------------------------- |
| `MONGODB_URI` | sim         |                          | String de conexão do MongoDB                      |
| `MONGODB_DB`  | não         | `gerenciador-financeiro` | Nome do banco                                     |
| `CORS_ORIGIN` | não         | `http://localhost:5173`  | Origens do frontend permitidas, separadas por `,` |
| `PORT`        | não         | `8080`                   | Porta do servidor                                 |

## Como rodar

Requer Node.js 22 ou superior.

```sh
npm install
cp .env.example .env   # preencha MONGODB_URI
npm run dev
```

| Comando             | O que faz                                      |
| ------------------- | ---------------------------------------------- |
| `npm run dev`       | Servidor com recarga automática, lendo `.env`  |
| `npm run build`     | Compila para `dist/`                           |
| `npm start`         | Roda o build de `dist/`                        |
| `npm run typecheck` | Checagem de tipos                              |
| `npm test`          | Testes das rotas, com armazenamento em memória |

## Publicação no Google Cloud (nível gratuito)

A API roda no Cloud Run e o banco no MongoDB Atlas. Os dois têm nível gratuito suficiente para
uso pessoal, mas o Google Cloud exige uma conta de faturamento com cartão.

### 1. Banco no MongoDB Atlas

1. Crie um cluster **M0 (Free)**, de preferência no provedor Google Cloud e na mesma região que
   você usará no Cloud Run (por exemplo, `us-central1`).
2. Em **Database Access**, crie um usuário com senha forte e permissão de leitura e escrita.
3. Em **Network Access**, libere `0.0.0.0/0`. O Cloud Run não tem IP de saída fixo no nível
   gratuito, então a proteção do banco é a senha desse usuário.
4. Copie a string de conexão (`mongodb+srv://...`) com o usuário e a senha.

### 2. API no Cloud Run

Com o [gcloud CLI](https://cloud.google.com/sdk/docs/install) instalado e um projeto criado:

```sh
gcloud services enable run.googleapis.com cloudbuild.googleapis.com secretmanager.googleapis.com

# guarda a string de conexão como segredo
printf '%s' 'mongodb+srv://usuario:senha@cluster.exemplo.mongodb.net/' |
  gcloud secrets create gerenciador-financeiro-mongodb-uri --data-file=-

# a partir da raiz do repositório
gcloud run deploy gerenciador-financeiro-api \
  --source api \
  --region us-central1 \
  --allow-unauthenticated \
  --max-instances 1 \
  --memory 256Mi \
  --set-secrets MONGODB_URI=gerenciador-financeiro-mongodb-uri:latest \
  --set-env-vars CORS_ORIGIN=https://italofds.github.io
```

Se o deploy falhar por falta de acesso ao segredo, dê à conta de serviço do Cloud Run o papel
**Secret Manager Secret Accessor** e repita o comando.

- `--allow-unauthenticated` torna a API pública, o que é necessário para o navegador acessá-la.
  A proteção de cada perfil é a chave de autenticação do usuário.
- `--max-instances 1` mantém o custo dentro do nível gratuito e faz o limite de requisições por
  IP, que fica na memória da instância, valer para todo o tráfego.
- `CORS_ORIGIN` é a origem do site publicado, sem o caminho. Para liberar mais de uma, use a
  sintaxe `--set-env-vars "^@^CORS_ORIGIN=https://a.exemplo,https://b.exemplo"`.

### 3. Apontar o frontend para a API

O deploy imprime o endereço do serviço (`https://gerenciador-financeiro-api-....run.app`). Na raiz do repositório,
crie `.env.production` com ele e publique o site:

```sh
VITE_API_URL=https://gerenciador-financeiro-api-....run.app
```

```sh
npm run deploy
```

### Custos

Crie um alerta em **Faturamento > Orçamentos e alertas** com um valor baixo. O Cloud Run só
cobra enquanto atende requisições e a instância é desligada quando fica ociosa; por isso a
primeira chamada depois de um tempo parado leva alguns segundos.
