import { ponder } from "ponder:registry";
import schema from "ponder:schema";

// =============================================================================
// FLUXORIA PREDICTION MARKET CONTRACT EVENT HANDLERS
// =============================================================================

// Emergency Events
ponder.on("BaseContract:EmergencyPaused", async ({ event, context }) => {
  await context.db.insert(schema.emergencyPaused).values({
    id: event.id,
    by: event.args.by,
    blockNumber: BigInt(event.block.number),
    transactionHash: event.transaction.hash,
    timestamp: BigInt(event.block.timestamp),
  });
});

ponder.on("BaseContract:EmergencyUnpaused", async ({ event, context }) => {
  await context.db.insert(schema.emergencyUnpaused).values({
    id: event.id,
    by: event.args.by,
    blockNumber: BigInt(event.block.number),
    transactionHash: event.transaction.hash,
    timestamp: BigInt(event.block.timestamp),
  });
});

// Insurance Fund Events
ponder.on("BaseContract:InsuranceFundDeposit", async ({ event, context }) => {
  await context.db.insert(schema.insuranceFundDeposits).values({
    id: event.id,
    amount: event.args.amount,
    newTotal: event.args.newTotal,
    blockNumber: BigInt(event.block.number),
    transactionHash: event.transaction.hash,
    timestamp: BigInt(event.block.timestamp),
  });
});

ponder.on("BaseContract:InsuranceFundWithdraw", async ({ event, context }) => {
  await context.db.insert(schema.insuranceFundWithdraws).values({
    id: event.id,
    amount: event.args.amount,
    newTotal: event.args.newTotal,
    blockNumber: BigInt(event.block.number),
    transactionHash: event.transaction.hash,
    timestamp: BigInt(event.block.timestamp),
  });
});

ponder.on("BaseContract:InsuranceFundFeeUpdated", async ({ event, context }) => {
  await context.db.insert(schema.insuranceFundFeeUpdates).values({
    id: event.id,
    oldFee: event.args.oldFee,
    newFee: event.args.newFee,
    blockNumber: BigInt(event.block.number),
    transactionHash: event.transaction.hash,
    timestamp: BigInt(event.block.timestamp),
  });
});

// Liquidation Parameter Updates
ponder.on("BaseContract:LiquidationPenaltyUpdated", async ({ event, context }) => {
  await context.db.insert(schema.liquidationPenaltyUpdates).values({
    id: event.id,
    oldPenalty: event.args.oldPenalty,
    newPenalty: event.args.newPenalty,
    blockNumber: BigInt(event.block.number),
    transactionHash: event.transaction.hash,
    timestamp: BigInt(event.block.timestamp),
  });
});

ponder.on("BaseContract:LiquidationThresholdUpdated", async ({ event, context }) => {
  await context.db.insert(schema.liquidationThresholdUpdates).values({
    id: event.id,
    oldThreshold: event.args.oldThreshold,
    newThreshold: event.args.newThreshold,
    blockNumber: BigInt(event.block.number),
    transactionHash: event.transaction.hash,
    timestamp: BigInt(event.block.timestamp),
  });
});

ponder.on("BaseContract:WarningThresholdUpdated", async ({ event, context }) => {
  await context.db.insert(schema.warningThresholdUpdates).values({
    id: event.id,
    oldThreshold: event.args.oldThreshold,
    newThreshold: event.args.newThreshold,
    blockNumber: BigInt(event.block.number),
    transactionHash: event.transaction.hash,
    timestamp: BigInt(event.block.timestamp),
  });
});

ponder.on("BaseContract:MinPositionSizeUpdated", async ({ event, context }) => {
  await context.db.insert(schema.minPositionSizeUpdates).values({
    id: event.id,
    oldSize: event.args.oldSize,
    newSize: event.args.newSize,
    blockNumber: BigInt(event.block.number),
    transactionHash: event.transaction.hash,
    timestamp: BigInt(event.block.timestamp),
  });
});

// Market Events
ponder.on("BaseContract:MarketCreated", async ({ event, context }) => {
  await context.db.insert(schema.marketsCreated).values({
    id: event.id,
    marketId: event.args.marketId,
    question: event.args.question,
    resolutionTime: event.args.resolutionTime,
    conditionalTokensContract: event.args.conditionalTokensContract,
    blockNumber: BigInt(event.block.number),
    transactionHash: event.transaction.hash,
    timestamp: BigInt(event.block.timestamp),
  });
});

ponder.on("BaseContract:MarketResolved", async ({ event, context }) => {
  await context.db.insert(schema.marketsResolved).values({
    id: event.id,
    marketId: event.args.marketId,
    finalPrice: event.args.finalPrice,
    totalVolume: event.args.totalVolume,
    blockNumber: BigInt(event.block.number),
    transactionHash: event.transaction.hash,
    timestamp: BigInt(event.block.timestamp),
  });
});

// Position Events
ponder.on("BaseContract:PositionOpened", async ({ event, context }) => {
  await context.db.insert(schema.positionsOpened).values({
    id: event.id,
    user: event.args.user,
    side: Number(event.args.side), // Convert enum to number
    size: event.args.size,
    collateral: event.args.collateral,
    price: event.args.price,
    leverage: event.args.leverage,
    marketId: event.args.marketId,
    outcome: event.args.outcome,
    blockNumber: BigInt(event.block.number),
    transactionHash: event.transaction.hash,
    timestamp: BigInt(event.block.timestamp),
  });
});

ponder.on("BaseContract:PositionClosed", async ({ event, context }) => {
  await context.db.insert(schema.positionsClosed).values({
    id: event.id,
    user: event.args.user,
    realizedPnl: event.args.realizedPnl,
    finalCollateral: event.args.finalCollateral,
    marketId: event.args.marketId,
    blockNumber: BigInt(event.block.number),
    transactionHash: event.transaction.hash,
    timestamp: BigInt(event.block.timestamp),
  });
});

ponder.on("BaseContract:PartialPositionClosed", async ({ event, context }) => {
  await context.db.insert(schema.partialPositionsClosed).values({
    id: event.id,
    user: event.args.user,
    marketId: event.args.marketId,
    closedAmount: event.args.closedAmount,
    realizedPnl: event.args.realizedPnl,
    remainingSize: event.args.remainingSize,
    blockNumber: BigInt(event.block.number),
    transactionHash: event.transaction.hash,
    timestamp: BigInt(event.block.timestamp),
  });
});

ponder.on("BaseContract:PositionLiquidated", async ({ event, context }) => {
  await context.db.insert(schema.positionsLiquidated).values({
    id: event.id,
    user: event.args.user,
    marketId: event.args.marketId,
    collateralLost: event.args.collateralLost,
    liquidationPenalty: event.args.liquidationPenalty,
    blockNumber: BigInt(event.block.number),
    transactionHash: event.transaction.hash,
    timestamp: BigInt(event.block.timestamp),
  });
});

ponder.on("BaseContract:PositionHealthWarning", async ({ event, context }) => {
  await context.db.insert(schema.positionHealthWarnings).values({
    id: event.id,
    user: event.args.user,
    marketId: event.args.marketId,
    healthPercentage: event.args.healthPercentage,
    currentPrice: event.args.currentPrice,
    blockNumber: BigInt(event.block.number),
    transactionHash: event.transaction.hash,
    timestamp: BigInt(event.block.timestamp),
  });
});

// Trading Events
ponder.on("BaseContract:TokensTraded", async ({ event, context }) => {
  await context.db.insert(schema.tokensTraded).values({
    id: event.id,
    user: event.args.user,
    marketId: event.args.marketId,
    outcome: event.args.outcome,
    amount: event.args.amount,
    isBuy: event.args.isBuy,
    blockNumber: BigInt(event.block.number),
    transactionHash: event.transaction.hash,
    timestamp: BigInt(event.block.timestamp),
  });
});

// Contract State Events
ponder.on("BaseContract:Paused", async ({ event, context }) => {
  await context.db.insert(schema.contractPaused).values({
    id: event.id,
    account: event.args.account,
    blockNumber: BigInt(event.block.number),
    transactionHash: event.transaction.hash,
    timestamp: BigInt(event.block.timestamp),
  });
});

ponder.on("BaseContract:Unpaused", async ({ event, context }) => {
  await context.db.insert(schema.contractUnpaused).values({
    id: event.id,
    account: event.args.account,
    blockNumber: BigInt(event.block.number),
    transactionHash: event.transaction.hash,
    timestamp: BigInt(event.block.timestamp),
  });
});

// Ownership Events
ponder.on("BaseContract:OwnershipTransferred", async ({ event, context }) => {
  await context.db.insert(schema.ownershipTransferred).values({
    id: event.id,
    previousOwner: event.args.previousOwner,
    newOwner: event.args.newOwner,
    blockNumber: BigInt(event.block.number),
    transactionHash: event.transaction.hash,
    timestamp: BigInt(event.block.timestamp),
  });
});

