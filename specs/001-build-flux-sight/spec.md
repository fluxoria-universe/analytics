# Feature Specification: Flux-sight: GraphQL API for DEX Onchain Indexing

**Feature Branch**: `001-build-flux-sight`  
**Created**: 2025-10-04  
**Status**: Draft  
**Input**: User description: "Build Flux-sight, a GraphQL API application that index onchain data from a DEX smart contract. It can set a DEX smart contract that want to be indexed. The GraphQL API should have authentication mechanism since it will be consumed with more than one client. The GraphQL API should have queries to track: PoolCreated (discover new pools), Initialize (record the starting price of each pool), Swap (capture all trades: price & volume), ModifyPosition (log liquidity added or removed), and Collect (track liquidity/fees withdrawn to calculate TVL changes)."

## Execution Flow (main)
```
1. Parse user description from Input
   → If empty: ERROR "No feature description provided"
2. Extract key concepts from description
   → Identify: actors, actions, data, constraints
3. For each unclear aspect:
   → Mark with [NEEDS CLARIFICATION: specific question]
4. Fill User Scenarios & Testing section
   → If no clear user flow: ERROR "Cannot determine user scenarios"
5. Generate Functional Requirements
   → Each requirement must be testable
   → Mark ambiguous requirements
6. Identify Key Entities (if data involved)
7. Run Review Checklist
   → If any [NEEDS CLARIFICATION]: WARN "Spec has uncertainties"
   → If implementation details found: ERROR "Remove tech details"
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

### Section Requirements
- **Mandatory sections**: Must be completed for every feature
- **Optional sections**: Include only when relevant to the feature
- When a section doesn't apply, remove it entirely (don't leave as "N/A")

### For AI Generation
When creating this spec from a user prompt:
1. **Mark all ambiguities**: Use [NEEDS CLARIFICATION: specific question] for any assumption you'd need to make
2. **Don't guess**: If the prompt doesn't specify something (e.g., "login system" without auth method), mark it
3. **Think like a tester**: Every vague requirement should fail the "testable and unambiguous" checklist item
4. **Common underspecified areas**:
   - User types and permissions
   - Data retention/deletion policies  
   - Performance targets and scale
   - Error handling behaviors
   - Integration requirements
   - Security/compliance needs

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

### Section Requirements
- **Mandatory sections**: Must be completed for every feature
- **Optional sections**: Include only when relevant to the feature
- When a section doesn't apply, remove it entirely (don't leave as "N/A")

### For AI Generation
When creating this spec from a user prompt:
1. **Mark all ambiguities**: Use [NEEDS CLARIFICATION: specific question] for any assumption you'd need to make
2. **Don't guess**: If the prompt doesn't specify something (e.g., "login system" without auth method), mark it
3. **Think like a tester**: Every vague requirement should fail the "testable and unambiguous" checklist item
4. **Common underspecified areas**:
   - User types and permissions
   - Data retention/deletion policies  
   - Performance targets and scale
   - Error handling behaviors
   - Integration requirements
   - Security/compliance needs

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
As a platform operator, I want to configure which DEX smart contract address is indexed so that clients can authenticate and query onchain events and derived metrics (new pools, starting prices, trades, liquidity changes, and TVL changes) via a single GraphQL API.

### Acceptance Scenarios
1. **Given** no DEX contract is configured, **When** the operator sets a valid DEX contract address to index, **Then** the system registers the contract and begins indexing from a defined starting point [NEEDS CLARIFICATION: specific start block/time].
2. **Given** indexing is active, **When** a PoolCreated event occurs on the configured DEX, **Then** the new pool becomes discoverable via the API with its identifiers and metadata (token pair and fee tier) retrievable.
3. **Given** a pool is initialized, **When** an Initialize event is processed, **Then** the pool’s starting price is recorded and is queryable for that pool.
4. **Given** swaps occur in a tracked pool, **When** Swap events are processed, **Then** clients can query a paginated, time-filtered list of trades including price and volume for each trade.
5. **Given** a liquidity change, **When** ModifyPosition events are processed, **Then** clients can query liquidity added or removed with the affected pool and position details.
6. **Given** fees are withdrawn, **When** Collect events are processed, **Then** the system updates TVL-related metrics and clients can query TVL changes associated with the withdrawal.
7. **Given** a client without valid authentication, **When** they attempt to query any API endpoint, **Then** access is denied with an authentication error.
8. **Given** a client with valid authentication, **When** they query any of the supported event datasets with filters (pool, time range, block range), **Then** the results are returned correctly with accurate counts and pagination cursors.

### Edge Cases
- Invalid DEX contract address is provided (wrong format or not deployed) → configuration is rejected with a clear error.
- Chain reorganizations (reorgs) cause previously indexed events to change → previously served data must be corrected to reflect canonical chain state [NEEDS CLARIFICATION: reorg depth handling].
- Very high event throughput (bursty swaps) → queries must remain available and return within performance targets [NEEDS CLARIFICATION: target throughput].
- Duplicate or missing events discovered during backfill → system reconciles gaps and deduplicates without client-visible inconsistencies.
- Large result sets (multi-day queries) → pagination must work predictably with stable cursors.
- Contract is switched to a new address → indexing transitions without losing continuity; clients can still query historical data for the old address.
- Time zone and clock skew in timestamps → timestamps are consistently represented in UTC.
- Exceeding query rate/quota → requests are throttled and return informative errors [NEEDS CLARIFICATION: quotas per client].

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: System MUST allow an operator to configure the DEX smart contract address to be indexed (create, update, read configuration).
- **FR-002**: System MUST index onchain events from the configured DEX contract: PoolCreated, Initialize, Swap, ModifyPosition, and Collect.
- **FR-003**: System MUST expose GraphQL queries for retrieving each event type with filters for pool identifier, transaction hash, time range, and block range, with sorting and pagination.
- **FR-004**: System MUST require authenticated access for all queries; multiple client applications must be supported concurrently [NEEDS CLARIFICATION: auth method and roles].
- **FR-005**: System MUST record and expose the starting price per pool derived from Initialize events.
- **FR-006**: System MUST capture and expose trade details (price and volume) for Swap events, with the ability to filter by pool and time range.
- **FR-007**: System MUST log liquidity added/removed for ModifyPosition events and make this data queryable per pool and position.
- **FR-008**: System MUST track fees withdrawn via Collect events and surface resulting TVL changes per pool.
- **FR-009**: System MUST support historical backfill from a specified starting block/time and continuous indexing thereafter [NEEDS CLARIFICATION: default start point].
- **FR-010**: System MUST ensure data correctness across chain reorganizations by reconciling affected events [NEEDS CLARIFICATION: maximum reorg depth supported].
- **FR-011**: System MUST provide consistent pagination (cursor-based) for large result sets.
- **FR-012**: System MUST enforce request limits per authenticated client [NEEDS CLARIFICATION: rate/quota policy].
- **FR-013**: System SHOULD provide near-real-time access to new events as they are indexed [NEEDS CLARIFICATION: whether real-time subscriptions are in-scope].

*Example of marking unclear requirements:*
- **FR-AUTH**: System MUST authenticate clients via [NEEDS CLARIFICATION: token format and provisioning process].
- **FR-RETENTION**: System MUST retain indexed data for [NEEDS CLARIFICATION: retention period and GDPR/PII applicability].
- **FR-SCOPE**: System MUST support chain/network(s): [NEEDS CLARIFICATION: which blockchain(s) and chain IDs].
- **FR-DEX**: System MUST target DEX variant: [NEEDS CLARIFICATION: e.g., Uniswap v2/v3 or specific protocol].

### Key Entities *(include if feature involves data)*
- **DEXContract**: Represents the configured DEX to index; attributes include address, chainId, startBlock/startTime, status, configuredAt.
- **Pool**: A liquidity pool discovered from PoolCreated; attributes include poolId, tokenA, tokenB, feeTier, createdAt (block/time).
- **InitializeEvent**: Starting price record for a pool; attributes include poolId, startingPrice, txHash, blockNumber, timestamp.
- **SwapEvent**: Trade record; attributes include poolId, price, volume (token amounts), txHash, blockNumber, timestamp.
- **ModifyPositionEvent**: Liquidity change record; attributes include poolId, positionId/owner, liquidityDelta, txHash, blockNumber, timestamp.
- **CollectEvent**: Fees/liquidity withdrawal; attributes include poolId, amountTokenA, amountTokenB, recipient, txHash, blockNumber, timestamp.
- **TVLRecord**: Derived metric capturing pool TVL and delta over time; attributes include poolId, tvlValue, tvlDelta, computedAt.
- **ClientApplication**: An API consumer; attributes include clientId, displayName, status, quota.

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [ ] No implementation details (languages, frameworks, APIs)
- [ ] Focused on user value and business needs
- [ ] Written for non-technical stakeholders
- [ ] All mandatory sections completed

### Requirement Completeness
- [ ] No [NEEDS CLARIFICATION] markers remain
- [ ] Requirements are testable and unambiguous  
- [ ] Success criteria are measurable
- [ ] Scope is clearly bounded
- [ ] Dependencies and assumptions identified

---

## Execution Status
*Updated by main() during processing*

- [ ] User description parsed
- [ ] Key concepts extracted
- [ ] Ambiguities marked
- [ ] User scenarios defined
- [ ] Requirements generated
- [ ] Entities identified
- [ ] Review checklist passed

---
