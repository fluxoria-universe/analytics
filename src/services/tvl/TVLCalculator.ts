import { BigNumber } from 'bignumber.js';

export interface TVLRecord {
  id: string;
  poolId: string;
  tvlToken0: string;
  tvlToken1: string;
  tvlUSD?: number;
  liquidityDelta: string;
  computedAt: string;
  blockNumber: string;
}

export interface PositionData {
  tickLower: number;
  tickUpper: number;
  liquidity: string;
  amount0: string;
  amount1: string;
}

export interface PoolData {
  id: string;
  tokenA: string;
  tokenB: string;
  feeTier: number;
  currentTick: number;
  sqrtPriceX96: string;
}

export class TVLCalculator {
  /**
   * Calculate TVL for a pool based on active positions
   */
  calculatePoolTVL(
    pool: PoolData,
    positions: PositionData[],
    currentTick: number
  ): {
    tvlToken0: string;
    tvlToken1: string;
    tvlUSD?: number;
    liquidityDelta: string;
  } {
    let totalLiquidity0 = new BigNumber(0);
    let totalLiquidity1 = new BigNumber(0);
    let totalLiquidityDelta = new BigNumber(0);

    for (const position of positions) {
      // Check if position is active (current tick is within range)
      if (currentTick >= position.tickLower && currentTick <= position.tickUpper) {
        const liquidity = new BigNumber(position.liquidity);
        const amount0 = new BigNumber(position.amount0);
        const amount1 = new BigNumber(position.amount1);

        totalLiquidity0 = totalLiquidity0.plus(amount0);
        totalLiquidity1 = totalLiquidity1.plus(amount1);
        totalLiquidityDelta = totalLiquidityDelta.plus(liquidity);
      }
    }

    return {
      tvlToken0: totalLiquidity0.toString(),
      tvlToken1: totalLiquidity1.toString(),
      liquidityDelta: totalLiquidityDelta.toString(),
    };
  }

  /**
   * Calculate TVL change since last record
   */
  calculateTVLDelta(
    currentTVL: { tvlToken0: string; tvlToken1: string },
    previousTVL: { tvlToken0: string; tvlToken1: string }
  ): string {
    const current0 = new BigNumber(currentTVL.tvlToken0);
    const current1 = new BigNumber(currentTVL.tvlToken1);
    const previous0 = new BigNumber(previousTVL.tvlToken0);
    const previous1 = new BigNumber(previousTVL.tvlToken1);

    const delta0 = current0.minus(previous0);
    const delta1 = current1.minus(previous1);

    // Return absolute change magnitude
    return delta0.abs().plus(delta1.abs()).toString();
  }

  /**
   * Calculate USD value of TVL (requires price oracle)
   */
  calculateUSDValue(
    tvlToken0: string,
    tvlToken1: string,
    token0PriceUSD: number,
    token1PriceUSD: number
  ): number {
    const amount0 = new BigNumber(tvlToken0);
    const amount1 = new BigNumber(tvlToken1);

    // Convert from wei to token units (assuming 18 decimals)
    const token0Value = amount0.dividedBy(new BigNumber(10).pow(18)).multipliedBy(token0PriceUSD);
    const token1Value = amount1.dividedBy(new BigNumber(10).pow(18)).multipliedBy(token1PriceUSD);

    return token0Value.plus(token1Value).toNumber();
  }

  /**
   * Calculate price from sqrtPriceX96 (Uniswap V3 format)
   */
  calculatePriceFromSqrtPriceX96(sqrtPriceX96: string): number {
    const sqrtPrice = new BigNumber(sqrtPriceX96);
    const Q96 = new BigNumber(2).pow(96);
    
    // Price = (sqrtPriceX96 / 2^96)^2
    const price = sqrtPrice.dividedBy(Q96).pow(2);
    
    return price.toNumber();
  }

  /**
   * Calculate tick from price
   */
  calculateTickFromPrice(price: number): number {
    // tick = floor(log(sqrt(price)) / log(1.0001))
    const sqrtPrice = Math.sqrt(price);
    const tick = Math.floor(Math.log(sqrtPrice) / Math.log(1.0001));
    
    return tick;
  }

  /**
   * Calculate price from tick
   */
  calculatePriceFromTick(tick: number): number {
    // price = (1.0001)^tick
    return Math.pow(1.0001, tick);
  }

  /**
   * Check if position is in range
   */
  isPositionInRange(tick: number, tickLower: number, tickUpper: number): boolean {
    return tick >= tickLower && tick <= tickUpper;
  }

  /**
   * Calculate liquidity for a position
   */
  calculatePositionLiquidity(
    tick: number,
    tickLower: number,
    tickUpper: number,
    amount0: string,
    amount1: string
  ): string {
    const amount0BN = new BigNumber(amount0);
    const amount1BN = new BigNumber(amount1);

    if (tick < tickLower) {
      // Position is entirely in token0
      return amount0BN.toString();
    } else if (tick > tickUpper) {
      // Position is entirely in token1
      return amount1BN.toString();
    } else {
      // Position is active, return sum of both tokens
      return amount0BN.plus(amount1BN).toString();
    }
  }

  /**
   * Aggregate TVL across multiple pools
   */
  aggregateTVL(poolTVLs: Array<{ tvlToken0: string; tvlToken1: string }>): {
    totalToken0: string;
    totalToken1: string;
  } {
    let totalToken0 = new BigNumber(0);
    let totalToken1 = new BigNumber(0);

    for (const poolTVL of poolTVLs) {
      totalToken0 = totalToken0.plus(new BigNumber(poolTVL.tvlToken0));
      totalToken1 = totalToken1.plus(new BigNumber(poolTVL.tvlToken1));
    }

    return {
      totalToken0: totalToken0.toString(),
      totalToken1: totalToken1.toString(),
    };
  }

  /**
   * Calculate TVL growth rate
   */
  calculateGrowthRate(
    currentTVL: { tvlToken0: string; tvlToken1: string },
    previousTVL: { tvlToken0: string; tvlToken1: string },
    timeDiffSeconds: number
  ): number {
    const current0 = new BigNumber(currentTVL.tvlToken0);
    const current1 = new BigNumber(currentTVL.tvlToken1);
    const previous0 = new BigNumber(previousTVL.tvlToken0);
    const previous1 = new BigNumber(previousTVL.tvlToken1);

    const currentTotal = current0.plus(current1);
    const previousTotal = previous0.plus(previous1);

    if (previousTotal.isZero()) {
      return 0;
    }

    const growthRate = currentTotal.minus(previousTotal).dividedBy(previousTotal);
    const annualizedRate = growthRate.multipliedBy(365 * 24 * 60 * 60).dividedBy(timeDiffSeconds);

    return annualizedRate.toNumber();
  }

  /**
   * Validate TVL data consistency
   */
  validateTVLData(tvl: TVLRecord): boolean {
    try {
      const tvl0 = new BigNumber(tvl.tvlToken0);
      const tvl1 = new BigNumber(tvl.tvlToken1);
      const delta = new BigNumber(tvl.liquidityDelta);

      // TVL values should be non-negative
      if (tvl0.isNegative() || tvl1.isNegative()) {
        return false;
      }

      // Delta should be non-negative
      if (delta.isNegative()) {
        return false;
      }

      // ComputedAt should be valid timestamp
      const computedAt = new Date(tvl.computedAt);
      if (isNaN(computedAt.getTime())) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }
}
