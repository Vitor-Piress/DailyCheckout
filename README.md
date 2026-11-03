# DailyCheckout

Aplicação web de **fechamento diário de caixa e gestão financeira para barbearia**, desenvolvida para agilizar o lançamento de atendimentos no dia a dia e consolidar receitas, comissões, despesas e relatórios financeiros com controle de acesso por perfil.

---

## Principais Funcionalidades

- **Operação Diária (`/`)**: Registro rápido de atendimentos em poucos toques — seleção visual de serviço com ícones dedicados, escolha do meio de pagamento e exibição imediata da comissão do operador no momento do lançamento.
- **Gestão e Fechamento Diário (`/gestao`)**: Acompanhamento dos atendimentos por data, métricas do dia, detalhamento por forma de pagamento e profissional, além de fechamento de acerto diário.
- **Controle de Despesas (`/despesas` — Admin)**: Lançamento e consulta mensal de despesas fixas e operacionais com filtro por competência (mês/ano), categoria, vencimento, meio de pagamento e observações.
- **Relatórios Periódicos (`/relatorios/periodicos` — Admin)**: Consolidação financeira por período (semanal/mensal), apresentando receita bruta, composição de despesas (contas + repasses/comissões), lucro líquido, volume de atendimentos e versão formatada para impressão.
- **Autenticação e Recuperação de Senha**: Fluxo completo de login, esqueci minha senha e redefinição de senha integrado ao **Neon Auth**.
- **Acessibilidade e Experiência de Uso**: Interface responsiva pensada para uso ágil no celular ou desktop, com controle integrado de preferência de animações (ativar/desativar movimento).

---

## Stack Tecnológica

- **Frontend**: [React 19](https://react.dev/) (com `babel-plugin-react-compiler` habilitado) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite 8](https://vite.dev/)
- **Estilização**: [Tailwind CSS v4](https://tailwindcss.com/) + [Lucide Icons](https://lucide.dev/)
- **Roteamento**: [React Router v7](https://reactrouter.com/)
- **Formulários e Validação**: [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)
- **Autenticação**: [Neon Auth (`@neon/auth`)](https://neon.tech/docs/guides/neon-auth)

---

## Arquitetura de Autenticação e Perfis de Acesso (RBAC)

A aplicação trabalha com dois perfis de usuário:

| Perfil | Permissões na Interface |
| :--- | :--- |
| `daily_operator` | Registro de atendimentos diários (`/`) e consulta/acompanhamento da própria operação em `/gestao`. |
| `admin` | Acesso completo à operação diária, gestão e fechamento do dia (`/gestao`), gestão de despesas (`/despesas`) e relatórios periódicos (`/relatorios/periodicos`). |

### Como o perfil é resolvido

1. Após autenticar ou restaurar a sessão no **Neon Auth**, o cliente HTTP envia `Authorization: Bearer <token>` para a API backend.
2. O frontend consulta `GET /me` (ou o caminho configurado em `VITE_PROFILE_PATH`).
3. A API deve responder com o perfil da aplicação contendo um `role` válido (`"admin"` ou `"daily_operator"`), além de `id`, `authUserId` e `name`. A role **vem exclusivamente do cadastro da aplicação** (ex.: tabela `app_users`) e nunca é inferida por e-mail, nome ou metadados locais.
4. No frontend, `AuthGuard` e `RoleGuard` utilizam essa informação apenas para proteger a navegação e adaptar a interface. **A autorização real permanece sob responsabilidade da API**, que deve responder com `401` para sessão inválida/expirada e `403` para usuário sem permissão.

---

## Pré-requisitos

- **Node.js** `20+` e **npm**
- Instância da **API backend** do DailyCheckout em execução
- Projeto configurado no **Neon Auth**

---

## Configuração e Execução Local

1. **Clone o repositório e instale as dependências:**

   ```bash
   git clone <URL_DO_REPOSITORIO>
   cd dailycheckout
   npm install
   ```

2. **Configure as variáveis de ambiente:**

   Copie o arquivo `.env.example` para `.env` (ou `.env.local`) e preencha os valores correspondentes ao seu ambiente:

   ```bash
   cp .env.example .env.local
   ```

   | Variável | Descrição | Exemplo |
   | :--- | :--- | :--- |
   | `VITE_API_URL` | URL base da API backend | `http://localhost:3333` |
   | `VITE_PROFILE_PATH` | Endpoint da API que retorna o perfil do usuário autenticado | `/me` |
   | `VITE_NEON_AUTH_URL` | URL base do serviço de autenticação do Neon Auth | `https://seuprojeto.neonauth.com/neondb/auth` |

3. **Inicie o servidor de desenvolvimento:**

   ```bash
   npm run dev
   ```

---

## Scripts Disponíveis

| Comando | Descrição |
| :--- | :--- |
| `npm run dev` | Inicia o servidor de desenvolvimento do Vite com HMR. |
| `npm run build` | Executa a checagem de tipos (`tsc -b`) e gera o bundle de produção em `dist/`. |
| `npm run preview` | Serve localmente o build gerado em `dist/` para validação. |
| `npm run lint` | Executa a análise estática de código com ESLint. |
| `npm run create-operator` | Script utilitário CLI para criar um novo usuário no Neon Auth. |

### Criando um operador via CLI

O projeto inclui um utilitário em `scripts/create-operator.mjs` para facilitar o cadastro inicial de usuários no Neon Auth:

```bash
# Modo interativo
npm run create-operator

# Ou passando argumentos diretamente
npm run create-operator -- --name "Nome do Operador" --email "operador@exemplo.com" --password "SenhaForte123!"
```

> **Importante:** Após criar o usuário no Neon Auth, vincule o `auth_user_id` retornado na tabela de usuários da sua API com a role correspondente (`daily_operator` ou `admin`).

---

## Estrutura de Pastas

```text
dailycheckout/
├── public/                 # Assets públicos e favicons
├── scripts/
│   └── create-operator.mjs # Utilitário CLI para criação de contas no Neon Auth
├── src/
│   ├── api/                # Cliente HTTP autenticado, contratos de tipos e chamadas da API
│   ├── assets/             # Ícones SVG customizados dos serviços da barbearia
│   ├── auth/               # Integração Neon Auth, Contexto, Login, Recuperação e Guards (Auth/Role)
│   ├── components/         # Layout (AppShell, Navigation), UI base e componentes de relatórios
│   ├── features/
│   │   ├── operation/      # Fluxo de registro diário de atendimentos e meios de pagamento
│   │   └── management/     # Gestão diária, despesas mensais e relatórios periódicos/impressão
│   ├── lib/                # Formatadores (moeda, datas, labels) e tratamento de erros
│   ├── styles/             # Estilos globais e configuração do Tailwind CSS
│   └── ui/motion/          # Controle de preferência de animações e acessibilidade
└── vite.config.ts          # Configuração do Vite + Tailwind + React Compiler
```
