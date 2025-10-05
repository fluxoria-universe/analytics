import { DEXContractResolver } from '../../src/graphql/resolvers/dexContract';
import { PoolResolver } from '../../src/graphql/resolvers/pool';
import { SwapResolver } from '../../src/graphql/resolvers/swap';
import { TVLResolver } from '../../src/graphql/resolvers/tvl';

// Mock database connection
const mockDatabase = {
  query: jest.fn(),
  isConnected: jest.fn(),
};

// Mock Redis cache
const mockRedisCache = {
  get: jest.fn(),
  set: jest.fn(),
  getOrSet: jest.fn(),
};

// Mock TVL calculator
const mockTVLCalculator = {
  calculateTVL: jest.fn(),
  calculatePoolTVL: jest.fn(),
  calculatePositionTVL: jest.fn(),
};

jest.mock('../../src/database/connection', () => ({
  DatabaseConnection: jest.fn(() => mockDatabase),
}));

jest.mock('../../src/services/cache/RedisCache', () => ({
  RedisCache: jest.fn(() => mockRedisCache),
}));

jest.mock('../../src/services/tvl/TVLCalculator', () => ({
  TVLCalculator: jest.fn(() => mockTVLCalculator),
}));

describe('DEXContract Resolver', () => {
  let resolver: DEXContractResolver;

  beforeEach(() => {
    resolver = new DEXContractResolver();
    jest.clearAllMocks();
  });

  describe('dexContracts', () => {
    it('should return paginated DEX contracts', async () => {
      const mockContracts = [
        {
          id: '1',
          address: '0x123',
          name: 'Uniswap V3',
          isActive: true,
          createdAt: new Date('2023-01-01'),
        },
      ];

      mockDatabase.query.mockResolvedValue({
        rows: mockContracts,
        rowCount: 1,
      });

      const result = await resolver.dexContracts({}, { first: 10 });

      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        expect.arrayContaining([10])
      );
      expect(result.edges).toHaveLength(1);
      expect(result.edges[0].node.name).toBe('Uniswap V3');
    });

    it('should handle empty results', async () => {
      mockDatabase.query.mockResolvedValue({
        rows: [],
        rowCount: 0,
      });

      const result = await resolver.dexContracts({}, { first: 10 });

      expect(result.edges).toHaveLength(0);
      expect(result.pageInfo.hasNextPage).toBe(false);
    });

    it('should handle database errors', async () => {
      mockDatabase.query.mockRejectedValue(new Error('Database error'));

      await expect(resolver.dexContracts({}, { first: 10 })).rejects.toThrow('Database error');
    });
  });

  describe('dexContract', () => {
    it('should return specific DEX contract by ID', async () => {
      const mockContract = {
        id: '1',
        address: '0x123',
        name: 'Uniswap V3',
        isActive: true,
      };

      mockDatabase.query.mockResolvedValue({
        rows: [mockContract],
        rowCount: 1,
      });

      const result = await resolver.dexContract({}, { id: '1' });

      expect(result).toEqual(mockContract);
    });

    it('should return null for non-existent contract', async () => {
      mockDatabase.query.mockResolvedValue({
        rows: [],
        rowCount: 0,
      });

      const result = await resolver.dexContract({}, { id: '999' });

      expect(result).toBeNull();
    });
  });
});

describe('Pool Resolver', () => {
  let resolver: PoolResolver;

  beforeEach(() => {
    resolver = new PoolResolver();
    jest.clearAllMocks();
  });

  describe('pools', () => {
    it('should return paginated pools with caching', async () => {
      const mockPools = [
        {
          id: '1',
          address: '0xabc',
          token0: '0x123',
          token1: '0x456',
          fee: 3000,
          tickSpacing: 60,
        },
      ];

      mockRedisCache.getOrSet.mockResolvedValue({
        edges: mockPools.map(pool => ({ node: pool, cursor: pool.id })),
        pageInfo: { hasNextPage: false, endCursor: '1' },
      });

      const result = await resolver.pools({}, { first: 10 });

      expect(mockRedisCache.getOrSet).toHaveBeenCalled();
      expect(result.edges).toHaveLength(1);
    });

    it('should filter pools by DEX contract', async () => {
      mockDatabase.query.mockResolvedValue({
        rows: [],
        rowCount: 0,
      });

      await resolver.pools({}, { 
        first: 10, 
        filter: { dexContractId: '1' } 
      });

      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE dex_contract_id = $1'),
        expect.arrayContaining(['1'])
      );
    });
  });

  describe('pool', () => {
    it('should return specific pool by ID', async () => {
      const mockPool = {
        id: '1',
        address: '0xabc',
        token0: '0x123',
        token1: '0x456',
        fee: 3000,
      };

      mockDatabase.query.mockResolvedValue({
        rows: [mockPool],
        rowCount: 1,
      });

      const result = await resolver.pool({}, { id: '1' });

      expect(result).toEqual(mockPool);
    });
  });
});

describe('Swap Resolver', () => {
  let resolver: SwapResolver;

  beforeEach(() => {
    resolver = new SwapResolver();
    jest.clearAllMocks();
  });

  describe('swapEvents', () => {
    it('should return paginated swap events', async () => {
      const mockSwaps = [
        {
          id: '1',
          poolId: 'pool-1',
          sender: '0x123',
          recipient: '0x456',
          amount0: '1000000000000000000',
          amount1: '2000000000000000000',
          blockNumber: 1000,
          transactionHash: '0xabc',
        },
      ];

      mockDatabase.query.mockResolvedValue({
        rows: mockSwaps,
        rowCount: 1,
      });

      const result = await resolver.swapEvents({}, { first: 10 });

      expect(result.edges).toHaveLength(1);
      expect(result.edges[0].node.poolId).toBe('pool-1');
    });

    it('should filter by time range', async () => {
      const timeRange = {
        from: new Date('2023-01-01'),
        to: new Date('2023-01-31'),
      };

      mockDatabase.query.mockResolvedValue({
        rows: [],
        rowCount: 0,
      });

      await resolver.swapEvents({}, { 
        first: 10, 
        timeRange 
      });

      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE timestamp BETWEEN $1 AND $2'),
        expect.arrayContaining([timeRange.from, timeRange.to])
      );
    });
  });
});

describe('TVL Resolver', () => {
  let resolver: TVLResolver;

  beforeEach(() => {
    resolver = new TVLResolver();
    jest.clearAllMocks();
  });

  describe('tvlRecords', () => {
    it('should return TVL records with calculation', async () => {
      const mockCollectEvents = [
        {
          id: '1',
          poolId: 'pool-1',
          amount0: '1000000000000000000',
          amount1: '2000000000000000000',
        },
      ];

      const mockTVL = {
        poolId: 'pool-1',
        totalAmount0: '1000000000000000000',
        totalAmount1: '2000000000000000000',
        calculatedAt: new Date(),
      };

      mockDatabase.query.mockResolvedValue({
        rows: mockCollectEvents,
        rowCount: 1,
      });

      mockTVLCalculator.calculateTVL.mockReturnValue(mockTVL);

      const result = await resolver.tvlRecords({}, { first: 10 });

      expect(mockTVLCalculator.calculateTVL).toHaveBeenCalledWith(mockCollectEvents);
      expect(result.edges).toHaveLength(1);
    });

    it('should handle empty collect events', async () => {
      mockDatabase.query.mockResolvedValue({
        rows: [],
        rowCount: 0,
      });

      const result = await resolver.tvlRecords({}, { first: 10 });

      expect(result.edges).toHaveLength(0);
    });
  });

  describe('poolTVL', () => {
    it('should calculate TVL for specific pool', async () => {
      const poolId = 'pool-1';
      const mockTVL = {
        poolId,
        totalAmount0: '1000000000000000000',
        totalAmount1: '2000000000000000000',
        calculatedAt: new Date(),
      };

      mockDatabase.query.mockResolvedValue({
        rows: [],
        rowCount: 0,
      });

      mockTVLCalculator.calculatePoolTVL.mockReturnValue(mockTVL);

      const result = await resolver.poolTVL({}, { poolId });

      expect(mockTVLCalculator.calculatePoolTVL).toHaveBeenCalledWith(poolId, []);
      expect(result).toEqual(mockTVL);
    });
  });
});
