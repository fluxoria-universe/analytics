import { ponder } from '@ponder/core';

export const DEXContract = ponder.createIndexingFunction({
  id: 'DEXContract',
  event: 'PoolCreated',
  handler: async ({ event, context }) => {
    const { Pool, DEXContract } = context.entities;

    // Get or create DEX contract record
    let dexContract = await DEXContract.findUnique({
      id: event.srcAddress,
    });

    if (!dexContract) {
      dexContract = await DEXContract.create({
        id: event.srcAddress,
        data: {
          address: event.srcAddress,
          chainId: 1, // Ethereum mainnet
          name: 'Uniswap V3 Factory',
          protocol: 'UNISWAP_V3',
          startBlock: BigInt(event.block.number),
          status: 'ACTIVE',
          configuredAt: BigInt(event.block.timestamp),
          lastIndexedBlock: BigInt(event.block.number),
        },
      });
    } else {
      // Update last indexed block
      await DEXContract.update({
        id: event.srcAddress,
        data: {
          lastIndexedBlock: BigInt(event.block.number),
        },
      });
    }

    // Create pool record
    await Pool.create({
      id: event.args.pool,
      data: {
        dexContractId: event.srcAddress,
        tokenA: event.args.token0,
        tokenB: event.args.token1,
        feeTier: event.args.fee,
        tickSpacing: event.args.tickSpacing,
        blockNumber: BigInt(event.block.number),
        blockHash: event.block.hash,
        timestamp: BigInt(event.block.timestamp),
        transactionHash: event.transaction.hash,
      },
    });
  },
});
