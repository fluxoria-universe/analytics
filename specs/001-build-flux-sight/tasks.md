# Tasks: Flux-sight GraphQL API for DEX Onchain Indexing

**Input**: Design documents from `/Users/chidx/Documents/Learn/analytics/specs/001-build-flux-sight/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/schema.graphql, quickstart.md

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → If not found: ERROR "No implementation plan found"
   → Extract: tech stack, libraries, structure
2. Load optional design documents:
   → data-model.md: Extract entities → model tasks
   → contracts/schema.graphql: Each query/mutation → contract test task
   → research.md: Extract decisions → setup tasks
   → quickstart.md: Extract scenarios → integration test tasks
3. Generate tasks by category:
   → Setup: project init, dependencies, linting
   → Tests: contract tests, integration tests
   → Core: models, services, indexing functions
   → Integration: DB, middleware, logging
   → Polish: unit tests, performance, docs
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness:
   → All contracts have tests?
   → All entities have models?
   → All queries implemented?
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Single project**: `src/`, `tests/` at repository root
- Paths shown below assume single project structure per plan.md

## Phase 3.1: Setup
- [x] T001 Create project structure per implementation plan
- [x] T002 Initialize TypeScript project with Ponder.sh and dependencies
- [x] T003 [P] Configure ESLint and Prettier for TypeScript
- [x] T004 [P] Setup Jest testing framework with GraphQL testing utilities
- [x] T005 [P] Create Docker Compose configuration for PostgreSQL and Redis
- [x] T006 [P] Setup environment configuration with .env.local template
- [x] T007 [P] Generate RSA key pair for JWT authentication
- [x] T008 [P] Create package.json scripts for development and production

## Phase 3.2: GraphQL Schema & Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: Schema and tests MUST be written and MUST FAIL before ANY implementation**

- [x] T009 [P] Contract test for DEXContract queries in tests/contract/test_dex_contracts.test.ts
- [x] T010 [P] Contract test for Pool queries in tests/contract/test_pool_queries.test.ts
- [x] T011 [P] Contract test for SwapEvent queries in tests/contract/test_swap_queries.test.ts
- [x] T012 [P] Contract test for ModifyPosition queries in tests/contract/test_position_queries.test.ts
- [x] T013 [P] Contract test for CollectEvent queries in tests/contract/test_collect_queries.test.ts
- [x] T014 [P] Contract test for TVL queries in tests/contract/test_tvl_queries.test.ts
- [x] T015 [P] Contract test for authentication flow in tests/contract/test_auth_flow.test.ts
- [x] T016 [P] Contract test for pagination in tests/contract/test_pagination.test.ts
- [x] T017 [P] Integration test for DEX contract configuration in tests/integration/test_dex_config.test.ts
- [x] T018 [P] Integration test for pool discovery in tests/integration/test_pool_discovery.test.ts
- [x] T019 [P] Integration test for swap tracking in tests/integration/test_swap_tracking.test.ts
- [x] T020 [P] Integration test for TVL calculation in tests/integration/test_tvl_calculation.test.ts
- [x] T021 [P] Integration test for authentication middleware in tests/integration/test_auth_middleware.test.ts
- [x] T022 [P] Integration test for caching layer in tests/integration/test_caching.test.ts

## Phase 3.3: Core Implementation (ONLY after schema and tests are failing)
- [x] T023 [P] Ponder configuration in ponder.config.ts (chains, contracts, RPC)
- [x] T024 [P] Database schema in ponder.schema.ts (8 entities with relationships)
- [x] T025 [P] Uniswap V3 Pool ABI in abis/UniswapV3Pool.json
- [x] T026 [P] DEXContract indexing function in src/indexing/DEXContract.ts
- [x] T027 [P] PoolCreated indexing function in src/indexing/PoolCreated.ts
- [x] T028 [P] Initialize indexing function in src/indexing/Initialize.ts
- [x] T029 [P] Swap indexing function in src/indexing/Swap.ts
- [x] T030 [P] ModifyPosition indexing function in src/indexing/ModifyPosition.ts
- [x] T031 [P] Collect indexing function in src/indexing/Collect.ts
- [x] T032 [P] JWT service in src/services/auth/JWTService.ts
- [x] T033 [P] API key service in src/services/auth/APIKeyService.ts
- [x] T034 [P] Redis cache service in src/services/cache/RedisCache.ts
- [x] T035 [P] TVL calculator service in src/services/tvl/TVLCalculator.ts
- [x] T036 [P] TypeScript type definitions in src/types/contracts.ts
- [x] T037 [P] TypeScript API types in src/types/api.ts
- [x] T038 Input validation and sanitization middleware
- [x] T039 Error handling and structured logging middleware

## Phase 3.4: Integration & Security
- [x] T040 Connect Ponder to PostgreSQL with TimescaleDB extension
- [x] T041 Connect Express to Redis for caching
- [x] T042 JWT authentication middleware in src/middleware/authentication.ts
- [x] T043 Rate limiting middleware in src/middleware/rateLimit.ts
- [x] T044 Error handling middleware in src/middleware/errorHandler.ts
- [x] T045 GraphQL resolvers for DEXContract queries in src/graphql/resolvers/dexContract.ts
- [x] T046 GraphQL resolvers for Pool queries in src/graphql/resolvers/pool.ts
- [x] T047 GraphQL resolvers for SwapEvent queries in src/graphql/resolvers/swap.ts
- [x] T048 GraphQL resolvers for ModifyPosition queries in src/graphql/resolvers/position.ts
- [x] T049 GraphQL resolvers for CollectEvent queries in src/graphql/resolvers/collect.ts
- [x] T050 GraphQL resolvers for TVL queries in src/graphql/resolvers/tvl.ts
- [x] T051 GraphQL resolvers for authentication mutations in src/graphql/resolvers/auth.ts
- [x] T052 Express server setup with Apollo GraphQL integration
- [x] T053 CORS and security headers configuration
- [x] T054 Health check endpoint implementation

## Phase 3.5: Performance & Quality Assurance
- [x] T055 [P] Unit tests for JWT service in tests/unit/test_jwt_service.test.ts
- [x] T056 [P] Unit tests for API key service in tests/unit/test_api_key_service.test.ts
- [x] T057 [P] Unit tests for Redis cache service in tests/unit/test_redis_cache.test.ts
- [x] T058 [P] Unit tests for TVL calculator in tests/unit/test_tvl_calculator.test.ts
- [x] T059 [P] Unit tests for authentication middleware in tests/unit/test_middleware.test.ts
- [x] T060 [P] Unit tests for rate limiting in tests/unit/test_middleware.test.ts
- [x] T061 Performance benchmarks for GraphQL queries (<100ms p95)
- [x] T062 Load testing for concurrent clients (100+ connections)
- [x] T063 Cache hit ratio validation (>95% target)
- [x] T064 [P] Update GraphQL API documentation
- [x] T065 [P] Create admin CLI for client management
- [x] T066 [P] Database migration scripts for TimescaleDB setup
- [x] T067 [P] Docker configuration for production deployment
- [x] T068 Code coverage analysis (>90% target)
- [x] T069 Run complete integration test suite
- [x] T070 Performance monitoring and alerting setup

## Dependencies
- Schema and tests (T009-T022) before implementation (T023-T039)
- T023-T025 blocks T026-T031 (Ponder config and schema required for indexing)
- T032-T037 blocks T042-T051 (Services required for middleware and resolvers)
- Implementation before integration (T040-T054)
- Integration before performance & QA (T055-T070)

## Parallel Example
```
# Launch T009-T022 together (GraphQL schema and contract tests):
Task: "Contract test for DEXContract queries in tests/contract/test_dex_contracts.test.ts"
Task: "Contract test for Pool queries in tests/contract/test_pool_queries.test.ts"
Task: "Contract test for SwapEvent queries in tests/contract/test_swap_queries.test.ts"
Task: "Contract test for ModifyPosition queries in tests/contract/test_position_queries.test.ts"
Task: "Contract test for CollectEvent queries in tests/contract/test_collect_queries.test.ts"
Task: "Contract test for TVL queries in tests/contract/test_tvl_queries.test.ts"
Task: "Contract test for authentication flow in tests/contract/test_auth_flow.test.ts"
Task: "Contract test for pagination in tests/contract/test_pagination.test.ts"
Task: "Integration test for DEX contract configuration in tests/integration/test_dex_config.test.ts"
Task: "Integration test for pool discovery in tests/integration/test_pool_discovery.test.ts"
Task: "Integration test for swap tracking in tests/integration/test_swap_tracking.test.ts"
Task: "Integration test for TVL calculation in tests/integration/test_tvl_calculation.test.ts"
Task: "Integration test for authentication middleware in tests/integration/test_auth_middleware.test.ts"
Task: "Integration test for caching layer in tests/integration/test_caching.test.ts"
```

## Notes
- [P] tasks = different files, no dependencies
- Verify tests fail before implementing
- Commit after each task
- Avoid: vague tasks, same file conflicts
- Follow TDD: Red → Green → Refactor cycle

## Task Generation Rules
*Applied during main() execution*

1. **From Contracts**:
   - Each GraphQL query/mutation → contract test task [P]
   - Each resolver → implementation task
   
2. **From Data Model**:
   - Each entity → Ponder schema task [P]
   - Each relationship → service layer tasks
   
3. **From User Stories**:
   - Each quickstart scenario → integration test [P]
   - Each test scenario → validation tasks

4. **Ordering**:
   - Setup → Tests → Schema → Indexing → Services → Resolvers → Integration → Polish
   - Dependencies block parallel execution

## Validation Checklist
*GATE: Checked by main() before returning*

- [ ] GraphQL schema defined before resolvers
- [ ] All GraphQL operations have contract tests
- [ ] All entities have Ponder schema definitions
- [ ] All indexing functions implemented for 5 event types
- [ ] All services implemented (auth, cache, TVL)
- [ ] All tests come before implementation (TDD compliance)
- [ ] Parallel tasks truly independent
- [ ] Each task specifies exact file path
- [ ] No task modifies same file as another [P] task
- [ ] Performance benchmarks defined for GraphQL queries
- [ ] Integration tests cover all 9 quickstart scenarios
