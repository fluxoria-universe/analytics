# Tasks: [FEATURE NAME]

**Input**: Design documents from `/specs/[###-feature-name]/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → If not found: ERROR "No implementation plan found"
   → Extract: tech stack, libraries, structure
2. Load optional design documents:
   → data-model.md: Extract entities → model tasks
   → contracts/: Each file → contract test task
   → research.md: Extract decisions → setup tasks
3. Generate tasks by category:
   → Setup: project init, dependencies, linting
   → Tests: contract tests, integration tests
   → Core: models, services, CLI commands
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
   → All endpoints implemented?
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Single project**: `src/`, `tests/` at repository root
- **Web app**: `backend/src/`, `frontend/src/`
- **Mobile**: `api/src/`, `ios/src/` or `android/src/`
- Paths shown below assume single project - adjust based on plan.md structure

## Phase 3.1: Setup
- [ ] T001 Create project structure per implementation plan
- [ ] T002 Initialize [language] project with [framework] dependencies
- [ ] T003 [P] Configure linting and formatting tools

## Phase 3.2: GraphQL Schema & Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: Schema and tests MUST be written and MUST FAIL before ANY implementation**
- [ ] T004 [P] GraphQL schema definition in src/graphql/schema.graphql
- [ ] T005 [P] Contract test for GraphQL queries in tests/contract/test_queries.py
- [ ] T006 [P] Contract test for GraphQL mutations in tests/contract/test_mutations.py
- [ ] T007 [P] Integration test for real-time subscriptions in tests/integration/test_subscriptions.py
- [ ] T008 [P] Security contract tests in tests/contract/test_security.py

## Phase 3.3: Core Implementation (ONLY after schema and tests are failing)
- [ ] T009 [P] Onchain data models with Merkle validation in src/models/onchain/
- [ ] T010 [P] GraphQL resolvers with DataLoader optimization in src/graphql/resolvers/
- [ ] T011 [P] Real-time subscription handlers in src/services/subscription_service.py
- [ ] T012 [P] JWT authentication service in src/services/auth_service.py
- [ ] T013 [P] Redis caching layer in src/services/cache_service.py
- [ ] T014 Input validation and sanitization
- [ ] T015 Error handling and structured logging

## Phase 3.4: Integration & Security
- [ ] T016 Connect to blockchain data sources
- [ ] T017 Implement WebSocket subscription middleware
- [ ] T018 JWT authorization middleware with RBAC
- [ ] T019 Rate limiting and API key management
- [ ] T020 CORS and security headers configuration

## Phase 3.5: Performance & Quality Assurance
- [ ] T021 [P] Unit tests for business logic in tests/unit/
- [ ] T022 Performance benchmarks (<100ms p95 for GraphQL queries)
- [ ] T023 Load testing for real-time subscriptions
- [ ] T024 [P] Update GraphQL API documentation
- [ ] T025 Code coverage analysis (>90% target)
- [ ] T026 Run integration test suite

## Dependencies
- Schema and tests (T004-T008) before implementation (T009-T015)
- T009 blocks T010, T016
- T012 blocks T018
- Implementation before performance & QA (T021-T026)

## Parallel Example
```
# Launch T004-T008 together (GraphQL schema and contract tests):
Task: "GraphQL schema definition in src/graphql/schema.graphql"
Task: "Contract test for GraphQL queries in tests/contract/test_queries.py"
Task: "Contract test for GraphQL mutations in tests/contract/test_mutations.py"
Task: "Integration test for real-time subscriptions in tests/integration/test_subscriptions.py"
Task: "Security contract tests in tests/contract/test_security.py"
```

## Notes
- [P] tasks = different files, no dependencies
- Verify tests fail before implementing
- Commit after each task
- Avoid: vague tasks, same file conflicts

## Task Generation Rules
*Applied during main() execution*

1. **From Contracts**:
   - Each contract file → contract test task [P]
   - Each endpoint → implementation task
   
2. **From Data Model**:
   - Each entity → model creation task [P]
   - Relationships → service layer tasks
   
3. **From User Stories**:
   - Each story → integration test [P]
   - Quickstart scenarios → validation tasks

4. **Ordering**:
   - Setup → Tests → Models → Services → Endpoints → Polish
   - Dependencies block parallel execution

## Validation Checklist
*GATE: Checked by main() before returning*

- [ ] GraphQL schema defined before resolvers
- [ ] All GraphQL operations have contract tests
- [ ] Onchain data models include Merkle validation
- [ ] Real-time subscriptions have integration tests
- [ ] Security middleware implemented for all endpoints
- [ ] All tests come before implementation (TDD compliance)
- [ ] Parallel tasks truly independent
- [ ] Each task specifies exact file path
- [ ] No task modifies same file as another [P] task
- [ ] Performance benchmarks defined for GraphQL queries