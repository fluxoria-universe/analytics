
# Implementation Plan: Flux-sight GraphQL API for DEX Onchain Indexing

**Branch**: `001-build-flux-sight` | **Date**: 2025-10-04 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/Users/chidx/Documents/Learn/analytics/specs/001-build-flux-sight/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from file system structure or context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code, or `AGENTS.md` for all other agents).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
Flux-sight is a GraphQL API application for indexing and querying onchain data from DEX smart contracts. The system allows operators to configure which DEX contract to index, then continuously processes blockchain events (PoolCreated, Initialize, Swap, ModifyPosition, Collect) and exposes them via authenticated GraphQL queries with filtering, sorting, and pagination. The technical approach leverages Ponder.sh as the indexing framework, PostgreSQL for persistent storage, Redis for caching frequently accessed data, and implements JWT-based authentication for multiple concurrent clients.

## Technical Context
**Language/Version**: TypeScript (latest LTS), Node.js 20.x  
**Primary Dependencies**: Ponder.sh (indexing framework), Express.js (API framework), Apollo Server (GraphQL), PostgreSQL (database), Redis (caching)  
**Storage**: PostgreSQL with TimescaleDB extension for time-series onchain data, Redis for query result caching  
**Testing**: Jest for unit/integration tests, GraphQL contract testing for schema validation  
**Target Platform**: Linux server (Docker containers), Ethereum mainnet blockchain indexing
**Project Type**: single (backend API service)  
**Performance Goals**: <100ms p95 for GraphQL queries, >95% cache hit ratio, 1000+ req/min per client  
**Constraints**: <100ms p95 GraphQL response, <512MB memory per service instance, handle chain reorgs up to 64 blocks  
**Scale/Scope**: Multiple DEX contracts indexing, millions of events, 100+ concurrent authenticated clients, 7-year data retention

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Compliance Gates
- [x] **GraphQL Schema Design**: Schema-first approach with clear type definitions and query optimization - Using Ponder's built-in GraphQL server with explicit schema definitions
- [x] **Onchain Data Integrity**: Immutable data handling with Merkle tree validation for blockchain data - Ponder handles reorg reconciliation, events are immutable in PostgreSQL with block hash validation
- [x] **API Security**: JWT authentication, input validation, and rate limiting implemented - Custom Express middleware for JWT auth, GraphQL schema validation, rate limiting per API key
- [x] **Performance Optimization**: Redis caching and horizontal scaling patterns identified - Redis for hot query results, DataLoader pattern for batching, cursor-based pagination
- [x] **Component Reusability**: SOLID principles applied with dependency injection containers - Modular service layer (auth, cache, indexing), interface-driven design for extensibility
- [x] **Testing Discipline**: TDD approach with contract testing for GraphQL APIs planned - Jest for TDD workflow, GraphQL schema contract tests, integration tests for end-to-end flows

## Project Structure

### Documentation (this feature)
```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
/
├── ponder.config.ts        # Ponder configuration (chains, contracts)
├── ponder.schema.ts        # Database schema definitions
├── abis/                   # Smart contract ABIs
│   └── UniswapV3Pool.json
├── src/
│   ├── indexing/           # Ponder indexing functions
│   │   ├── PoolCreated.ts
│   │   ├── Initialize.ts
│   │   ├── Swap.ts
│   │   ├── ModifyPosition.ts
│   │   └── Collect.ts
│   ├── services/           # Business logic services
│   │   ├── auth/
│   │   │   ├── JWTService.ts
│   │   │   └── APIKeyService.ts
│   │   ├── cache/
│   │   │   └── RedisCache.ts
│   │   └── tvl/
│   │       └── TVLCalculator.ts
│   ├── middleware/         # Express middleware
│   │   ├── authentication.ts
│   │   ├── rateLimit.ts
│   │   └── errorHandler.ts
│   ├── graphql/            # GraphQL extensions
│   │   ├── resolvers/
│   │   └── directives/
│   └── types/              # TypeScript type definitions
│       ├── contracts.ts
│       └── api.ts
├── tests/
│   ├── contract/           # GraphQL schema contract tests
│   │   ├── poolQueries.test.ts
│   │   ├── swapQueries.test.ts
│   │   └── authFlow.test.ts
│   ├── integration/        # End-to-end integration tests
│   │   ├── indexing.test.ts
│   │   └── caching.test.ts
│   └── unit/               # Unit tests for services
│       ├── auth.test.ts
│       ├── cache.test.ts
│       └── tvl.test.ts
├── migrations/             # Database migrations
└── docker/                 # Docker configuration
    ├── Dockerfile
    └── docker-compose.yml
```

**Structure Decision**: Single backend API service structure. Ponder.sh provides the indexing framework with built-in GraphQL server. Custom Express middleware layers on top for authentication and caching. The `src/indexing/` directory contains Ponder-specific event handlers, while `src/services/` houses reusable business logic following SOLID principles. Tests are organized by type (contract, integration, unit) to support TDD workflow.

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:
   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per endpoint
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   - Run `.specify/scripts/bash/update-agent-context.sh cursor`
     **IMPORTANT**: Execute it exactly as specified above. Do not add or remove any arguments.
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Each contract → contract test task [P]
- Each entity → model creation task [P] 
- Each user story → integration test task
- Implementation tasks to make tests pass

**Ordering Strategy**:
- TDD order: Tests before implementation 
- Dependency order: Models before services before UI
- Mark [P] for parallel execution (independent files)

**Estimated Output**: 25-30 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) - research.md generated
- [x] Phase 1: Design complete (/plan command) - data-model.md, contracts/schema.graphql, quickstart.md generated
- [x] Phase 2: Task planning complete (/plan command - describe approach only) - See Phase 2 section above
- [ ] Phase 3: Tasks generated (/tasks command) - Ready for /tasks
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS - All 6 principles aligned with design
- [x] Post-Design Constitution Check: PASS - No new violations introduced
- [x] All NEEDS CLARIFICATION resolved - See research.md
- [x] Complexity deviations documented - No deviations, design follows constitutional principles

**Artifacts Generated**:
- `/Users/chidx/Documents/Learn/analytics/specs/001-build-flux-sight/research.md` - Technical decisions and NEEDS CLARIFICATION resolutions
- `/Users/chidx/Documents/Learn/analytics/specs/001-build-flux-sight/data-model.md` - Database entities, relationships, and Ponder schema mapping
- `/Users/chidx/Documents/Learn/analytics/specs/001-build-flux-sight/contracts/schema.graphql` - GraphQL API schema with queries, mutations, types
- `/Users/chidx/Documents/Learn/analytics/specs/001-build-flux-sight/quickstart.md` - 9 end-to-end test scenarios with validation criteria
- `/Users/chidx/Documents/Learn/analytics/.cursor/rules/specify-rules.mdc` - Updated agent context

---
*Based on Constitution v1.0.0 - See `/memory/constitution.md`*
