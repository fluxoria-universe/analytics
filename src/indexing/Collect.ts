import ponder from 'ponder';

export const Collect = ponder.createIndexingFunction({
  id: 'Collect',
  event: 'Collect',
  handler: async ({ event, context }) => {
    const { CollectEvent, Pool } = context.entities;

    // Verify pool exists
    const pool = await Pool.findUnique({
      id: event.srcAddress,
    });

    if (!pool) {
      console.warn(`Pool ${event.srcAddress} not found for Collect event`);
      return;
    }

    // Create collect event record
    await CollectEvent.create({
      id: `${event.transaction.hash}-${event.log.logIndex}`,
      data: {
        poolId: event.srcAddress,
        owner: event.args.owner,
        recipient: event.args.recipient,
        tickLower: event.args.tickLower,
        tickUpper: event.args.tickUpper,
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
