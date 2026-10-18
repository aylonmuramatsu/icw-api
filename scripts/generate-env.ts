/**
 * @insightcreativewebs/api
 *
 * CLI: gera .env / .env.example a partir do envSchema do projeto
 */

import fs from "fs";
import path from "path";
import { EnvSchema } from "../util/env.config";
import { writeEnvFiles } from "../util/env-file";

/**
 * Importa arquivo TypeScript do projeto via tsx (subprocess),
 * evitando handles abertos no processo do CLI.
 */
function importTypeScriptFile(filePath: string): any {
  const absolutePath = path.resolve(process.cwd(), filePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Arquivo não encontrado: ${absolutePath}`);
  }

  const { execSync } = require("child_process");
  const tempOutput = path.join(process.cwd(), ".temp-env-schema.json");
  const tempScript = path.join(process.cwd(), ".temp-extract-env.ts");

  const fileContent = fs.readFileSync(absolutePath, "utf8");
  const scriptContent = `
import { defineEnv } from '@insightcreativewebs/api';
${fileContent}
import * as fs from 'fs';
import * as path from 'path';

const outputPath = path.join(process.cwd(), '.temp-env-schema.json');
try {
  fs.writeFileSync(outputPath, JSON.stringify({ envSchema }, null, 2));
  process.exit(0);
} catch (error) {
  console.error('Erro ao extrair envSchema:', error);
  process.exit(1);
}
`;

  fs.writeFileSync(tempScript, scriptContent);

  try {
    execSync(`npx tsx "${tempScript}"`, {
      stdio: "pipe",
      cwd: process.cwd(),
      timeout: 15000,
      maxBuffer: 10 * 1024 * 1024,
    });

    if (fs.existsSync(tempOutput)) {
      const result = JSON.parse(fs.readFileSync(tempOutput, "utf8"));
      try {
        fs.unlinkSync(tempScript);
      } catch {}
      try {
        fs.unlinkSync(tempOutput);
      } catch {}
      return result;
    }

    throw new Error("Arquivo de saída não foi criado");
  } catch (execError: any) {
    try {
      if (fs.existsSync(tempScript)) fs.unlinkSync(tempScript);
    } catch {}
    try {
      if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput);
    } catch {}

    throw new Error(
      `Erro ao executar TypeScript para extrair envSchema:\n` +
        `  ${execError.message}\n\n` +
        `Certifique-se de que:\n` +
        `  1. O arquivo exporta: export const envSchema = defineEnv({ ... })\n` +
        `  2. tsx está instalado: npm install -D tsx\n` +
        `  3. O arquivo não tem erros de sintaxe`,
    );
  }
}

function generateEnvFiles() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const exampleOnly = args.includes("--example-only");
  const pathArg = args.find((arg) => arg.startsWith("--path="));
  const customPath = pathArg ? pathArg.split("=")[1] : null;

  try {
    require("tsconfig-paths/register");
  } catch {}

  const possiblePaths: string[] = [];
  if (customPath) possiblePaths.push(customPath);
  possiblePaths.push(
    "src/configs/env.schema.ts",
    "src/server.ts",
    "src/config/env.schema.ts",
    "config/env.schema.ts",
    "env.schema.ts",
  );

  let envSchema: EnvSchema | null = null;
  let sourceFile = "";

  for (const schemaPath of possiblePaths) {
    const absolutePath = path.resolve(process.cwd(), schemaPath);
    if (!fs.existsSync(absolutePath)) continue;

    try {
      console.log(`🔍 Tentando ler: ${schemaPath}...`);
      const schemaModule = importTypeScriptFile(schemaPath);
      if (schemaModule?.envSchema) {
        envSchema = schemaModule.envSchema;
        sourceFile = schemaPath;
        console.log(`✅ Schema encontrado em: ${sourceFile}`);
        break;
      }
    } catch (error: any) {
      console.warn(`⚠️  Erro ao ler ${schemaPath}:`, error.message);
    }
  }

  if (!envSchema) {
    console.error("❌ envSchema não encontrado!");
    console.log("\n📝 Exporte envSchema do src/server.ts ou use --path=...");
    process.exit(1);
  }

  console.log(`📦 ${Object.keys(envSchema).length} variáveis definidas\n`);

  const result = writeEnvFiles(envSchema, {
    force,
    writeEnv: !exampleOnly,
    writeExample: true,
    createEnvOnlyIfMissing: false,
    // CLI: aplica defaults do schema nos campos novos
    fillSafeDefaults: false,
    sourceFile,
  });

  if (result.exampleWritten) {
    console.log("✅ .env.example gerado");
  }
  if (result.envWritten) {
    console.log("✅ .env gerado");
    if (result.newKeys.length > 0) {
      console.log(`   ✨ ${result.newKeys.length} novas variáveis`);
    }
  }
  if (result.emptyRequired.length > 0) {
    console.log(
      `   ⚠️  ${result.emptyRequired.length} obrigatórias vazias: ${result.emptyRequired.join(", ")}`,
    );
  }

  console.log("\n✅ Concluído!");
  process.exit(0);
}

try {
  generateEnvFiles();
} catch (error: any) {
  console.error("\n❌ Erro:", error.message);
  process.exit(1);
}
