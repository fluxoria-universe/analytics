import { TVLCalculator } from '../../src/services/tvl/TVLCalculator';
import { CollectEvent, ModifyPositionEvent } from '../../src/types/contracts';

describe('TVLCalculator', () => {
  let tvlCalculator: TVLCalculator;

  beforeEach(() => {
    tvlCalculator = new TVLCalculator();
  });

  describe('calculateTVL', () => {
    it('should calculate TVL from collect events', () => {
      const collectEvents: CollectEvent[] = [
        {
          id: '1',
          poolId: 'pool-1',
          owner: '0x123',
          amount0: '1000000000000000000', // 1 ETH
          amount1: '2000000000000000000', // 2 USDC
          blockNumber: 1000,
          transactionHash: '0xabc',
          logIndex: 1,
          timestamp: new Date('2023-01-01'),
        },
        {
          id: '2',
          poolId: 'pool-1',
          owner: '0x456',
          amount0: '500000000000000000', // 0.5 ETH
          amount1: '1000000000000000000', // 1 USDC
          blockNumber: 1001,
          transactionHash: '0xdef',
          logIndex: 2,
          timestamp: new Date('2023-01-01'),
        },
      ];

      const tvl = tvlCalculator.calculateTVL(collectEvents);

      expect(tvl).toBeDefined();
      expect(tvl.poolId).toBe('pool-1');
      expect(tvl.totalAmount0).toBe('1500000000000000000'); // 1.5 ETH
      expect(tvl.totalAmount1).toBe('3000000000000000000'); // 3 USDC
      expect(tvl.calculatedAt).toBeDefined();
    });

    it('should handle empty collect events', () => {
      const collectEvents: CollectEvent[] = [];

      const tvl = tvlCalculator.calculateTVL(collectEvents);

      expect(tvl).toBeDefined();
      expect(tvl.totalAmount0).toBe('0');
      expect(tvl.totalAmount1).toBe('0');
    });

    it('should handle single collect event', () => {
      const collectEvents: CollectEvent[] = [
        {
          id: '1',
          poolId: 'pool-1',
          owner: '0x123',
          amount0: '1000000000000000000',
          amount1: '2000000000000000000',
          blockNumber: 1000,
          transactionHash: '0xabc',
          logIndex: 1,
          timestamp: new Date('2023-01-01'),
        },
      ];

      const tvl = tvlCalculator.calculateTVL(collectEvents);

      expect(tvl.totalAmount0).toBe('1000000000000000000');
      expect(tvl.totalAmount1).toBe('2000000000000000000');
    });
  });

  describe('calculatePositionTVL', () => {
    it('should calculate TVL for a specific position', () => {
      const modifyPositionEvents: ModifyPositionEvent[] = [
        {
          id: '1',
          poolId: 'pool-1',
          owner: '0x123',
          tickLower: -100,
          tickUpper: 100,
          liquidity: '1000000000000000000',
          blockNumber: 1000,
          transactionHash: '0xabc',
          logIndex: 1,
          timestamp: new Date('2023-01-01'),
        },
        {
          id: '2',
          poolId: 'pool-1',
          owner: '0x123',
          tickLower: -100,
          tickUpper: 100,
          liquidity: '500000000000000000', // Additional liquidity
          blockNumber: 1001,
          transactionHash: '0xdef',
          logIndex: 2,
          timestamp: new Date('2023-01-01'),
        },
      ];

      const positionTVL = tvlCalculator.calculatePositionTVL(
        'pool-1',
        '0x123',
        modifyPositionEvents
      );

      expect(positionTVL).toBeDefined();
      expect(positionTVL.poolId).toBe('pool-1');
      expect(positionTVL.owner).toBe('0x123');
      expect(positionTVL.totalLiquidity).toBe('1500000000000000000');
    });

    it('should handle empty modify position events', () => {
      const modifyPositionEvents: ModifyPositionEvent[] = [];

      const positionTVL = tvlCalculator.calculatePositionTVL(
        'pool-1',
        '0x123',
        modifyPositionEvents
      );

      expect(positionTVL).toBeDefined();
      expect(positionTVL.totalLiquidity).toBe('0');
    });

    it('should filter by pool ID and owner', () => {
      const modifyPositionEvents: ModifyPositionEvent[] = [
        {
          id: '1',
          poolId: 'pool-1',
          owner: '0x123',
          tickLower: -100,
          tickUpper: 100,
          liquidity: '1000000000000000000',
          blockNumber: 1000,
          transactionHash: '0xabc',
          logIndex: 1,
          timestamp: new Date('2023-01-01'),
        },
        {
          id: '2',
          poolId: 'pool-2', // Different pool
          owner: '0x123',
          tickLower: -100,
          tickUpper: 100,
          liquidity: '500000000000000000',
          blockNumber: 1001,
          transactionHash: '0xdef',
          logIndex: 2,
          timestamp: new Date('2023-01-01'),
        },
        {
          id: '3',
          poolId: 'pool-1',
          owner: '0x456', // Different owner
          tickLower: -100,
          tickUpper: 100,
          liquidity: '300000000000000000',
          blockNumber: 1002,
          transactionHash: '0xghi',
          logIndex: 3,
          timestamp: new Date('2023-01-01'),
        },
      ];

      const positionTVL = tvlCalculator.calculatePositionTVL(
        'pool-1',
        '0x123',
        modifyPositionEvents
      );

      expect(positionTVL.totalLiquidity).toBe('1000000000000000000'); // Only first event
    });
  });

  describe('calculatePoolTVL', () => {
    it('should calculate total TVL for a pool', () => {
      const collectEvents: CollectEvent[] = [
        {
          id: '1',
          poolId: 'pool-1',
          owner: '0x123',
          amount0: '1000000000000000000',
          amount1: '2000000000000000000',
          blockNumber: 1000,
          transactionHash: '0xabc',
          logIndex: 1,
          timestamp: new Date('2023-01-01'),
        },
        {
          id: '2',
          poolId: 'pool-1',
          owner: '0x456',
          amount0: '500000000000000000',
          amount1: '1000000000000000000',
          blockNumber: 1001,
          transactionHash: '0xdef',
          logIndex: 2,
          timestamp: new Date('2023-01-01'),
        },
      ];

      const poolTVL = tvlCalculator.calculatePoolTVL('pool-1', collectEvents);

      expect(poolTVL).toBeDefined();
      expect(poolTVL.poolId).toBe('pool-1');
      expect(poolTVL.totalAmount0).toBe('1500000000000000000');
      expect(poolTVL.totalAmount1).toBe('3000000000000000000');
    });

    it('should filter events by pool ID', () => {
      const collectEvents: CollectEvent[] = [
        {
          id: '1',
          poolId: 'pool-1',
          owner: '0x123',
          amount0: '1000000000000000000',
          amount1: '2000000000000000000',
          blockNumber: 1000,
          transactionHash: '0xabc',
          logIndex: 1,
          timestamp: new Date('2023-01-01'),
        },
        {
          id: '2',
          poolId: 'pool-2', // Different pool
          owner: '0x456',
          amount0: '500000000000000000',
          amount1: '1000000000000000000',
          blockNumber: 1001,
          transactionHash: '0xdef',
          logIndex: 2,
          timestamp: new Date('2023-01-01'),
        },
      ];

      const poolTVL = tvlCalculator.calculatePoolTVL('pool-1', collectEvents);

      expect(poolTVL.totalAmount0).toBe('1000000000000000000'); // Only first event
      expect(poolTVL.totalAmount1).toBe('2000000000000000000');
    });
  });

  describe('formatTVL', () => {
    it('should format TVL with proper decimal places', () => {
      const tvl = {
        poolId: 'pool-1',
        totalAmount0: '1500000000000000000', // 1.5 ETH (18 decimals)
        totalAmount1: '3000000000000000000', // 3 USDC (18 decimals)
        calculatedAt: new Date('2023-01-01'),
      };

      const formatted = tvlCalculator.formatTVL(tvl, 18, 6); // ETH has 18 decimals, USDC has 6

      expect(formatted).toBeDefined();
      expect(formatted.poolId).toBe('pool-1');
      expect(formatted.formattedAmount0).toBe('1.5');
      expect(formatted.formattedAmount1).toBe('3000000'); // 3 USDC with 6 decimals
    });

    it('should handle zero amounts', () => {
      const tvl = {
        poolId: 'pool-1',
        totalAmount0: '0',
        totalAmount1: '0',
        calculatedAt: new Date('2023-01-01'),
      };

      const formatted = tvlCalculator.formatTVL(tvl, 18, 6);

      expect(formatted.formattedAmount0).toBe('0');
      expect(formatted.formattedAmount1).toBe('0');
    });
  });
});
