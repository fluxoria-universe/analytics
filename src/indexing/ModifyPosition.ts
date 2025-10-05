import { ponder } from '@ponder/core';

export const ModifyPosition = ponder.createIndexingFunction({
  id: 'ModifyPosition',
  event: 'ModifyPosition',
  handler: async ({ event, context }) => {
    const { ModifyPositionEvent, Pool } = context.entities;

    // Verify pool exists
    const pool = await Pool.findUnique({
      id: event.srcAddress,
    });

    if (!pool) {
      console.warn(`Pool ${event.srcAddress} not found for ModifyPosition event`);
      return;
    }

    // Create modify position event record
    await ModifyPositionEvent.create({
      id: `${event.transaction.hash}-${event.log.logIndex}`,
      data: {
        poolId: event.srcAddress,
        owner: event.args.owner,
        tickLower: event.args.tickLower,
        tickUpper: event.args.tickUpper,
        liquidityDelta: event.args.liquidityDelta,
        amount0: event.args.amount0,
        amount1: event.args.amount1,
        blockNumber: BigInt(event.block.number),
        blockHash: event.block.hash,
        timestamp: BigInt(event.block.timestamp),
        transactionHash: event.transaction.hash,
        logIndex: event.log.logIndex,
      },
    });
  },
});
