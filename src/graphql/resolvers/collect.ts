import { Resolver, FieldResolver, Root, Ctx } from 'type-graphql';
import { CollectEvent, Pool } from '../../types/contracts';
import { GraphQLContext } from '../../types/api';

@Resolver(CollectEvent)
export class CollectResolver {
  /**
   * Get pool for a collect event
   */
  @FieldResolver(() => Pool)
  async pool(
    @Root() collect: CollectEvent,
    @Ctx() _context: GraphQLContext
  ): Promise<Pool> {
    // This would query the database through Ponder
    return {
      id: collect.poolId,
      dexContractId: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
      tokenA: '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C',
      tokenB: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      feeTier: 3000,
      tickSpacing: 60,
      blockNumber: collect.blockNumber,
      blockHash: collect.blockHash,
      timestamp: collect.timestamp,
      transactionHash: collect.transactionHash,
    };
  }
}
