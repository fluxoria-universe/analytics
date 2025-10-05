import { ponder } from '@ponder/core';

export const Swap = ponder.createIndexingFunction({
  id: 'Swap',
  event: 'Swap',
  handler: async ({ event, context }) => {
    const { SwapEvent, Pool } = context.entities;

    // Verify pool exists
    const pool = await Pool.findUnique({
      id: event.srcAddress,
    });

    if (!pool) {
      console.warn(`Pool ${event.srcAddress} not found for Swap event`);
      return;
    }

    // Create swap event record
    await SwapEvent.create({
      id: `${event.transaction.hash}-${event.log.logIndex}`,
      data: {
        poolId: event.srcAddress,
        sender: event.args.sender,
        recipient: event.args.recipient,
        amount0: event.args.amount0,
        amount1: event.args.amount1,
        sqrtPriceX96: event.args.sqrtPriceX96,
        liquidity: event.args.liquidity,
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
