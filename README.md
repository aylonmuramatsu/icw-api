# @insightcreativewebs/api

<div align="center">

**Framework Node.js moderno para APIs REST com TypeScript**

[![npm version](https://img.shields.io/npm/v/@insightcreativewebs/api)](https://www.npmjs.com/package/@insightcreativewebs/api)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)

</div>

## 🚀 Características

- ✨ **TypeScript First**: Totalmente tipado com TypeScript
- 🏗️ **Arquitetura Modular**: Controller, Service, Rules pattern
- 🔒 **Type-Safe**: Validação de dados com schema tipado
- 📝 **Auto-documentação**: Geração automática de `.env` e `.env.example`
- 🎯 **Context Global**: Sistema de contexto similar ao Nullstack
- 🔌 **Extensível**: Sistema de plugins e middlewares configuráveis
- 📦 **ORM Agnostic**: Desacoplado de ORMs específicos
- 🛠️ **CLI Tools**: Scripts para gerar módulos e configurar ambiente
- 📊 **Logger Avançado**: Sistema de logging com persistência
- 🌍 **Timezone Management**: Gerenciamento centralizado de datas

## 📦 Instalação

```bash
npm install @insightcreativewebs/api
# ou
yarn add @insightcreativewebs/api
# ou
pnpm add @insightcreativewebs/api
```

## 🎯 Quick Start

### 1. Criar novo projeto

```bash
npx create-icw-api minha-api
cd minha-api
npm install
```

### 2. Configurar variáveis de ambiente

O framework gera automaticamente o arquivo `.env` baseado no `envSchema`:

```typescript
// src/server.ts
import { Application, defineEnv } from '@insightcreativewebs/api';
import dotenv from 'dotenv';

dotenv.config();

export const envSchema = defineEnv({
  PORT: {
    type: 'number',
    default: 3000,
    description: 'Porta do servidor',
    group: 'Servidor',
  },
  NODE_ENV: {
    type: 'enum',
    values: ['development', 'production', 'test'],
    default: 'development',
    description: 'Ambiente de execução',
    group: 'Servidor',
  },
});

const app = new Application({
  envSchema,
  timezone: 'America/Sao_Paulo',
});

app.start().catch(console.error);
```

### 3. Criar seu primeiro módulo

```bash
npm run generate:module user
```

Isso cria:
- `src/modules/user/user.controller.ts`
- `src/modules/user/user.service.ts`
- `src/modules/user/user.rules.ts`
- `src/modules/user/user.module.ts`

## 📚 Documentação

### Application

A classe principal do framework:

```typescript
import { Application, defineEnv } from '@insightcreativewebs/api';

const app = new Application({
  envSchema: defineEnv({ /* ... */ }),
  port: 3000,
  timezone: 'America/Sao_Paulo',
  modulesPath: 'src/modules',
  plugins: {
    storage: new MyStorageManager(),
    mailer: new MyMailerService(),
  },
});

app.start();
```

### Controllers

```typescript
import { Request } from 'express';
import { ok, created, BaseController } from '@insightcreativewebs/api';
import { UserService } from './user.service';
import { createUserRules, updateUserRules } from './user.rules';
import { Validation } from '@insightcreativewebs/api';

export class UserController extends BaseController {
  constructor(private userService: UserService) {
    super();
  }

  async list(req: Request) {
    const users = await this.userService.findAll();
    return ok(users);
  }

  async create(req: Request) {
    const validation = new Validation();
    const rules = createUserRules();
    
    rules.validate(req.body, validation);
    
    if (!validation.isValid()) {
      return {
        status: 400,
        errors: validation.getFormatted(),
      };
    }
    
    const user = await this.userService.create(req.body);
    return created(user);
  }
}
```

### Services

```typescript
import { BaseService } from '@insightcreativewebs/api';
import { getContext } from '@insightcreativewebs/api';

export class UserService extends BaseService {
  async findAll() {
    const context = getContext();
    // Acessa database, logger, config, etc via context
    return [];
  }

  async create(data: any) {
    // Implementar lógica aqui
    return data;
  }
}
```

### Validation Rules

```typescript
import { required, email, schema, InputOf } from '@insightcreativewebs/api';

export const createUserRules = schema({
  name: [required('Nome é obrigatório')],
  email: [required('Email é obrigatório'), email('Email inválido')],
  age: [required('Idade é obrigatória'), numeric('Idade deve ser um número')],
});

export const updateUserRules = schema({
  name: [required('Nome é obrigatório')],
  email: [email('Email inválido')],
});

export type CreateUserInput = InputOf<typeof createUserRules>;
export type UpdateUserInput = InputOf<typeof updateUserRules>;
```

### Modules

```typescript
import { createModule } from '@insightcreativewebs/api';
import { UserController } from './user.controller';
import { UserService } from './user.service';

const controller = new UserController(new UserService());

export default createModule(
  '/users',
  UserController,
  [], // middlewares opcionais
  {
    name: 'User',
    description: 'Módulo de usuários',
    tags: ['users'],
  }
).routes((route) => [
  route.get('/', 'list'),
  route.get('/:id', 'show'),
  route.post('/', 'create'),
  route.put('/:id', 'update'),
  route.delete('/:id', 'delete'),
]);
```

### Application Context

Acesse recursos globais em qualquer lugar:

```typescript
import { getContext } from '@insightcreativewebs/api';

const context = getContext();

// Acessa database (se configurado)
context.database?.query('SELECT * FROM users');

// Acessa logger
context.logger.info('Mensagem de log');

// Acessa config
const port = context.config.get('PORT');

// Acessa plugins customizados
const storage = context.getPlugin('storage');
```

### Date Helper

Gerenciamento centralizado de datas:

```typescript
import { dateHelper, configureTimezone } from '@insightcreativewebs/api';

// Configura timezone (feito automaticamente no Application)
configureTimezone('America/Sao_Paulo');

// Usa helper
const now = dateHelper().toDB(); // Converte para UTC para salvar no banco
const local = dateHelper().fromDB(now); // Converte de UTC para local
```

### Query Filter

Filtros funcionais para queries:

```typescript
import { filter, conditionalFilter } from '@insightcreativewebs/api';

// Filtro simples
const where = filter({
  name: 'John',
  age: 25,
});

// Filtro condicional
const where = conditionalFilter({
  name: search ? { $like: `%${search}%` } : undefined,
  status: status || undefined,
});
```

### Logger

Sistema de logging avançado:

```typescript
import { logger } from '@insightcreativewebs/api';

logger.info('Informação');
logger.warn('Aviso');
logger.error('Erro');
logger.debug('Debug (só aparece se DEBUG_MODE=true)');
logger.success('Sucesso');
logger.http('Requisição HTTP');

// Com persistência
logger.info('Log importante', { persist: true });

// Consultar logs
const errors = logger.getErrors();
const stats = logger.getStats();
```

## 🛠️ CLI Scripts

### Gerar módulo

```bash
npm run generate:module <nome> [opções]

# Opções:
# --no-controller    Não cria controller
# --no-service       Não cria service
# --no-rules         Não cria rules
# --prefix=/custom   Define prefix customizado
```

### Gerar arquivos de ambiente

```bash
# Gera .env e .env.example
npm run generate:env

# Apenas .env.example
npm run generate:env:example

# Força regerar .env (sobrescreve valores existentes)
npm run generate:env:force
```

## ⚙️ Configuração

### TypeScript Configuration

Para evitar problemas com imports em desenvolvimento, **use a seguinte configuração no `tsconfig.json` do seu projeto**:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "declaration": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

**✨ Importante sobre imports sem extensão:**

O comportamento depende da versão do TypeScript:

**TypeScript 4.9.x ou anterior:**
- ✅ Permite imports sem extensão normalmente
- ```typescript
  import { UserService } from './user.service';
  import { createUserRules } from './user.rules';
  ```

**TypeScript 5.0+ (mais rigoroso):**
- ⚠️ Exige extensões `.js` nos imports relativos (mesmo que o arquivo seja `.ts`)
- ```typescript
  import { UserService } from './user.service.js';
  import { createUserRules } from './user.rules.js';
  ```

**Por quê TypeScript 5.0+ exige extensões?**
- Quando o TypeScript compila, os arquivos `.ts` viram `.js`
- O TypeScript precisa saber qual será o caminho final em runtime
- Isso garante que os imports funcionem corretamente após a compilação

**Soluções:**

1. **Usar TypeScript 4.9.x** (mantém comportamento antigo):
   ```bash
   npm install --save-dev typescript@4.9.5
   ```

2. **Usar extensões `.js` nos imports** (recomendado para TypeScript 5.0+):
   ```typescript
   import { UserService } from './user.service.js';
   ```

3. **Em desenvolvimento com `tsx` ou `ts-node`:**
   - O `tsx`/`ts-node` resolve corretamente os imports com `.js` mesmo que o arquivo seja `.ts`
   - Funciona perfeitamente em desenvolvimento e produção

## ⚙️ Configuração Avançada

### Variáveis de Ambiente

O framework suporta as seguintes variáveis:

#### Servidor
- `PORT`: Porta do servidor (padrão: 3000)
- `NODE_ENV`: Ambiente (development/production/test)
- `TIMEZONE`: Timezone da aplicação (padrão: America/Sao_Paulo)

#### Logger
- `LOGGING`: Habilita/desabilita logging (padrão: true)
- `DEBUG_MODE`: Habilita modo debug (padrão: false)
- `LOG_PERSIST_MODE`: Modo de persistência (none/memory/file/both)
- `LOG_DIRECTORY`: Diretório dos logs (padrão: logs)
- `MAX_MEMORY_LOGS`: Máximo de logs em memória (padrão: 100)

#### Request Logging
- `LOG_REQUEST_LEVEL`: Nível de log (none/all/errors)

## 🔌 Plugins

Registre serviços customizados no Application Context:

```typescript
const app = new Application({
  plugins: {
    storage: new S3StorageManager(),
    mailer: new SendGridMailer(),
    cache: new RedisCache(),
  },
});

// Acesse em qualquer lugar
const context = getContext();
const storage = context.getPlugin('storage');
```

## 🎨 Middlewares Customizados

### Error Middleware

```typescript
import { createErrorMiddleware } from '@insightcreativewebs/api';

const customErrorMiddleware = createErrorMiddleware({
  handlers: {
    MyCustomError: (err, req, res) => {
      res.status(500).json({ error: 'Custom error' });
    },
  },
});

const app = new Application({
  middlewareConfig: {
    errorMiddleware: customErrorMiddleware,
  },
});
```

### CORS Middleware

```typescript
import { createCorsMiddleware } from '@insightcreativewebs/api';

const cors = createCorsMiddleware({
  origins: ['https://example.com', 'https://app.example.com'],
  credentials: true,
});

const app = new Application({
  middlewareConfig: {
    corsMiddleware: cors,
  },
});
```

## 📖 Exemplos

Veja mais exemplos na [documentação completa](https://github.com/aylonmuramatsu/icw-api-boilerplate).

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor, abra uma issue ou pull request.

## 📄 Licença

MIT © 2025 [Aylon Muramatsu](https://github.com/aylonmuramatsu)

## 🔗 Links

- [GitHub](https://github.com/aylonmuramatsu/icw-api-boilerplate)
- [NPM](https://www.npmjs.com/package/@insightcreativewebs/api)
- [Documentação](https://github.com/aylonmuramatsu/icw-api-boilerplate)

---

<div align="center">

Feito com ❤️ por [Insight Creative Webs](https://insightcreativewebs.com)

</div>
