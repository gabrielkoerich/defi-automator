import {
  increaseLiquidityQuoteByInputTokenWithParams,
  IncreaseLiquidityQuote,
  PositionData,
  WhirlpoolData,
} from '@orca-so/whirlpools-sdk';
import { AnchorProvider, BN } from '@project-serum/anchor';
import { PublicKey } from '@solana/web3.js';
import { Percentage } from '@orca-so/common-sdk';
import { OneTickLower } from './OneTickLower';
import { OneTickUpper } from './OneTickUpper';
import { PositionManager } from '../PositionManager';
import { getPriceByMint } from '../tokens';

// TODO: abstract Whirlpool and Quote later
export interface Strategy {
  name: string;
  inputToken: string;

  /**
   * Get the ticks to open a position.
   */
  getInitTicks: (whirlpool: WhirlpoolData) => {
    tickLowerIndex: number;
    tickUpperIndex: number;
  };

  getIncreaseLiquidityParams: (
    provider: AnchorProvider,
    whirlpool: WhirlpoolData
  ) => Promise<{
    inputTokenMint: PublicKey;
    inputTokenAmount: BN;
  }>;

  /**
   * Check if position should be closed and reopened
   */
  shouldClose: (whirlpool: WhirlpoolData, position: PositionData) => boolean;
}

const strategies = {
  'one-tick-lower': OneTickLower,
  'one-tick-upper': OneTickUpper,
  // Get the larger USD balance token to choose the side
  'one-tick': async (manager: PositionManager) => {
    const { tokenBalanceA, tokenBalanceB } = await manager.getTokenBalances(
      true
    );

    const pool = await manager.getPool();
    const poolData = pool.getData();

    const priceTokenA = await getPriceByMint(poolData.tokenMintA);
    const priceTokenB = await getPriceByMint(poolData.tokenMintB);

    const usdTokenA = tokenBalanceA * priceTokenA;
    const usdTokenB = tokenBalanceB * priceTokenB;

    return usdTokenA > usdTokenB ? new OneTickUpper() : new OneTickLower();
  },
};

export const getStrategy = async (
  manager: PositionManager
): Promise<Strategy> => {
  const strategyName =
    (await manager.getModel()).strategy || manager.config.strategy;

  const factory = strategies[strategyName];

  try {
    return new factory();
  } catch (e) {
    return factory(manager);
  }
};

export const getStrategyIncreaseLiquidityQuote = async (
  strategy: Strategy,
  provider: AnchorProvider,
  whirlpool: WhirlpoolData
): Promise<{
  tickLowerIndex: number;
  tickUpperIndex: number;
  inputTokenMint: PublicKey;
  inputTokenAmount: BN;
  quote: IncreaseLiquidityQuote;
}> => {
  const { tickLowerIndex, tickUpperIndex } = strategy.getInitTicks(whirlpool);

  const { inputTokenMint, inputTokenAmount } =
    await strategy.getIncreaseLiquidityParams(provider, whirlpool);

  const quote = increaseLiquidityQuoteByInputTokenWithParams({
    tokenMintA: whirlpool.tokenMintA,
    tokenMintB: whirlpool.tokenMintB,
    sqrtPrice: whirlpool.sqrtPrice,
    slippageTolerance: Percentage.fromFraction(1, 1000),
    tickCurrentIndex: whirlpool.tickCurrentIndex,
    tickLowerIndex,
    tickUpperIndex,
    inputTokenMint,
    inputTokenAmount,
  });

  return {
    tickLowerIndex,
    tickUpperIndex,
    inputTokenMint,
    inputTokenAmount,
    quote,
  };
};
