/**
 * Helpers para ler/escrever .env sem acumular comentários inline.
 */

import fs from "fs";
import path from "path";
import type { EnvSchema } from "./env.config";

const SAFE_DEFAULTS = ["PORT", "NODE_ENV", "TIMEZONE"];

/**
 * Extrai KEY=VALUE de uma linha, ignorando comentários inline.
 * Ex: `PORT=3000 # desc` → { key: 'PORT', value: '3000' }
 */
export function parseEnvAssignment(
  line: string,
): { key: string; value: string } | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    return null;
  }

  const eq = trimmed.indexOf("=");
  if (eq <= 0) {
    return null;
  }

  const key = trimmed.slice(0, eq).trim();
  if (!key) {
    return null;
  }

  let value = trimmed.slice(eq + 1).trim();

  // Remove comentário inline (não trata valores entre aspas com # no meio)
  const isQuoted =
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"));

  if (!isQuoted) {
    const commentAt = value.search(/\s+#/);
    if (commentAt >= 0) {
      value = value.slice(0, commentAt).trim();
    }
  } else {
    value = value.slice(1, -1);
  }

  return { key, value };
}

/**
 * Lê .env existente e retorna apenas KEY → valor limpo (sem comentários).
 */
export function readEnvValues(envPath: string): Record<string, string> {
  const result: Record<string, string> = {};

  if (!fs.existsSync(envPath)) {
    return result;
  }

  try {
    const content = fs.readFileSync(envPath, "utf8");
    content.split("\n").forEach((line) => {
      const parsed = parseEnvAssignment(line);
      if (parsed) {
        result[parsed.key] = parsed.value;
      }
    });
  } catch {
    // ignora erros de leitura
  }

  return result;
}

/**
 * Monta comentário de documentação a partir do schema (linha própria, acima da key).
 */
export function buildEnvFieldComment(
  config: EnvSchema[string],
): string | null {
  const parts: string[] = [];

  if (config.description) parts.push(config.description);
  if (config.type) parts.push(`Tipo: ${config.type}`);
  if (config.values && Array.isArray(config.values)) {
    parts.push(`Valores: ${config.values.join(" | ")}`);
  }
  if (config.default !== undefined) {
    parts.push(`Default: ${config.default}`);
  }
  if (config.required === true) parts.push("OBRIGATORIO");
  if (config.secure === true) parts.push("SENSIVEL");

  return parts.length > 0 ? `# ${parts.join(" | ")}` : null;
}

function groupKeys(envSchema: EnvSchema): Record<string, string[]> {
  const groups: Record<string, string[]> = {};
  Object.entries(envSchema).forEach(([key, config]) => {
    const group = config.group || "Outros";
    if (!groups[group]) groups[group] = [];
    groups[group].push(key);
  });
  return groups;
}

function resolveEnvValue(
  key: string,
  config: EnvSchema[string],
  existing: Record<string, string>,
  options: { force?: boolean; fillSafeDefaults?: boolean },
): string {
  const { force = false, fillSafeDefaults = true } = options;

  // Preserva valor já preenchido (sem comentários — ver readEnvValues)
  if (!force && existing[key] !== undefined) {
    return existing[key];
  }

  if (config.default === undefined) {
    return "";
  }

  // No boot da Application: só defaults seguros (não grava secrets)
  if (fillSafeDefaults) {
    return SAFE_DEFAULTS.includes(key) ? String(config.default) : "";
  }

  // CLI generate:env: preenche qualquer default do schema
  return String(config.default);
}

export interface WriteEnvFilesOptions {
  /** Diretório do projeto (cwd) */
  cwd?: string;
  /** Sobrescreve valores existentes do .env */
  force?: boolean;
  /** Se false, não escreve .env (só .env.example) */
  writeEnv?: boolean;
  /** Se false, não escreve .env.example */
  writeExample?: boolean;
  /**
   * Se true, só cria .env quando ainda não existe (não reescreve).
   * .env.example pode ser regenerado limpo quando writeExample=true.
   */
  createEnvOnlyIfMissing?: boolean;
  /** Preenche defaults apenas em PORT/NODE_ENV/TIMEZONE no .env */
  fillSafeDefaults?: boolean;
  /** Fonte (para comentário de header no CLI) */
  sourceFile?: string;
}

export interface WriteEnvFilesResult {
  envWritten: boolean;
  exampleWritten: boolean;
  envCreated: boolean;
  newKeys: string[];
  emptyRequired: string[];
}

/**
 * Gera .env e/ou .env.example sem acumular comentários nos valores.
 */
export function writeEnvFiles(
  envSchema: EnvSchema,
  options: WriteEnvFilesOptions = {},
): WriteEnvFilesResult {
  const {
    cwd = process.cwd(),
    force = false,
    writeEnv = true,
    writeExample = true,
    createEnvOnlyIfMissing = false,
    fillSafeDefaults = true,
    sourceFile,
  } = options;

  const envPath = path.join(cwd, ".env");
  const examplePath = path.join(cwd, ".env.example");
  const envExists = fs.existsSync(envPath);

  const result: WriteEnvFilesResult = {
    envWritten: false,
    exampleWritten: false,
    envCreated: false,
    newKeys: [],
    emptyRequired: [],
  };

  // No boot: se .env já existe, não toca em nada (evita I/O e inflar arquivo no reload)
  if (createEnvOnlyIfMissing && envExists && !force) {
    return result;
  }

  const existing = !force && envExists ? readEnvValues(envPath) : {};
  const groups = groupKeys(envSchema);
  const now = new Date().toISOString();
  const total = Object.keys(envSchema).length;
  const requiredCount = Object.values(envSchema).filter((c) => c.required).length;
  const secureCount = Object.values(envSchema).filter((c) => c.secure).length;

  const shouldWriteEnv = writeEnv;

  if (shouldWriteEnv) {
    let envContent = "# ============================================\n";
    envContent += "# Arquivo de configuração de ambiente\n";
    envContent += "# PREENCHA OS VALORES MANUALMENTE\n";
    envContent += "# Gerado automaticamente do envSchema\n";
    if (sourceFile) envContent += `# Fonte: ${sourceFile}\n`;
    envContent += `# Data: ${now}\n`;
    envContent += "# ============================================\n\n";

    Object.entries(groups).forEach(([groupName, keys]) => {
      envContent += `# ========== ${groupName} ==========\n`;

      keys.forEach((key) => {
        const config = envSchema[key];
        const wasKnown = Object.prototype.hasOwnProperty.call(existing, key);
        const value = resolveEnvValue(key, config, existing, {
          force,
          fillSafeDefaults,
        });

        if (!wasKnown && envExists) {
          result.newKeys.push(key);
        }

        const doc = buildEnvFieldComment(config);
        if (doc) envContent += `${doc}\n`;
        envContent += `${key}=${value}\n`;
      });

      envContent += "\n";
    });

    envContent += `# Total: ${total} variaveis`;
    if (requiredCount > 0) envContent += ` | ${requiredCount} obrigatorias`;
    if (secureCount > 0) envContent += ` | ${secureCount} sensiveis`;
    envContent += "\n";

    fs.writeFileSync(envPath, envContent);
    result.envWritten = true;
    result.envCreated = !envExists;
  }

  if (writeExample) {
    let exampleContent = "# ============================================\n";
    exampleContent += "# Arquivo de referência - NÃO contém valores reais\n";
    exampleContent += "# Use como guia para preencher o .env\n";
    exampleContent += "# Gerado automaticamente do envSchema\n";
    if (sourceFile) exampleContent += `# Fonte: ${sourceFile}\n`;
    exampleContent += `# Data: ${now}\n`;
    exampleContent += "# ============================================\n\n";

    Object.entries(groups).forEach(([groupName, keys]) => {
      exampleContent += `# ========== ${groupName} ==========\n`;

      keys.forEach((key) => {
        const config = envSchema[key];
        const doc = buildEnvFieldComment(config);
        if (doc) exampleContent += `${doc}\n`;
        exampleContent += `${key}=\n`;
      });

      exampleContent += "\n";
    });

    exampleContent += `# Total: ${total} variaveis`;
    if (requiredCount > 0) exampleContent += ` | ${requiredCount} obrigatorias`;
    if (secureCount > 0) exampleContent += ` | ${secureCount} sensiveis`;
    exampleContent += "\n";

    fs.writeFileSync(examplePath, exampleContent);
    result.exampleWritten = true;
  }

  result.emptyRequired = Object.entries(envSchema)
    .filter(([key, config]) => {
      if (!config.required) return false;
      const values = shouldWriteEnv ? readEnvValues(envPath) : existing;
      const value = values[key];
      return value === undefined || value === "";
    })
    .map(([key]) => key);

  return result;
}
