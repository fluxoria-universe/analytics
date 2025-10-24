import { onchainTable } from "ponder";

// =============================================================================
// FLUXORIA PREDICTION MARKET CONTRACT SCHEMA
// =============================================================================

// Emergency Events
export const emergencyPaused = onchainTable("emergency_paused", (t) => ({
  id: t.text().primaryKey(),
  by: t.hex().notNull(),
  blockNumber: t.bigint().notNull(),
  transactionHash: t.hex().notNull(),
  timestamp: t.bigint().notNull(),
}));

export const emergencyUnpaused = onchainTable("emergency_unpaused", (t) => ({
  id: t.text().primaryKey(),
  by: t.hex().notNull(),
  blockNumber: t.bigint().notNull(),
  transactionHash: t.hex().notNull(),
  timestamp: t.bigint().notNull(),
}));

// Insurance Fund Events
export const insuranceFundDeposits = onchainTable("insurance_fund_deposits", (t) => ({
  id: t.text().primaryKey(),
  amount: t.bigint().notNull(),
  newTotal: t.bigint().notNull(),
  blockNumber: t.bigint().notNull(),
  transactionHash: t.hex().notNull(),
  timestamp: t.bigint().notNull(),
}));

export const insuranceFundWithdraws = onchainTable("insurance_fund_withdraws", (t) => ({
  id: t.text().primaryKey(),
  amount: t.bigint().notNull(),
  newTotal: t.bigint().notNull(),
  blockNumber: t.bigint().notNull(),
  transactionHash: t.hex().notNull(),
  timestamp: t.bigint().notNull(),
}));

export const insuranceFundFeeUpdates = onchainTable("insurance_fund_fee_updates", (t) => ({
  id: t.text().primaryKey(),
  oldFee: t.bigint().notNull(),
  newFee: t.bigint().notNull(),
  blockNumber: t.bigint().notNull(),
  transactionHash: t.hex().notNull(),
  timestamp: t.bigint().notNull(),
}));

// Liquidation Parameter Updates
export const liquidationPenaltyUpdates = onchainTable("liquidation_penalty_updates", (t) => ({
  id: t.text().primaryKey(),
  oldPenalty: t.bigint().notNull(),
  newPenalty: t.bigint().notNull(),
  blockNumber: t.bigint().notNull(),
  transactionHash: t.hex().notNull(),
  timestamp: t.bigint().notNull(),
}));

export const liquidationThresholdUpdates = onchainTable("liquidation_threshold_updates", (t) => ({
  id: t.text().primaryKey(),
  oldThreshold: t.bigint().notNull(),
  newThreshold: t.bigint().notNull(),
  blockNumber: t.bigint().notNull(),
  transactionHash: t.hex().notNull(),
  timestamp: t.bigint().notNull(),
}));

export const warningThresholdUpdates = onchainTable("warning_threshold_updates", (t) => ({
  id: t.text().primaryKey(),
  oldThreshold: t.bigint().notNull(),
  newThreshold: t.bigint().notNull(),
  blockNumber: t.bigint().notNull(),
  transactionHash: t.hex().notNull(),
  timestamp: t.bigint().notNull(),
}));

export const minPositionSizeUpdates = onchainTable("min_position_size_updates", (t) => ({
  id: t.text().primaryKey(),
  oldSize: t.bigint().notNull(),
  newSize: t.bigint().notNull(),
  blockNumber: t.bigint().notNull(),
  transactionHash: t.hex().notNull(),
  timestamp: t.bigint().notNull(),
}));

// Market Events
export const marketsCreated = onchainTable("markets_created", (t) => ({
  id: t.text().primaryKey(),
  marketId: t.bigint().notNull(),
  question: t.text().notNull(),
  resolutionTime: t.bigint().notNull(),
  conditionalTokensContract: t.hex().notNull(),
  blockNumber: t.bigint().notNull(),
  transactionHash: t.hex().notNull(),
  timestamp: t.bigint().notNull(),
}));

export const marketsResolved = onchainTable("markets_resolved", (t) => ({
  id: t.text().primaryKey(),
  marketId: t.bigint().notNull(),
  finalPrice: t.bigint().notNull(),
  totalVolume: t.bigint().notNull(),
  blockNumber: t.bigint().notNull(),
  transactionHash: t.hex().notNull(),
  timestamp: t.bigint().notNull(),
}));

// Position Events
export const positionsOpened = onchainTable("positions_opened", (t) => ({
  id: t.text().primaryKey(),
  user: t.hex().notNull(),
  side: t.integer().notNull(), // enum PositionSide
  size: t.bigint().notNull(),
  collateral: t.bigint().notNull(),
  price: t.bigint().notNull(),
  leverage: t.bigint().notNull(),
  marketId: t.bigint().notNull(),
  outcome: t.bigint().notNull(),
  blockNumber: t.bigint().notNull(),
  transactionHash: t.hex().notNull(),
  timestamp: t.bigint().notNull(),
}));

export const positionsClosed = onchainTable("positions_closed", (t) => ({
  id: t.text().primaryKey(),
  user: t.hex().notNull(),
  realizedPnl: t.bigint().notNull(),
  finalCollateral: t.bigint().notNull(),
  marketId: t.bigint().notNull(),
  blockNumber: t.bigint().notNull(),
  transactionHash: t.hex().notNull(),
  timestamp: t.bigint().notNull(),
}));

export const partialPositionsClosed = onchainTable("partial_positions_closed", (t) => ({
  id: t.text().primaryKey(),
  user: t.hex().notNull(),
  marketId: t.bigint().notNull(),
  closedAmount: t.bigint().notNull(),
  realizedPnl: t.bigint().notNull(),
  remainingSize: t.bigint().notNull(),
  blockNumber: t.bigint().notNull(),
  transactionHash: t.hex().notNull(),
  timestamp: t.bigint().notNull(),
}));

export const positionsLiquidated = onchainTable("positions_liquidated", (t) => ({
  id: t.text().primaryKey(),
  user: t.hex().notNull(),
  marketId: t.bigint().notNull(),
  collateralLost: t.bigint().notNull(),
  liquidationPenalty: t.bigint().notNull(),
  blockNumber: t.bigint().notNull(),
  transactionHash: t.hex().notNull(),
  timestamp: t.bigint().notNull(),
}));

export const positionHealthWarnings = onchainTable("position_health_warnings", (t) => ({
  id: t.text().primaryKey(),
  user: t.hex().notNull(),
  marketId: t.bigint().notNull(),
  healthPercentage: t.bigint().notNull(),
  currentPrice: t.bigint().notNull(),
  blockNumber: t.bigint().notNull(),
  transactionHash: t.hex().notNull(),
  timestamp: t.bigint().notNull(),
}));

// Trading Events
export const tokensTraded = onchainTable("tokens_traded", (t) => ({
  id: t.text().primaryKey(),
  user: t.hex().notNull(),
  marketId: t.bigint().notNull(),
  outcome: t.bigint().notNull(),
  amount: t.bigint().notNull(),
  isBuy: t.boolean().notNull(),
  blockNumber: t.bigint().notNull(),
  transactionHash: t.hex().notNull(),
  timestamp: t.bigint().notNull(),
}));

// Contract State Events
export const contractPaused = onchainTable("contract_paused", (t) => ({
  id: t.text().primaryKey(),
  account: t.hex().notNull(),
  blockNumber: t.bigint().notNull(),
  transactionHash: t.hex().notNull(),
  timestamp: t.bigint().notNull(),
}));

export const contractUnpaused = onchainTable("contract_unpaused", (t) => ({
  id: t.text().primaryKey(),
  account: t.hex().notNull(),
  blockNumber: t.bigint().notNull(),
  transactionHash: t.hex().notNull(),
  timestamp: t.bigint().notNull(),
}));

// Ownership Events
export const ownershipTransferred = onchainTable("ownership_transferred", (t) => ({
  id: t.text().primaryKey(),
  previousOwner: t.hex().notNull(),
  newOwner: t.hex().notNull(),
  blockNumber: t.bigint().notNull(),
  transactionHash: t.hex().notNull(),
  timestamp: t.bigint().notNull(),
}));