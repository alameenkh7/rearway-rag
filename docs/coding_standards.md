# 🏗️ Code Standards Reference — NestJS + Clean Architecture

> **What this is:** A reusable reference prompt you can feed to AI assistants (or share with developers) so they follow the exact same coding patterns, architecture, and conventions used in our production backend.
>
> **Stack:** NestJS · TypeScript · PostgreSQL · Sequelize ORM · JWT Auth · Swagger · class-validator

---

## 1. Architecture — Clean Architecture (Strict Layer Separation)

We follow **Clean Architecture** with three layers. Dependencies flow **inward only** — infrastructure depends on core, never the reverse.

```
┌─────────────────────────────────────────────────────────┐
│  PRESENTATION LAYER (src/gateways/http/)                │
│  Controllers · DTOs · Guards · Swagger decorators       │
├─────────────────────────────────────────────────────────┤
│  CORE LAYER (src/core/)                                 │
│  Entities · Use Cases (Commands + Queries)              │
│  Entity Gateway Interfaces (ports, no implementation)   │
├─────────────────────────────────────────────────────────┤
│  INFRASTRUCTURE LAYER (src/infrastructure/)             │
│  Persistence (Sequelize) · Auth (JWT/Passport) · Logger │
│  External Services (WhatsApp, etc.)                     │
└─────────────────────────────────────────────────────────┘
```

### Folder Structure

```
src/
├── core/
│   ├── entities/           # TypeScript interfaces — pure data shapes
│   ├── entitygateway/      # Port interfaces (Loader + Persistor per entity)
│   ├── usecases/
│   │   ├── commands/       # Write operations (create, update, cancel, etc.)
│   │   ├── queries/        # Read operations (get, list, report, etc.)
│   │   ├── services/       # Shared domain services (logging, formatting)
│   │   ├── wrappers.ts     # Cross-cutting UC wrappers (logging)
│   │   └── index.ts        # initUseCases() + UseCases type
│   └── constants.ts        # Business constants and enums
├── gateways/
│   └── http/
│       ├── *.controller.ts # NestJS REST controllers
│       ├── dto/            # Request/Response DTOs with class-validator
│       ├── swagger/        # Swagger decorator compositions
│       ├── validators/     # Custom class-validator decorators
│       └── http.module.ts  # HTTP module registration
├── infrastructure/
│   ├── SequelizePersistence/
│   │   ├── models/         # Sequelize model definitions
│   │   ├── migrations/     # DB migration files
│   │   ├── seeders/        # Seeder files
│   │   └── *-persistence.service.ts  # Gateway implementations
│   ├── Auth/               # JWT strategy, guards, decorators, interceptors
│   ├── Logger/             # Logger implementation
│   └── WhatsApp/           # External service implementations
├── coreadapter/
│   ├── coreadapter.module.ts   # NestJS module — registers all providers
│   └── coreadapter.service.ts  # DI wiring — maps infra to Deps
├── shared/
│   ├── errors/             # BaseError + domain error classes
│   └── decorators/         # Shared decorators (error handler, etc.)
├── codecs/                 # Shared enums (used by both core + presentation)
├── tokens.ts               # All DI tokens (Symbols)
└── main.ts                 # App bootstrap
```

---

## 2. Core Layer Rules

### 2.1 Entities — Pure TypeScript Interfaces

Entities are **plain TypeScript interfaces** in `src/core/entities/`. They have zero dependencies on NestJS, Sequelize, or any framework.

```typescript
// src/core/entities/User.ts
export interface User {
  id: string               // Always UUIDv4
  email: string
  password: string         // bcrypt hashed
  firstName: string
  lastName?: string
  role: UserRole           // Enum from codecs/enums
  branchId?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// Derived interfaces using Omit/Pick
export interface UserWithoutPassword extends Omit<User, 'password'> {}
```

**Rules:**
- No decorators on entity interfaces
- Import enums from `codecs/enums`, not from any framework
- Use `?` for optional fields, not `| undefined`
- All entities have `id: string` (UUIDv4), `createdAt`, `updatedAt`
- Export everything from `entities/index.ts` barrel file

### 2.2 Entity Gateways — Ports (Loader + Persistor)

Each entity has **two port interfaces** in `src/core/entitygateway/`:

- **Loader** — read-only operations (used by queries)
- **Persistor** — write operations (used by commands)

```typescript
// src/core/entitygateway/TherapistSlot.ts
import { TherapistSlot, SlotStatus } from '../entities'

export interface TherapistSlotLoader {
  getSlotById(slotId: string): Promise<TherapistSlot | null>
  getSlots(filters: { branchId?: string; status?: SlotStatus; ... }): Promise<TherapistSlot[]>
  getSlotCount(filters: { ... }): Promise<number>
}

export interface TherapistSlotPersistor {
  createSlot(request: CreateTherapistSlotRequest, branchId: string): Promise<TherapistSlot>
  updateSlot(slotId: string, updates: UpdateTherapistSlotRequest): Promise<TherapistSlot>
  deleteSlot(slotId: string): Promise<void>
  bulkCreateSlots(requests: CreateTherapistSlotRequest[], branchId: string): Promise<TherapistSlot[]>
}
```

**Rules:**
- Gateway interfaces return **entity interfaces**, never Sequelize models
- All methods return `Promise<T>`
- Null-returning methods use `Promise<T | null>`
- All gateways are collected into a single `Deps` interface:

```typescript
// src/core/entitygateway/index.ts
export interface Deps {
  logger: Logger
  userLoader: UserLoader
  userPersistor: UserPersistor
  programLoader: ProgramLoader
  programPersistor: ProgramPersistor
  therapistSlotLoader: TherapistSlotLoader
  therapistSlotPersistor: TherapistSlotPersistor
  whatsAppService: WhatsAppService
  // ... all loaders + persistors
}
```

### 2.3 Use Cases — Factory Function Pattern

Every use case follows the **factory function pattern** (not classes):

```typescript
// src/core/usecases/commands/CreateProgram.ts

// 1. Define Input/Output interfaces at top of file
export interface CreateProgramInput {
  name: string
  description?: string
  sessionTypes: string[]
  sessionConfiguration: Record<string, number>
  price: number
  branchId: string
}

export type CreateProgramOutput = {
  message: string
  data: Program
}

// 2. Factory function: receives Deps, returns the use case function
export function makeUC(deps: Deps) {
  return async function createProgram(input: CreateProgramInput): Promise<CreateProgramOutput> {
    const { logger, programPersistor, programLoader } = deps

    try {
      // Business logic here — validate, create, etc.
      const program = await programPersistor.createProgram(input)

      return {
        message: 'Program created successfully',
        data: program
      }
    } catch (error) {
      logger.error('Failed to create program', error instanceof Error ? error.message : String(error))
      throw error
    }
  }
}

// 3. Export a name constant for logging/wrappers
export const name = 'CreateProgram'
```

**When a single file has multiple related use cases:**

```typescript
// src/core/usecases/commands/ManageTherapistSlot.ts

export function makeCreateSlotUC(deps: Deps) {
  return async function createTherapistSlot(input: ManageSlotInput): Promise<ManageSlotOutput> { ... }
}

export function makeUpdateSlotUC(deps: Deps) {
  return async function updateTherapistSlot(input: UpdateSlotInput): Promise<ManageSlotOutput> { ... }
}

export function makeCancelSlotUC(deps: Deps) {
  return async function cancelTherapistSlot(input: CancelSlotInput): Promise<ManageSlotOutput> { ... }
}

// Name exports for each
export const createSlotName = 'CreateTherapistSlot'
export const updateSlotName = 'UpdateTherapistSlot'
export const cancelSlotName = 'CancelTherapistSlot'
```

**Rules:**
- **Commands** go in `usecases/commands/`, **queries** in `usecases/queries/`
- Always destructure needed deps at the top of the inner function
- Wrap all logic in `try/catch`, log errors with `logger.error()`
- Return `{ message, data }` shape for commands
- Use `throw error` to propagate after logging (let controller handle HTTP status)

### 2.4 Use Case Registry — `initUseCases()`

All use cases are wired in `src/core/usecases/index.ts`:

```typescript
export function initUseCases(deps: Deps) {
  // Each UC is created via its factory, then wrapped with logging
  const createProgram = wrapUC(deps, CreateProgram.makeUC(deps), CreateProgram.name, ...defaultWrappers)
  const getPrograms = wrapUC(deps, GetPrograms.makeUC(deps), GetPrograms.name, ...defaultWrappers)

  return {
    queries: { getPrograms, getProgramById, ... },
    commands: { createProgram, updateProgram, ... },
  }
}

// The UseCases type is inferred from the return
export type UseCases = ReturnType<typeof initUseCases>
```

**Rules:**
- Every new UC must be:
  1. Created with `wrapUC(deps, MakeUC(deps), UCName, ...defaultWrappers)`
  2. Added to the returned `queries` or `commands` object
- `UseCases` type is **always inferred** via `ReturnType<typeof initUseCases>` — never manually typed

---

## 3. Dependency Injection Pattern

### 3.1 Token-Based DI with Symbols

All injectable services use **Symbol tokens** defined in `src/tokens.ts`:

```typescript
// src/tokens.ts
export const CoreS = Symbol('core')
export const LoggerS = Symbol('logger')
export const UserPersistenceS = Symbol('user-persistence')
export const ProgramPersistenceS = Symbol('program-persistence')
export const TherapistSlotPersistenceS = Symbol('therapist-slot-persistence')
export const WhatsAppS = Symbol('whatsapp-service')
// ... one token per service
```

### 3.2 Core Adapter — Maps Infrastructure to Deps

`src/coreadapter/coreadapter.service.ts` is the **single wiring point** that maps infrastructure implementations to the core `Deps` interface:

```typescript
export const coreAdapterService: FactoryProvider = {
  provide: CoreS,
  useFactory: (
    logger: Logger,
    userPersistence: UserPersistenceService,
    programPersistence: ProgramPersistenceService,
    // ... all infrastructure services
  ): UseCases =>
    initUseCases({
      logger,
      userLoader: userPersistence,     // Same service serves both Loader and Persistor
      userPersistor: userPersistence,
      programLoader: programPersistence,
      programPersistor: programPersistence,
      // ...
    }),
  inject: [LoggerS, UserPersistenceS, ProgramPersistenceS, ...],
}
```

**Rules:**
- One persistence service often implements **both** Loader and Persistor for an entity
- Controllers never inject persistence services directly — only `CoreS` (UseCases)
- New services → add Symbol to `tokens.ts` → bind in `coreadapter.module.ts` → map in `coreadapter.service.ts`

---

## 4. Presentation Layer

### 4.1 Controller Pattern

```typescript
@ApiTags('Programs')
@Controller('api/v1/programs')
@UseGuards(JwtAuthGuard, RolesGuard, BranchAccessGuard)
@UseInterceptors(BranchFilterInterceptor)
@ApiBearerAuth('JWT-auth')
export class ProgramController {
  // Inject ONLY the UseCases object
  constructor(@Inject(CoreS) private readonly useCases: UseCases) {}

  @Post()
  @Roles(UserRole.BRANCH_ADMIN, UserRole.SUPER_ADMIN)
  @BranchFilter(false)
  @HandleTherapyErrors('create')
  async createProgram(
    @Body(ValidationPipe) dto: CreateProgramDTO,
    @CurrentUser() user: UserWithoutPassword,
  ) {
    const result = await this.useCases.commands.createProgram({
      ...dto,
      branchId: user.branchId!,
    })
    return result
  }
}
```

**Controller rules:**
- Class-level decorators: `@ApiTags`, `@Controller('api/v1/{resource}')`, guards, interceptors, `@ApiBearerAuth`
- Method-level decorator stack order: HTTP method → `@Roles()` → `@BranchFilter()` → `@HandleTherapyErrors()` (or Swagger)
- Always use `@Body(ValidationPipe)` and `@Query(ValidationPipe)` for auto-validation
- Always inject `branchId` from `user.branchId` — **never trust client-sent branchId**
- Controllers are thin — no business logic, just map DTO → use case input → return result

### 4.2 Auth Decorators

| Decorator | Purpose |
|-----------|---------|
| `@Roles(UserRole.BRANCH_ADMIN)` | Restrict access to specified roles |
| `@BranchFilter(true)` | Auto-inject `branchId` from JWT into query/body |
| `@BranchFilter(false)` | Expect `branchId` from request, verify access |
| `@CurrentUser()` | Get the current authenticated user (from JWT) |
| `@HandleTherapyErrors('create')` | Domain-aware error handling decorator |

### 4.3 DTOs — class-validator + Swagger

```typescript
// src/gateways/http/dto/CreateProgramDTO.ts
import { IsString, IsNotEmpty, IsOptional, IsArray, IsNumber, IsUUID } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'

export class CreateProgramDTO {
  @ApiProperty({ description: 'Program name', example: 'N3 Early Intervention' })
  @IsString()
  @IsNotEmpty()
  name: string

  @ApiPropertyOptional({ description: 'Program description' })
  @IsOptional()
  @IsString()
  description?: string

  @ApiProperty({ description: 'Session types included', type: [String] })
  @IsArray()
  @IsString({ each: true })
  sessionTypes: string[]

  @ApiProperty({ description: 'Session configuration', example: { 'Speech Therapy': 12, OT: 8 } })
  sessionConfiguration: Record<string, number>

  @ApiProperty({ description: 'Price', example: 25000 })
  @Type(() => Number)
  @IsNumber()
  price: number

  @ApiProperty({ description: 'Branch ID' })
  @IsUUID()
  @IsNotEmpty()
  branchId: string
}
```

**DTO rules:**
- Every field has `@ApiProperty` or `@ApiPropertyOptional` with `description` and `example`
- Use `class-validator` decorators for validation
- Use `@Type(() => Number)` (from `class-transformer`) for numeric query params
- Optional fields: `@IsOptional()` + `?` on the type
- UUIDs: `@IsUUID()` (or `@IsUUID(4)` for strict v4)
- Arrays: `@IsArray()` + `@IsString({ each: true })` for string arrays

---

## 5. Infrastructure Layer

### 5.1 Persistence Services

Each persistence service implements **both** the Loader and Persistor gateway interfaces:

```typescript
// src/infrastructure/SequelizePersistence/program-persistence.service.ts
@Injectable()
export class ProgramPersistenceService implements ProgramLoader, ProgramPersistor {
  // Uses Sequelize models internally
  async getProgramById(id: string): Promise<Program | null> {
    const model = await ProgramModel.findByPk(id)
    return model ? this.toEntity(model) : null
  }

  async createProgram(input: CreateProgramInput): Promise<Program> {
    const model = await ProgramModel.create({ ...input })
    return this.toEntity(model)
  }

  // Map Sequelize model → pure entity interface
  private toEntity(model: ProgramModel): Program {
    return {
      id: model.id,
      name: model.name,
      // ...
    }
  }
}
```

**Rules:**
- Persistence services convert Sequelize models to **entity interfaces** before returning
- Never expose Sequelize models to the core layer
- Registration in `coreadapter.module.ts`:
  ```typescript
  { provide: ProgramPersistenceS, useClass: ProgramPersistenceService }
  ```

### 5.2 Migrations

```bash
# Always create new migrations, never modify existing ones
npm run db:migrate          # Run pending migrations
npm run db:migrate:undo     # Rollback last migration
```

Migration files go in `src/infrastructure/SequelizePersistence/migrations/` with the naming pattern:
```
YYYYMMDDHHMMSS-descriptive-name.js
```

---

## 6. Error Handling

### 6.1 Domain Error Classes

All custom errors extend `BaseError`:

```typescript
// src/shared/errors/base.error.ts
export class BaseError extends Error {
  constructor(
    public readonly errorCode: string,
    public readonly statusCode: number,
    message: string,
    public readonly details?: any
  ) {
    super(message)
  }
}

// src/shared/errors/domain.errors.ts
export class ResourceNotFoundError extends BaseError { ... }
export class ResourceAlreadyExistsError extends BaseError { ... }
export class ValidationError extends BaseError { ... }
export class SlotAlreadyBookedError extends BaseError { ... }
export class OverbookingError extends BaseError { ... }
```

### 6.2 Error Handler Decorator

Controllers use `@HandleTherapyErrors('operation')` which auto-converts thrown errors to the proper HTTP responses using pattern matching.

---

## 7. Coding Conventions

### 7.1 Formatting (Prettier)

```json
{
  "singleQuote": true,
  "trailingComma": "es5",
  "semi": false,
  "tabWidth": 2,
  "arrowParens": "avoid"
}
```

### 7.2 ESLint

- Parser: `@typescript-eslint/parser`
- Extends: `@typescript-eslint/recommended`, `prettier/recommended`
- `@typescript-eslint/no-explicit-any`: **off** (we allow `any` when pragmatically needed)
- `@typescript-eslint/explicit-function-return-type`: **off**

### 7.3 TypeScript Config

```json
{
  "target": "es2017",
  "module": "commonjs",
  "strictNullChecks": true,
  "noImplicitAny": true,
  "experimentalDecorators": true,
  "emitDecoratorMetadata": true,
  "esModuleInterop": true,
  "skipLibCheck": true
}
```

### 7.4 Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Files (entities, gateways) | PascalCase | `TherapistSlot.ts` |
| Files (controllers, services) | kebab-case | `therapist-slot.controller.ts` |
| Interfaces | PascalCase, no `I` prefix | `TherapistSlot`, not `ITherapistSlot` |
| DI Tokens | PascalCase + `S` suffix | `TherapistSlotPersistenceS` |
| Use case factories | `makeXxxUC(deps)` or `makeXxxYyyUC(deps)` | `makeCreateSlotUC(deps)` |
| UC name exports | camelCase `Name` suffix | `createSlotName = 'CreateTherapistSlot'` |
| DTOs | Entity + Action + `DTO` | `CreatePatientDTO` |
| Controllers | Entity + `Controller` | `PatientController` |
| Persistence | Entity + `PersistenceService` | `ProgramPersistenceService` |
| Enums | PascalCase values | `UserRole.BRANCH_ADMIN` |
| API paths | kebab-case, versioned | `/api/v1/therapist-slots` |

### 7.5 Import Order

1. NestJS / framework imports
2. Third-party libraries (swagger, class-validator, etc.)
3. Internal: tokens, core layer (entities, gateways, usecases)
4. Internal: infrastructure (auth, persistence)
5. Relative imports

---

## 8. Key Patterns Summary

### Adding a New Entity (end-to-end checklist)

1. **Entity interface** → `src/core/entities/NewEntity.ts` → export from `index.ts`
2. **Gateway interfaces** → `src/core/entitygateway/NewEntity.ts` (Loader + Persistor) → export from `index.ts`
3. **Add to `Deps`** → update `entitygateway/index.ts` with new loader/persistor fields
4. **Sequelize model** → `src/infrastructure/SequelizePersistence/models/NewEntityModel.ts`
5. **Migration** → `src/infrastructure/SequelizePersistence/migrations/YYYYMMDD-create-new-entity.js`
6. **Persistence service** → implements both Loader + Persistor → maps model ↔ entity
7. **DI token** → add `export const NewEntityPersistenceS = Symbol('new-entity-persistence')` to `tokens.ts`
8. **Register** → add `{ provide: NewEntityPersistenceS, useClass: ... }` in `coreadapter.module.ts`
9. **Wire** → map in `coreadapter.service.ts` → add to `initUseCases()` deps
10. **Use cases** → create command/query files with factory pattern
11. **DTOs** → `src/gateways/http/dto/NewEntityDTO.ts` with class-validator + Swagger
12. **Controller** → `src/gateways/http/new-entity.controller.ts`
13. **Register controller** → add to `http.module.ts`

### The Golden Rules

1. **Core layer has ZERO framework dependencies** — only pure TypeScript
2. **Controllers are thin** — they map DTO → UC input, call `this.useCases.commands/queries.xxx()`, return result
3. **All data flows through gateway interfaces** — never import Sequelize models in core
4. **Use factory functions for use cases** — not classes
5. **Branch isolation is mandatory** — always use `branchId` from JWT, never trust client-sent values
6. **All mutations are audited** — log every status change in audit trail tables
7. **Single DI wiring point** — `coreadapter.service.ts` is the only place that maps infra → core
8. **DTOs are fully decorated** — every field needs Swagger + class-validator decorators
9. **Swagger documentation is required** — all endpoints must be documented via decorators
10. **Errors are domain-specific** — use `BaseError` subclasses, not raw `HttpException`

---

## 9. How to Use This Reference

When starting a new project or onboarding an AI assistant, paste this document as context and say:

> "Follow the code standards defined in this reference. Use Clean Architecture with the factory function pattern for use cases, Loader/Persistor gateways, Symbol-based DI tokens, and the exact file/folder structure described. All new code must follow these conventions."

For domain-specific business logic, create a separate document (like `DEV_KT.md`) with your entities, enums, state machines, and business rules.
