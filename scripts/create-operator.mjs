import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

function loadEnvFromFile(filename) {
  const filePath = resolve(process.cwd(), filename);
  if (!existsSync(filePath)) return;

  const content = readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) continue;

    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFromFile(".env.local");
loadEnvFromFile(".env");

function parseArgs(argv) {
  const parsed = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--name" || arg === "-n") {
      parsed.name = argv[++i];
    } else if (arg === "--email" || arg === "-e") {
      parsed.email = argv[++i];
    } else if (arg === "--password" || arg === "-p") {
      parsed.password = argv[++i];
    } else if (arg === "--url" || arg === "-u") {
      parsed.url = argv[++i];
    } else if (arg === "--help" || arg === "-h") {
      parsed.help = true;
    }
  }
  return parsed;
}

function printHelp() {
  console.log(`
Uso:
  npm run create-operator
  npm run create-operator -- --name "Nome" --email "email@exemplo.com" --password "SenhaForte123!"

Opções:
  -n, --name      Nome do operador
  -e, --email     E-mail do operador
  -p, --password  Senha inicial (mínimo de 8 caracteres no Neon Auth)
  -u, --url       URL do Neon Auth (padrão: VITE_NEON_AUTH_URL do .env.local / .env)
  -h, --help      Exibe esta ajuda
`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  const rawAuthUrl = (args.url || process.env.VITE_NEON_AUTH_URL || "").trim();
  if (!rawAuthUrl) {
    console.error(
      "❌ Erro: VITE_NEON_AUTH_URL não encontrada no .env.local ou .env (ou via --url).",
    );
    process.exit(1);
  }

  const baseAuthUrl = rawAuthUrl.replace(/\/+$/, "");
  const rl = createInterface({ input: stdin, output: stdout });

  try {
    const name = (
      args.name ?? (await rl.question("Nome do operador: "))
    ).trim();
    const email = (
      args.email ?? (await rl.question("E-mail do operador: "))
    ).trim();
    const password =
      args.password ??
      (await rl.question("Senha inicial (mín. 8 caracteres): "));

    if (!name || !email || !password) {
      console.error("❌ Erro: Nome, e-mail e senha são obrigatórios.");
      process.exit(1);
    }

    if (password.length < 8) {
      console.error(
        "❌ Erro: A senha deve ter pelo menos 8 caracteres (requisito do Neon Auth).",
      );
      process.exit(1);
    }

    const endpoint = `${baseAuthUrl}/sign-up/email`;
    const origin = new URL(baseAuthUrl).origin;

    console.log(`\n⏳ Criando usuário em ${endpoint}...`);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Origin: origin,
      },
      body: JSON.stringify({
        name,
        email,
        password,
      }),
    });

    const contentType = response.headers.get("content-type") || "";
    const body = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      console.error(
        `\n❌ Falha ao criar usuário (HTTP ${response.status}):`,
        typeof body === "object" ? JSON.stringify(body, null, 2) : body,
      );
      process.exit(1);
    }

    const createdUser = body?.user ?? body;

    console.log("\n✅ Usuário criado com sucesso no Neon Auth!");
    console.log("──────────────────────────────────────────────────");
    console.log(`ID (auth_user_id): ${createdUser?.id ?? "N/A"}`);
    console.log(`Nome:              ${createdUser?.name ?? name}`);
    console.log(`E-mail:            ${createdUser?.email ?? email}`);
    console.log("──────────────────────────────────────────────────");
    console.log(
      "\n💡 Lembrete: Para que o operador acesse o DailyCheckout, certifique-se de que este ID esteja vinculado na tabela de usuários da sua API (ex.: role 'daily_operator').",
    );
  } finally {
    rl.close();
  }
}

main().catch((error) => {
  console.error("\n❌ Erro inesperado ao executar o script:", error);
  process.exit(1);
});
