# LocaPlace

Aplicativo mobile cross-platform (Expo / React Native) para gestão inteligente de reservas e fluxo de caixa de locações de espaços.

## Requisitos

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)

## Configuração

1. Instale as dependências:

```bash
npm install
```

2. Configure as credenciais do Firebase no arquivo `app.json` ou através de variáveis em tempo de execução (campo `extra.firebase`).

3. Inicie o app:

```bash
npm run start
```

Utilize o Expo Go para visualizar no iOS/Android ou inicie o simulador desejado.

## Principais Funcionalidades

- Autenticação via Firebase Authentication (email/senha) com persistência segura.
- CRUD completo de espaços, clientes e reservas com sincronização em tempo real (Firestore).
- Importação automática de contatos que terminam com “cliente”.
- Detecção e confirmação de reservas/pagamentos via insights do WhatsApp.
- Tela financeira com visão consolidada de entradas recebidas e futuras.
- Timeline detalhada com eventos de mensagens, pagamentos e alterações de status por reserva.

## Estrutura do Projeto

- `App.tsx`: inicialização do app e navegação principal.
- `src/context`: contexto de autenticação.
- `src/screens`: telas principais (Espaços, Clientes, Reservas, Detalhes da Reserva, Financeiro, WhatsApp Insights, Login).
- `src/services`: integrações com Firebase/Firestore, contatos e parsing de mensagens do WhatsApp.
- `src/components`: componentes reutilizáveis (cards, timeline, listas de pagamentos).
- `src/theme`: definições de cores básicas.

## Observações

- As integrações com WhatsApp dependem de fontes de dados externas para popular a coleção `whatsappInsights`.
- Ajuste permissões, bundles e ícones no `app.json` conforme a publicação desejada.
