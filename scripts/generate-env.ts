/**
 * @insightcreativewebs/api
 * 
 * Framework Node.js para APIs REST com TypeScript
 * 
 * @copyright 2025 Insight Creative Webs
 * @license MIT
 * @author Aylon Muramatsu <aylon.muramatsu@gmail.com>
 * @see https://github.com/aylonmuramatsu/icw-api-boilerplate
 * @see https://www.npmjs.com/package/@insightcreativewebs/api
 */

import fs from 'fs';
import path from 'path';
import { EnvSchema } from '../util/env.config';

/**
 * ✨ Tenta carregar ts-node ou tsx para executar TypeScript
 */
function loadTypeScriptLoader() {
  // Tenta tsx primeiro (mais moderno e rápido)
  try {
    const tsx = require('tsx');
    return { loader: 'tsx', instance: tsx };
  } catch {}

  // Tenta ts-node
  try {
    const tsNode = require('ts-node');
    return { loader: 'ts-node', instance: tsNode };
  } catch {}

  return null;
}

/**
 * ✨ Registra loader TypeScript se disponível
 */
function registerTypeScriptLoader() {
  const loader = loadTypeScriptLoader();
  
  if (!loader) {
    return false;
  }

  if (loader.loader === 'tsx') {
    // tsx funciona automaticamente
    return true;
  }

  if (loader.loader === 'ts-node') {
    const tsConfigPath = path.join(process.cwd(), 'tsconfig.json');
    const tsConfig = fs.existsSync(tsConfigPath) 
      ? require(tsConfigPath) 
      : {};

    loader.instance.register({
      compilerOptions: {
        module: 'commonjs',
        esModuleInterop: true,
        skipLibCheck: true,
        resolveJsonModule: true,
        ...tsConfig.compilerOptions,
      },
      transpileOnly: true,
    });
    return true;
  }

  return false;
}

/**
 * ✨ Importa arquivo TypeScript do projeto do usuário
 * Versão que sempre usa execSync para evitar handles abertos
 */
function importTypeScriptFile(filePath: string): any {
  const absolutePath = path.resolve(process.cwd(), filePath);
  
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Arquivo não encontrado: ${absolutePath}`);
  }

  // ✨ SEMPRE usa execSync com tsx para evitar problemas com require()
  const { execSync } = require('child_process');
  const tempOutput = path.join(process.cwd(), '.temp-env-schema.json');
  const tempScript = path.join(process.cwd(), '.temp-extract-env.ts');
  
  // Cria script temporário que exporta apenas o envSchema
  const fileContent = fs.readFileSync(absolutePath, 'utf8');
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
    // ✨ Executa com timeout e força finalização
    execSync(`npx tsx "${tempScript}"`, { 
      stdio: 'pipe',
      cwd: process.cwd(),
      timeout: 15000, // 15 segundos de timeout
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });
    
    // Lê resultado
    if (fs.existsSync(tempOutput)) {
      const result = JSON.parse(fs.readFileSync(tempOutput, 'utf8'));
      
      // ✨ Limpa arquivos temporários
      try {
        fs.unlinkSync(tempScript);
      } catch {}
      try {
        fs.unlinkSync(tempOutput);
      } catch {}
      
      return result;
    } else {
      throw new Error('Arquivo de saída não foi criado');
    }
  } catch (execError: any) {
    // Limpa em caso de erro
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
      `  3. O arquivo não tem erros de sintaxe`
    );
  }
}

function generateEnvFiles() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const exampleOnly = args.includes('--example-only');
  
  // ✨ Permite especificar caminho customizado via --path
  const pathArg = args.find(arg => arg.startsWith('--path='));
  const customPath = pathArg ? pathArg.split('=')[1] : null;

  // ✨ Configura tsconfig-paths se disponível
  try {
    require('tsconfig-paths/register');
  } catch {}

  // ✨ Lista de locais possíveis para buscar envSchema
  const possiblePaths: string[] = [];
  
  // Se caminho customizado foi fornecido, adiciona primeiro
  if (customPath) {
    possiblePaths.push(customPath); // Já é relativo ao cwd
  }
  
  // Locais padrão
  possiblePaths.push(
    'src/configs/env.schema.ts',
    'src/server.ts',
    'src/config/env.schema.ts',
    'config/env.schema.ts',
    'env.schema.ts',
  );

  let envSchema: EnvSchema | null = null;
  let sourceFile = '';

  // ✨ Busca em todos os locais possíveis
  for (const schemaPath of possiblePaths) {
    const absolutePath = path.resolve(process.cwd(), schemaPath);
    
    if (fs.existsSync(absolutePath)) {
      try {
        console.log(`🔍 Tentando ler: ${schemaPath}...`);
        
        const schemaModule = importTypeScriptFile(schemaPath);
        
        if (schemaModule && schemaModule.envSchema) {
          envSchema = schemaModule.envSchema;
          sourceFile = schemaPath;
          console.log(`✅ Schema encontrado em: ${sourceFile}`);
          break;
        }
      } catch (error: any) {
        console.warn(`⚠️  Erro ao ler ${schemaPath}:`, error.message);
        // Continua para próximo arquivo
      }
    }
  }

  if (!envSchema) {
    console.error('❌ envSchema não encontrado!');
    console.log('\n📝 Para usar este script:');
    console.log('   1. Crie src/configs/env.schema.ts OU');
    console.log('   2. Exporte envSchema do src/server.ts OU');
    console.log('   3. Use --path=src/custom/env.ts');
    console.log('\n💡 Dica: Instale ts-node ou tsx para melhor suporte:');
    console.log('   npm install -D ts-node');
    console.log('   ou');
    console.log('   npm install -D tsx');
    process.exit(1);
  }

  console.log(`📦 ${Object.keys(envSchema).length} variáveis definidas\n`);

  // ✨ Gera .env.example (sempre, sem valores)
  generateEnvExample(envSchema, sourceFile);

  // ✨ Gera .env (se não for --example-only)
  if (!exampleOnly) {
    generateEnv(envSchema, sourceFile, force);
  }

  console.log('\n✅ Concluído!');
  
  // ✨ FORÇA FINALIZAÇÃO DO PROCESSO
  // Usa setImmediate para garantir que tudo foi escrito antes de sair
  setImmediate(() => {
    process.exit(0);
  });
}

/**
 * ✨ Busca recursiva por arquivos que exportam envSchema
 */
function findEnvSchemaRecursive(dir: string, maxDepth = 3, currentDepth = 0): { schema: EnvSchema; file: string } | null {
  if (currentDepth >= maxDepth) return null;

  try {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        const found = findEnvSchemaRecursive(filePath, maxDepth, currentDepth + 1);
        if (found) return found;
      } else if (file.endsWith('.ts') && !file.endsWith('.test.ts') && !file.endsWith('.spec.ts')) {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          if (content.includes('envSchema') && content.includes('defineEnv')) {
            // Tenta importar
            try {
              const tsNode = require('ts-node');
              tsNode.register({ transpileOnly: true });
              
              delete require.cache[filePath];
              const module = require(filePath);
              
              if (module.envSchema) {
                return {
                  schema: module.envSchema,
                  file: path.relative(process.cwd(), filePath),
                };
              }
            } catch {
              // Continua
            }
          }
        } catch {
          // Continua
        }
      }
    }
  } catch {
    // Ignora erros
  }
  
  return null;
}

/**
 * ✨ Gera .env.example (referência sem valores)
 */
function generateEnvExample(envSchema: EnvSchema, sourceFile: string) {
  let content = '# ============================================\n';
  content += '# Arquivo de referência - NÃO contém valores\n';
  content += '# Gerado automaticamente do envSchema\n';
  content += `# Fonte: ${sourceFile}\n`;
  content += `# Data: ${new Date().toISOString()}\n`;
  content += '# Execute: pnpm generate:env para atualizar\n';
  content += '# ============================================\n\n';

  // Agrupa por grupo
  const groups: Record<string, string[]> = {};
  Object.entries(envSchema).forEach(([key, config]) => {
    const group = config.group || 'Outros';
    if (!groups[group]) groups[group] = [];
    groups[group].push(key);
  });

  // Gera por grupo
  Object.entries(groups).forEach(([groupName, keys]) => {
    content += `# ========== ${groupName} ==========\n`;

    keys.forEach((key) => {
      const config = envSchema[key];
      const comments: string[] = [];

      if (config.description) {
        comments.push(config.description);
      }

      if (config.type) {
        comments.push(`Tipo: ${config.type}`);
      }

      if (config.values && Array.isArray(config.values)) {
        comments.push(`Valores: ${config.values.join(' | ')}`);
      }

      if (config.default !== undefined) {
        comments.push(`Default: ${config.default}`);
      }

      if (config.required === true) {
        comments.push('⚠️ OBRIGATÓRIO');
      }

      if (config.secure === true) {
        comments.push('🔒 SENSÍVEL');
      }

      const comment = comments.length > 0 ? ` # ${comments.join(' | ')}` : '';
      content += `${key}=${comment}\n`;
    });

    content += '\n';
  });

  // Footer
  const total = Object.keys(envSchema).length;
  const required = Object.values(envSchema).filter((c) => c.required).length;
  const secure = Object.values(envSchema).filter((c) => c.secure).length;

  content += `# Total: ${total} variáveis`;
  if (required > 0) content += ` | ${required} obrigatórias`;
  if (secure > 0) content += ` | ${secure} sensíveis 🔒`;
  content += '\n';

  fs.writeFileSync('.env.example', content);
  console.log('✅ .env.example gerado');
}

/**
 * ✨ Gera .env com valores default (preserva existentes)
 */
function generateEnv(envSchema: EnvSchema, sourceFile: string, force: boolean) {
  const envPath = path.join(process.cwd(), '.env');
  const envExists = fs.existsSync(envPath);

  // ✨ Lê .env existente (se houver)
  let existingEnv: Record<string, string> = {};
  if (envExists && !force) {
    try {
      const existingContent = fs.readFileSync(envPath, 'utf8');
      existingContent.split('\n').forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=');
          if (key) {
            existingEnv[key.trim()] = valueParts.join('=').trim();
          }
        }
      });
    } catch (error) {
      console.warn('⚠️  Erro ao ler .env existente:', error);
    }
  }

  // ✨ Gera conteúdo
  let content = '# ============================================\n';
  content += '# Arquivo de configuração de ambiente\n';
  content += '# Gerado automaticamente do envSchema\n';
  content += `# Fonte: ${sourceFile}\n`;
  content += `# Data: ${new Date().toISOString()}\n`;
  content += '# Execute: pnpm generate:env para atualizar\n';
  content += '# ============================================\n\n';

  // Agrupa por grupo
  const groups: Record<string, string[]> = {};
  Object.entries(envSchema).forEach(([key, config]) => {
    const group = config.group || 'Outros';
    if (!groups[group]) groups[group] = [];
    groups[group].push(key);
  });

  let newVars = 0;
  let preservedVars = 0;

  // Gera por grupo
  Object.entries(groups).forEach(([groupName, keys]) => {
    content += `# ========== ${groupName} ==========\n`;

    keys.forEach((key) => {
      const config = envSchema[key];
      
      // ✨ Preserva valor existente ou usa default
      let value: string;
      if (existingEnv[key] !== undefined && !force) {
        value = existingEnv[key];
        preservedVars++;
      } else {
        // Usa default ou string vazia
        if (config.default !== undefined) {
          value = String(config.default);
        } else if (config.required) {
          value = ''; // Deixa vazio para obrigatórias sem default
        } else {
          value = '';
        }
        if (existingEnv[key] === undefined) {
          newVars++;
        }
      }

      // Monta comentário
      const comments: string[] = [];
      if (config.description) {
        comments.push(config.description);
      }
      if (config.type) {
        comments.push(`[${config.type}]`);
      }
      if (config.values && Array.isArray(config.values)) {
        comments.push(`(${config.values.join('|')})`);
      }
      if (config.required === true) {
        comments.push('⚠️ OBRIGATÓRIO');
      }
      if (config.secure === true) {
        comments.push('🔒 SENSÍVEL');
      }

      const comment = comments.length > 0 ? ` # ${comments.join(' | ')}` : '';
      const preserved = existingEnv[key] !== undefined && !force ? ' # (preservado)' : '';
      content += `${key}=${value}${comment}${preserved}\n`;
    });

    content += '\n';
  });

  // Footer
  const total = Object.keys(envSchema).length;
  const required = Object.values(envSchema).filter((c) => c.required).length;
  const secure = Object.values(envSchema).filter((c) => c.secure).length;

  content += `# Total: ${total} variáveis`;
  if (required > 0) content += ` | ${required} obrigatórias`;
  if (secure > 0) content += ` | ${secure} sensíveis 🔒`;
  content += '\n';

  // ✨ Escreve .env
  fs.writeFileSync(envPath, content);
  
  console.log('✅ .env gerado');
  if (preservedVars > 0) {
    console.log(`   📌 ${preservedVars} valores preservados`);
  }
  if (newVars > 0) {
    console.log(`   ✨ ${newVars} novas variáveis adicionadas`);
  }
  if (required > 0) {
    console.log(`   ⚠️  ${required} variáveis obrigatórias (verifique se estão preenchidas)`);
  }
}

// ✨ Wrapper principal com garantia de finalização
(function main() {
  try {
    generateEnvFiles();
    // ✨ Força finalização após um pequeno delay
    // Isso garante que todos os I/O foram concluídos
    setTimeout(() => {
      process.exit(0);
    }, 100);
  } catch (error: any) {
    console.error('\n❌ Erro:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    setTimeout(() => {
      process.exit(1);
    }, 100);
  }
})();