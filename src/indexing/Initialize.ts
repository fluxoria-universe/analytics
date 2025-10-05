import { ponder } from '@ponder/core';

export const Initialize = ponder.createIndexingFunction({
  id: 'Initialize',
  event: 'Initialize',
  handler: async ({ event, context }) => {
    const { InitializeEvent, Pool } = context.entities;

    // Verify pool exists
    const pool = await Pool.findUnique({
      id: event.srcAddress,
    });

    if (!pool) {
      console.warn(`Pool ${event.srcAddress} not found for Initialize event`);
      return;
    }

    // Create initialize event record
    await InitializeEvent.create({
      id: `${event.transaction.hash}-${event.log.logIndex}`,
      data: {
        poolId: event.srcAddress,
        sqrtPriceX96: event.args.sqrtPriceX96,
        tick: event.args.tick,
        blockNumber: BigInt(event.block.number),
        blockHash: event.block.hash,
        timestamp: BigInt(event.block.timestamp),
        transactionHash: event.transaction.hash,
        logIndex: event.log.logIndex,
      },
    });
  },
});
