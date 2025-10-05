import { Resolver, Query, Arg, FieldResolver, Root, Ctx } from 'type-graphql';
import { TVLRecord, Pool } from '../../types/contracts';
import { GraphQLContext } from '../../types/api';

@Resolver(TVLRecord)
export class TVLResolver {
  /**
   * Get aggregate TVL across all pools
   */
  @Query(() => Number)
  async aggregateTVL(
    @Ctx() _context: GraphQLContext,
    @Arg('timestamp', { nullable: true }) _timestamp?: string
  ): Promise<number> {
    // This would query the database through Ponder
    // For now, return mock data
    return 1000000.50; // $1M TVL
  }

  /**
   * Get pool for a TVL record
   */
  @FieldResolver(() => Pool)
  async pool(
    @Root() tvlRecord: TVLRecord,
    @Ctx() _context: GraphQLContext
  ): Promise<Pool> {
    // This would query the database through Ponder
    return {
      id: tvlRecord.poolId,
      dexContractId: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
      tokenA: '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C',
      tokenB: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      feeTier: 3000,
      tickSpacing: 60,
      blockNumber: tvlRecord.blockNumber,
      blockHash: '0x1234567890abcdef',
      timestamp: tvlRecord.computedAt,
      transactionHash: '0xabcdef1234567890',
    };
  }
}
