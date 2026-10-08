# FIAP Chat

Aplicativo de chat em **React Native + Expo + TypeScript** com conversas individuais e em grupo, autenticação por e-mail e senha, mensagens em tempo real e notificações push enviadas por uma **API própria** publicada na Vercel.

## Integrantes

- RM557724 — Guilherme Cezarino Simoes

---

## Sumário

1. [Tecnologias](#tecnologias)
2. [Serviços Firebase e responsabilidades](#serviços-firebase-e-responsabilidades)
3. [Arquitetura](#arquitetura)
4. [Estrutura do projeto](#estrutura-do-projeto)
5. [Configuração do Firebase](#configuração-do-firebase)
6. [Armazenamento das fotos](#armazenamento-das-fotos)
7. [API de notificações](#api-de-notificações)
8. [Instalação e execução do app](#instalação-e-execução-do-app)
9. [Notificações no Android e no iOS](#notificações-no-android-e-no-ios)
10. [Política de notificações](#política-de-notificações)
11. [Limite de integrantes e concorrência](#limite-de-integrantes-e-concorrência)
12. [Regras de segurança](#regras-de-segurança)
13. [Telas](#telas)
14. [Evidência de notificação](#evidência-de-notificação)

---

## Tecnologias

| Camada | Tecnologia |
| --- | --- |
| App | React Native 0.86, **Expo SDK 57** (≥ 55, exigido), TypeScript 6 (`strict`, sem `any`) |
| Navegação | React Navigation 7 (native stack, parâmetros tipados) |
| Autenticação | Firebase Authentication (somente e-mail/senha), sessão persistida com AsyncStorage |
| Mensagens | Firebase Realtime Database |
| Perfis, grupos, políticas, tokens | Cloud Firestore |
| Fotos | Vercel Blob (modo privado), acessado somente pela API |
| Push | `expo-notifications` + Expo Push Service (entrega via **FCM** no Android e APNs no iOS) |
| API | Node.js 20+, Express 5, TypeScript, Firebase Admin SDK — hospedada na **Vercel** |

## Serviços Firebase e responsabilidades

| Serviço | Responsabilidade no projeto |
| --- | --- |
| **Authentication** | Criar conta (e-mail/senha), login, recuperação da sessão ao reabrir o app, identificação por `uid`, logout. Não há login social, anônimo ou usuários fixos no código. |
| **Realtime Database** | Persistência de **todas** as mensagens (`messages/{conversationId}/{messageId}`), sincronização em tempo real com listeners (`onValue`) que são removidos ao sair da tela/trocar de conversa/fazer logout. Também guarda `groupMembers/{groupId}` (espelho de membros escrito **apenas pela API**) usado pelas regras. |
| **Cloud Firestore** | `users/{uid}` (perfil completo, privado), `userDirectory/{uid}` (nome e foto públicos para busca), `groups/{groupId}` (metadados, `memberIds`, `memberLimit`, `notificationPolicy`), `directConversations/{id}`, `users/{uid}/devices/{deviceId}` (tokens de push e preferência `enabled`) e `notificationDispatches` (idempotência da API). |
| **Cloud Messaging (FCM)** | Entrega das notificações no Android. O app registra o token no FCM (via `google-services.json`) e a API envia pelo Expo Push Service, que usa a credencial **FCM v1** do projeto. O payload sempre contém `conversationId` e `conversationType`. |

## Arquitetura

```
Usuário envia a mensagem
        ↓
Realtime Database persiste messages/{conversationId}/{messageId}
        ↓
Listeners (onValue) atualizam a conversa aberta em todos os aparelhos
        ↓
App chama POST /notifications/messages { conversationId, messageId } com o Firebase ID Token
        ↓
API (Vercel) valida o token (Admin SDK), confirma a mensagem e o remetente no RTDB,
consulta participantes, política e tokens no Firestore e calcula os destinatários
        ↓
Expo Push Service → FCM (Android) / APNs (iOS) → somente destinatários permitidos
```

**Decisão documentada:** as regras do Realtime Database não conseguem ler o Firestore. Por isso as validações que dependem dos dois bancos ficam na API:

- a API copia a lista oficial de membros do grupo (Firestore) para `groupMembers/{groupId}` no RTDB (`POST /groups/:groupId/sync-members`, chamado após criar/editar/remover membros e também a cada envio de push). As regras do RTDB usam esse nó para permitir leitura/escrita de mensagens — um membro removido perde o acesso assim que o espelho é regravado;
- a API confere se a mensagem existe no RTDB, se `senderId` é o usuário autenticado e se ele ainda participa da conversa no Firestore;
- os dados cadastrais de outro usuário (e-mail, celular, nascimento) só são entregues pela API (`GET /users/:uid/profile`) quando existe conversa individual ou grupo em comum. No Firestore, `users/{uid}` só é legível pelo próprio dono.

## Estrutura do projeto

```
.
├── firebaseConfig.json        # configuração do SDK cliente (sem segredos)
├── firestore.rules            # regras do Firestore (versionadas)
├── database.rules.json        # regras do Realtime Database (versionadas)
├── firebase.json              # deploy das regras com a Firebase CLI
├── app.config.ts / eas.json   # configuração do Expo / EAS Build
├── .env.example               # variáveis do app (sem segredos)
├── src/
│   ├── App.tsx
│   ├── components/   Avatar, ChatInput, ChatMessage, ConversationItem, GroupMemberItem,
│   │                 Loading, ErrorMessage, EmptyState, PolicySelector, PhotoPicker, ...
│   ├── contexts/     AuthContext, UserDirectoryContext, NotificationContext
│   ├── hooks/        useAuth, useChat, useConversations, useGroups, useNotifications,
│   │                 useConnectionStatus, useSharedProfile, useImagePicker, useUserDirectory
│   ├── navigation/   RootNavigator, AuthStack, AppStack
│   ├── screens/      Login, Register, Conversations, Users, GroupForm, Chat,
│   │                 GroupMembers, Profile, MyProfile
│   ├── services/     firebase, authService, userService, groupService, chatService,
│   │                 notificationService, storageService, apiClient
│   ├── types/        user, chat, group, notification, navigation
│   └── utils/        conversationId, groupValidation, formValidation, errors
└── server/                    # API de notificações (Vercel)
    ├── .env.example
    ├── src/
    │   ├── app.ts             # app Express (entrypoint detectado pela Vercel)
    │   ├── local.ts           # execução local
    │   ├── middleware/authenticate.ts
    │   ├── routes/            notifications.ts, groups.ts, users.ts
    │   └── services/          firebaseAdmin.ts, notificationSender.ts, recipientResolver.ts,
    │                          chatRepository.ts, dispatchLock.ts
    └── test/recipientResolver.test.ts
```

Hooks obrigatórios com finalidade real: `useState` (formulários, estados de tela), `useEffect` (listeners do Firebase com cleanup, registro de push), `useMemo` (lista combinada/ordenada de conversas, vagas disponíveis, mensagens invertidas, mapa de usuários) e `useCallback` (handlers de envio, navegação e renderização de listas).

## Configuração do Firebase

1. Crie um projeto no [console do Firebase](https://console.firebase.google.com/).
2. **Authentication** → *Sign-in method* → habilite somente **E-mail/senha**.
3. **Firestore Database** → crie o banco (modo produção).
4. **Realtime Database** → crie o banco (modo bloqueado).
6. *Configurações do projeto* → *Seus apps* → adicione um app **Web** e copie o objeto de configuração para **`firebaseConfig.json`** (raiz do repositório):

   ```json
   {
     "apiKey": "...",
     "authDomain": "...",
     "databaseURL": "https://<projeto>-default-rtdb.firebaseio.com",
     "projectId": "...",
     "storageBucket": "...",
     "messagingSenderId": "...",
     "appId": "..."
   }
   ```

   Este arquivo contém **apenas** a configuração do SDK cliente. Ele identifica o projeto, mas não concede privilégios: a segurança vem do Authentication e das regras.

7. Adicione também um app **Android** com o pacote `br.com.fiap.chat` e salve o `google-services.json` na raiz (necessário para o FCM). Para iOS, adicione um app com bundle `br.com.fiap.chat` e salve o `GoogleService-Info.plist` na raiz.
8. Publique as regras:

   ```bash
   npm i -g firebase-tools
   ```

   ```bash
   firebase login
   ```

   ```bash
   firebase use --add
   ```

   ```bash
   npm run deploy:rules
   ```

## Armazenamento das fotos

Serviço escolhido: **Vercel Blob em modo privado** (gratuito no plano Hobby e sem cartão). O Firebase Storage exigiria o plano Blaze.

- A foto é escolhida na **galeria ou na câmera** (`expo-image-picker`), com pedido e tratamento das permissões (inclusive atalho para as configurações do aparelho quando negadas).
- O app reduz a imagem para 512 px em JPEG (`expo-image-manipulator`) e a envia à API autenticada com o Firebase ID Token:
  - `POST /photos/profile`: somente para a foto do próprio usuário;
  - `POST /photos/groups/:groupId`: somente o **proprietário** do grupo (conferido no Firestore).
- A API valida tipo e assinatura binária (JPEG/PNG, até 2 MB) e grava o arquivo no Blob como **privado**, com nome aleatório. Base64 é usado apenas no transporte da requisição e nunca é gravado em banco.
- O Firestore guarda **somente a URL final** (`https://<api>/photos/...`).
- A leitura também passa pela API (`GET /photos/...`): fotos de perfil exigem usuário autenticado e fotos de grupo exigem que quem pede seja integrante. O componente `Avatar` envia o ID Token no cabeçalho e mostra uma imagem padrão quando a foto não existe ou falha ao carregar.

Configuração: no projeto da API na Vercel, abra **Storage → Create → Blob** e conecte o store ao projeto. A Vercel cria a variável secreta `BLOB_READ_WRITE_TOKEN` automaticamente.

## API de notificações

- **Tecnologia:** Node.js + Express 5 + TypeScript + Firebase Admin SDK.
- **Hospedagem:** Vercel (HTTPS automático, Express detectado sem configuração a partir de `server/src/app.ts`).
- **URL pública:** `https://SEU-PROJETO-API.vercel.app` ← **substituir pela URL publicada**.

### Endpoints

| Método e rota | Autenticação | Descrição |
| --- | --- | --- |
| `GET /health` | — | Verificação de integridade. `200 {"status":"ok"}` quando as credenciais estão configuradas; `503 {"status":"misconfigured"}` caso contrário. |
| `GET /` | — | Lista os endpoints. |
| `POST /notifications/messages` | `Bearer <Firebase ID Token>` | Body `{ "conversationId", "messageId" }`. Valida mensagem e remetente no RTDB, consulta Firestore, calcula destinatários e envia o push. Idempotente: reenvios retornam `{"status":"duplicate"}`. |
| `POST /groups/:groupId/sync-members` | `Bearer <Firebase ID Token>` | Replica os membros do grupo do Firestore para o RTDB (base das regras de mensagens). |
| `GET /users/:uid/profile` | `Bearer <Firebase ID Token>` | Retorna os dados cadastrais apenas se houver conversa ou grupo em comum. |
| `POST /photos/profile` | `Bearer <Firebase ID Token>` | Body `{ "contentType": "image/jpeg", "data": "<base64>" }`. Grava a foto do usuário no Blob privado e retorna `{ "url" }`. |
| `POST /photos/groups/:groupId` | `Bearer <Firebase ID Token>` | Igual ao anterior, somente para o proprietário do grupo. |
| `GET /photos/users/:uid/:file` · `GET /photos/groups/:groupId/:file` | `Bearer <Firebase ID Token>` | Serve a imagem privada (foto de grupo apenas para integrantes). |

Erros retornam `{ "error": { "code", "message" } }` sem detalhes internos.

**Proteção contra chamadas duplicadas:** antes de enviar, a API reserva `notificationDispatches/{conversationId}__{messageId}` dentro de uma **transação do Firestore**. Duas requisições simultâneas para a mesma mensagem não obtêm a reserva ao mesmo tempo; a segunda recebe `duplicate`. Se o envio falhar, o registro fica `failed` e uma nova tentativa é permitida.

**Tokens inválidos:** tokens com formato inválido ou que retornam `DeviceNotRegistered` são marcados `enabled: false` no Firestore e deixam de ser usados.

### Verificar a disponibilidade

```bash
curl https://SEU-PROJETO-API.vercel.app/health
```

### Variáveis de ambiente (somente nomes; valores apenas na Vercel)

| Variável | Descrição |
| --- | --- |
| `FIREBASE_PROJECT_ID` | ID do projeto Firebase |
| `FIREBASE_CLIENT_EMAIL` | E-mail da conta de serviço |
| `FIREBASE_PRIVATE_KEY` | Chave privada da conta de serviço (com `\n`) |
| `FIREBASE_DATABASE_URL` | URL do Realtime Database |
| `BLOB_READ_WRITE_TOKEN` | Token do Vercel Blob (criado automaticamente ao conectar o store) |
| `EXPO_ACCESS_TOKEN` | Opcional — token do Expo, se a segurança avançada de push estiver ativa |

### Conta de serviço com permissões mínimas

Em vez da conta `firebase-adminsdk` (que tem privilégios amplos), crie no **Google Cloud Console → IAM → Contas de serviço** uma conta dedicada à API com apenas:

- `Cloud Datastore User` (ler/gravar Firestore);
- `Firebase Realtime Database Admin` (ler mensagens e gravar `groupMembers`);
- `Firebase Authentication Viewer` (validar tokens com verificação de revogação).

Gere uma chave JSON para essa conta, copie os campos para as variáveis secretas da Vercel e **apague o arquivo local**. Nenhuma chave vai para o GitHub ou para o app.

### Executar localmente

```bash
cd server && npm install
```

```bash
cd server && cp .env.example .env && npm run dev
```

(preencha o `.env` local com uma chave de teste; ele é ignorado pelo Git). Testes da lógica de destinatários:

```bash
cd server && npm test
```

### Publicar na Vercel

1. Em [vercel.com/new](https://vercel.com/new), importe o repositório do GitHub.
2. Em **Root Directory**, selecione `server`. O framework é detectado como Express.
3. Em **Environment Variables**, cadastre as variáveis acima (Production).
4. Clique em **Deploy** e verifique `https://<url>/health`.
5. Atualize a URL em `eas.json` (`EXPO_PUBLIC_API_URL`), em `src/services/apiClient.ts` (`DEFAULT_API_URL`) e neste README.

A API fica publicada permanentemente; o professor não precisa iniciar nada.

## Instalação e execução do app

Pré-requisitos: Node.js 20+, conta Expo (EAS) e um aparelho físico.

```bash
npm install
```

```bash
npx eas-cli@latest login
```

```bash
npx eas-cli@latest init
```

Copie o *project ID* exibido pelo `eas init` para `EAS_PROJECT_ID` em `eas.json` e no `.env` local (`cp .env.example .env`).

Notificações remotas **não funcionam no Expo Go** (Android, SDK 53+). Gere um *development build*:

```bash
npm run build:android:dev
```

Instale o APK gerado no aparelho e rode o servidor de desenvolvimento:

```bash
npm start
```

Verificação de tipos:

```bash
npm run typecheck
```

## Notificações no Android e no iOS

**Android (FCM):**

1. `google-services.json` na raiz (passo 7 da configuração do Firebase).
2. No Firebase: *Configurações do projeto → Contas de serviço → Gerar nova chave privada* — use-a **somente** para cadastrar a credencial FCM v1 no EAS:

   ```bash
   npx eas-cli@latest credentials
   ```

   Escolha *Android → Google Service Account → Push Notifications (FCM V1)* e envie o JSON; depois apague o arquivo local.
3. Android 13+ solicita a permissão `POST_NOTIFICATIONS` no primeiro login; o canal `messages` é criado com prioridade alta.

**iOS (APNs):**

1. Requer conta paga no Apple Developer Program e aparelho físico.
2. `npx eas-cli@latest build --profile development --platform ios` — o EAS gera/gerencia a chave de push (APNs) automaticamente.
3. Opcional: `GoogleService-Info.plist` na raiz.

**Comportamento no app:** o token é registrado em `users/{uid}/devices/{deviceId}` após o login, atualizado quando o sistema troca o token e removido no logout. Em *Meu perfil* é possível ativar/desativar o push neste aparelho. Tocar na notificação (app aberto, em segundo plano ou fechado) abre a conversa indicada por `conversationId`/`conversationType`. O texto do push mostra só o remetente e o tipo de evento, nunca o conteúdo da mensagem.

## Política de notificações

Cada grupo tem `notificationPolicy`, configurável pelo proprietário na tela de edição. A API calcula os destinatários em `server/src/services/recipientResolver.ts` (testado em `server/test`):

| Política | Quem recebe push |
| --- | --- |
| `all_group_messages` | Todos os membros do grupo, exceto o remetente. |
| `mentioned_members` | Somente quem foi selecionado como destinatário (`target.memberId`) ou mencionado (`mentionedUserIds`), desde que seja membro. |
| `direct_messages_only` | Ninguém nas mensagens do grupo; apenas conversas individuais geram push. |
| `disabled` | Ninguém. |

Regras gerais: o remetente nunca é notificado; só participantes atuais recebem; conversas individuais sempre notificam o outro participante; somente dispositivos com `enabled: true` são usados. A lista de destinatários **nunca** vem do app.

No chat em grupo, o botão **@** permite escolher integrantes: um integrante vira destinatário explícito (`target: { type: 'member' }`), vários viram menções. A mensagem continua no histórico do grupo, visível a todos.

## Limite de integrantes e concorrência

- `memberLimit` é definido na criação (inteiro entre 2 e 50, contando o proprietário) e pode ser alterado pelo proprietário.
- A interface mostra integrantes atuais, total de vagas e vagas disponíveis, e bloqueia a seleção ao atingir o limite.
- **Proteção no servidor (regras do Firestore):** toda criação/atualização de `groups/{groupId}` exige `memberIds.size() <= memberLimit`, `memberIds.size() >= 2`, sem duplicados, proprietário inalterado e presente na lista. A regra é avaliada sobre o **estado final do documento** (`request.resource`), portanto reduzir o limite abaixo da quantidade atual ou gravar um membro a mais é rejeitado, independentemente do que a interface faça.
- **Concorrência:** as alterações de membros usam `runTransaction`. O Firestore usa controle otimista: se duas alterações leem o mesmo grupo e uma é confirmada primeiro, a outra é abortada e reexecutada com os dados atualizados — onde a validação do limite falha (`group-full`). Como as escritas no mesmo documento são serializadas e cada uma passa pela regra, mesmo requisições simultâneas feitas fora do app não conseguem ultrapassar o limite.

## Regras de segurança

Arquivos versionados: [`firestore.rules`](firestore.rules) e [`database.rules.json`](database.rules.json). O acesso às fotos é controlado pela API (ver [Armazenamento das fotos](#armazenamento-das-fotos)).

**Firestore**

- `users/{uid}`: leitura/escrita apenas pelo dono; valida campos, e-mail igual ao do token e `createdAt` imutável.
- `users/{uid}/devices/*`: apenas o dono (tokens nunca são públicos).
- `userDirectory/{uid}`: leitura por usuários autenticados (somente nome e foto); escrita apenas pelo dono.
- `directConversations/{id}`: leitura apenas pelos participantes; criação somente com id `direct_<uidMenor>_<uidMaior>`, dois participantes distintos e existentes, incluindo o autor — impede duplicidade e conversa consigo mesmo; sem alterações.
- `groups/{groupId}`: leitura apenas por membros; criação pelo próprio proprietário; atualização apenas pelo proprietário; validação de limite, quantidade mínima, duplicados e política.
- `notificationDispatches`: inacessível ao app (somente a API).

**Realtime Database**

- Tudo fechado por padrão.
- `messages/{conversationId}`: conversa individual — leitura/escrita apenas se o `uid` faz parte do id `direct_<a>_<b>`; grupo — apenas se `groupMembers/{groupId}/{uid} === true` (espelho escrito somente pela API). Usuários removidos perdem o acesso.
- Cada mensagem: somente criação (sem edição/remoção), `senderId === auth.uid`, `createdAt === now`, texto de 1 a 2000 caracteres, tipo coerente com o id, `target.memberId` e `mentionedUserIds` precisam ser membros do grupo, nenhum campo extra.
- `groupMembers`: somente leitura pelo próprio membro; escrita apenas pelo Admin SDK.

## Telas

> Adicione os prints em `docs/screenshots/` com os nomes abaixo.

| Login | Cadastro | Conversas |
| --- | --- | --- |
| ![Login](docs/screenshots/login.png) | ![Cadastro](docs/screenshots/register.png) | ![Conversas](docs/screenshots/conversations.png) |

| Usuários | Grupo (criação/edição) | Chat |
| --- | --- | --- |
| ![Usuários](docs/screenshots/users.png) | ![Grupo](docs/screenshots/group-form.png) | ![Chat](docs/screenshots/chat.png) |

| Integrantes | Perfil | Meu perfil |
| --- | --- | --- |
| ![Integrantes](docs/screenshots/group-members.png) | ![Perfil](docs/screenshots/profile.png) | ![Meu perfil](docs/screenshots/my-profile.png) |

## Evidência de notificação

> Adicione o print de uma notificação recebida (app em segundo plano ou fechado).

![Notificação recebida](docs/screenshots/push-notification.png)

---

### Estados e erros tratados

Carregamento (sessão, perfil, conversas, mensagens, grupo, usuários), erro com opção de tentar novamente, usuário não autenticado, sem conversas, sem usuários, grupo sem acesso/removido, conversa sem mensagens, falha no envio (texto preservado no campo), push não disparado, permissão de notificação negada, dispositivo sem token, falha de conexão (indicador online/offline via `.info/connected`), sessão expirada (API 401 → logout com aviso) e permissões de câmera/galeria negadas. As mensagens ao usuário são traduzidas em `src/utils/errors.ts`, sem expor detalhes internos.
