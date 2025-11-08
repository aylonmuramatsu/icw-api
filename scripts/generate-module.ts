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

// framework/scripts/generate-module.ts
import fs from 'fs';
import path from 'path';

interface ModuleOptions {
  name: string;
  withController?: boolean;
  withService?: boolean;
  withRules?: boolean;
  prefix?: string;
}

const TEMPLATES = {
  controller: (name: string, className: string) => `import { Request } from 'express';
import { ok, created, BaseController } from '@insightcreativewebs/api';
import { Rules } from './${name}.rules';
import { ${className}Service } from './${name}.service';

export class ${className}Controller extends BaseController {
  private service = new ${className}Service();

  async list_all(req: Request) {
    //o pick faz o sanitize dos campos conforme o schema
    const input = Rules.list_all.pick({ ...req.query });
    //check realiza as validacoes e emite o exception
    Rules.list_all.check(input);
    
    const response = await this.service.list_all(input);
    return ok(response);
  }

  async create(req: Request) {
    const input = Rules.create.pick({ ...req.body });
    Rules.create.check(input);
    
    const response = await this.service.create(input);
    return created(response);
  }
}
`,

  service: (name: string, className: string) => `import { BaseService, InputOf } from '@insightcreativewebs/api';
import { Rules } from './${name}.rules';

export class ${className}Service extends BaseService {
  async list_all(input: InputOf<typeof Rules.list_all>) {
    Rules.list_all.check(input);
    
    // ✨ Implementar lógica aqui
    return [];
  }

  async create(input: InputOf<typeof Rules.create>) {
    Rules.create.check(input);
    
    // ✨ Implementar lógica aqui
    return {};
  }
}
`,

  rules: (name: string) => `import { required, schema } from '@insightcreativewebs/api';

export const Rules = {
  list_all: schema({
  }),

  create: schema({
    user_id: required(),
    // ✨ Adicionar mais campos conforme necessário
  }),

  update: schema({
    id: required(),
    // ✨ Adicionar mais campos conforme necessário
  }),
};
`,

  module: (name: string, className: string, prefix: string) => `import { createModule } from '@insightcreativewebs/api';
import { ${className}Controller } from './${name}.controller';

export const ${className}Module = createModule(
  '${prefix}',
  ${className}Controller,
  [],
  {
    name: '${className}',
    description: 'Módulo de ${name}',
    tags: ['${name}'],
  },
).routes((route) => [
  route.get('/', 'list_all'),
  route.post('/', 'create'),
  // ✨ Adicionar mais rotas conforme necessário
]);
`,
};

function toPascalCase(str: string): string {
  return str
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

function generateModule(options: ModuleOptions): void {
  const { name, withController = true, withService = true, withRules = true, prefix } = options;
  
  const kebabName = toKebabCase(name);
  const className = toPascalCase(name);
  const modulePrefix = prefix || `/${kebabName}`;
  
  const moduleDir = path.join(process.cwd(), 'src', 'modules', kebabName);
  
  if (fs.existsSync(moduleDir)) {
    console.error(`❌ Módulo "${kebabName}" já existe!`);
    process.exit(1);
  }
  
  fs.mkdirSync(moduleDir, { recursive: true });
  console.log(`📁 Diretório criado: ${moduleDir}`);
  
  if (withController) {
    const controllerPath = path.join(moduleDir, `${kebabName}.controller.ts`);
    fs.writeFileSync(controllerPath, TEMPLATES.controller(kebabName, className));
    console.log(`✅ Controller criado: ${controllerPath}`);
  }
  
  if (withService) {
    const servicePath = path.join(moduleDir, `${kebabName}.service.ts`);
    fs.writeFileSync(servicePath, TEMPLATES.service(kebabName, className));
    console.log(`✅ Service criado: ${servicePath}`);
  }
  
  if (withRules) {
    const rulesPath = path.join(moduleDir, `${kebabName}.rules.ts`);
    fs.writeFileSync(rulesPath, TEMPLATES.rules(kebabName));
    console.log(`✅ Rules criado: ${rulesPath}`);
  }
  
  const modulePath = path.join(moduleDir, `${kebabName}.module.ts`);
  fs.writeFileSync(modulePath, TEMPLATES.module(kebabName, className, modulePrefix));
  console.log(`✅ Module criado: ${modulePath}`);
  
  console.log(`\n✨ Módulo "${kebabName}" criado com sucesso!`);
  console.log(`📝 Próximos passos:`);
  console.log(`   1. Implementar lógica nos services`);
  console.log(`   2. Adicionar validações nas rules`);
  console.log(`   3. Configurar rotas no module.ts`);
}

// CLI
const args = process.argv.slice(2);
const nameArg = args.find(arg => !arg.startsWith('--'));
const options: ModuleOptions = {
  name: nameArg || '',
  withController: !args.includes('--no-controller'),
  withService: !args.includes('--no-service'),
  withRules: !args.includes('--no-rules'),
  prefix: args.find(arg => arg.startsWith('--prefix='))?.split('=')[1],
};

if (!options.name) {
  console.error('❌ Erro: Nome do módulo é obrigatório');
  console.log('\nUso: pnpm generate:module <nome> [opções]');
  console.log('\nOpções:');
  console.log('  --no-controller    Não cria controller');
  console.log('  --no-service       Não cria service');
  console.log('  --no-rules         Não cria rules');
  console.log('  --prefix=/custom   Define prefix customizado');
  console.log('\nExemplos:');
  console.log('  pnpm generate:module user');
  console.log('  pnpm generate:module product --prefix=/products');
  console.log('  pnpm generate:module simple --no-rules');
  process.exit(1);
}

generateModule(options);