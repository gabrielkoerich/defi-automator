import { BN } from '@project-serum/anchor';
import { MathUtil } from '@orca-so/common-sdk';
import {
  WhirlpoolData,
  PositionData,
  WhirlpoolRewardInfoData,
  PriceMath,
  PoolUtil,
  TokenInfo,
} from '@orca-so/whirlpools-sdk';
import Decimal from 'decimal.js';
import { getPriceByMint } from '../../tokens';

export type EstimatedAprs = {
  fee: number;
  rewards: number[];
};

export const ZERO_APR = {
  fee: 0,
  rewards: [0, 0, 0],
};

type TokenMint = string;

export type TokenUSDPrices = Record<TokenMint, Decimal>;

const SECONDS_PER_DAY = 60 * 60 * 24;
const SECONDS_PER_YEAR = SECONDS_PER_DAY * 365;

const estimateRewardApr = (
  reward: WhirlpoolRewardInfoData,
  concentratedValue: Decimal,
  tokenPrices: TokenUSDPrices
) => {
  const { mint, emissionsPerSecondX64 } = reward;
  const rewardTokenPrice = tokenPrices[mint.toBase58()];

  console.log({
    emissionsPerSecondX64,
    rewardTokenPrice,
  });

  if (!emissionsPerSecondX64 || !rewardTokenPrice) {
    return 0;
  }

  return MathUtil.fromX64(emissionsPerSecondX64)
    .mul(SECONDS_PER_YEAR)
    .mul(rewardTokenPrice)
    .div(concentratedValue)
    .toNumber();
};

export const estimatePositionAPR = (
  whirlpool: WhirlpoolData,
  position: PositionData,
  receivedFees: number,
  lastCollectedAt: Date,
  amountTokenA: number,
  amountTokenB: number,
  tokenPriceA: number,
  tokenPriceB: number
): EstimatedAprs => {
  const { tokenMintA, tokenMintB } = whirlpool;

  const { tickLowerIndex, tickUpperIndex } = position;

  if (
    !receivedFees ||
    !tokenPriceA ||
    !tokenPriceB ||
    tickLowerIndex >= tickUpperIndex
  ) {
    return ZERO_APR;
  }

  const now = new Date();
  const diffInSeconds = (now.getTime() - lastCollectedAt.getTime()) / 1000;

  const feesPerSecond = receivedFees / diffInSeconds;

  console.log({
    receivedFees,
    lastCollectedAt,
    diffInSeconds,
    feesPerSecond,
  });

  const tokenPrices = {};
  tokenPrices[tokenMintA.toString()] = tokenPriceA;
  tokenPrices[tokenMintB.toString()] = tokenPriceB;

  const tokenValueA = new Decimal(amountTokenA).mul(tokenPriceA);
  const tokenValueB = new Decimal(amountTokenB).mul(tokenPriceB);
  const concentratedValue = tokenValueA.add(tokenValueB);

  const feesPerYear = new Decimal(feesPerSecond).mul(SECONDS_PER_YEAR);
  const feeApr = feesPerYear.div(concentratedValue).toNumber();

  const rewards = whirlpool.rewardInfos.map((reward) =>
    estimateRewardApr(reward, concentratedValue, tokenPrices)
  );

  return { fee: feeApr, rewards };
};

export const isWhirlpoolPositionInRange = (
  whirlpool: WhirlpoolData,
  position: PositionData
): boolean =>
  whirlpool.tickCurrentIndex >= position.tickLowerIndex &&
  whirlpool.tickCurrentIndex <= position.tickUpperIndex;

export const positionHasCollectibleFees = (position: PositionData): boolean =>
  position.feeOwedA.toNumber() > 0 || position.feeOwedB.toNumber() > 0;

export const positionHasCollectibleRewards = (
  position: PositionData
): boolean =>
  position.rewardInfos[0]?.amountOwed?.toNumber() > 0 ||
  position.rewardInfos[1]?.amountOwed?.toNumber() > 0 ||
  position.rewardInfos[2]?.amountOwed?.toNumber() > 0;

export const positionHasCollectibles = (position: PositionData): boolean =>
  positionHasCollectibleFees(position) ||
  positionHasCollectibleRewards(position);

export const getWhirlpoolPositionState = async (
  whirlpool: WhirlpoolData,
  position: PositionData,
  tokenAInfo: TokenInfo,
  tokenBInfo: TokenInfo
) => {
  const prices = getWhirlpoolPositionPrices(
    whirlpool,
    position,
    tokenAInfo.decimals,
    tokenBInfo.decimals
  );

  const uiFixedDecimals = prices.current < 1 ? 5 : 3;

  const { tokenA, tokenB } = getPositionDistribution(
    position,
    whirlpool,
    tokenAInfo.decimals,
    tokenBInfo.decimals
  );

  const tokensA = `${tokenA.amount} (${(tokenA.distribution * 100).toFixed(
    2
  )}%)`;
  const tokensB = `${tokenB.amount} (${(tokenB.distribution * 100).toFixed(
    2
  )}%)`;

  const priceTokenA = await getPriceByMint(whirlpool.tokenMintA);
  const priceTokenB = await getPriceByMint(whirlpool.tokenMintB);

  const usdValue = Number(
    (tokenA.amount * priceTokenA + tokenB.amount * priceTokenB).toFixed(2)
  );

  return {
    tokenMintA: whirlpool.tokenMintA.toString(),
    tokenMintB: whirlpool.tokenMintB.toString(),
    tickSpacing: whirlpool.tickSpacing,
    tickCurrent: whirlpool.tickCurrentIndex,
    tickRange: `${position.tickLowerIndex} <> ${position.tickUpperIndex}`,
    currentPrice: Number(prices.current.toFixed(uiFixedDecimals)),
    priceRange: `${prices.lower.toFixed(
      uiFixedDecimals
    )} <> ${prices.upper.toFixed(uiFixedDecimals)}`,
    inRange: isWhirlpoolPositionInRange(whirlpool, position),
    leverage: getPositionLeverage(prices.lower, prices.upper),
    tokensA,
    tokensB,
    usdValue,
    // TODO: APY,
  };
};

export const getWhirlpoolPositionPrices = (
  whirlpool: WhirlpoolData,
  position: PositionData,
  decimalsA: number,
  decimalsB: number
) => ({
  lower: PriceMath.sqrtPriceX64ToPrice(
    PriceMath.tickIndexToSqrtPriceX64(position.tickLowerIndex),
    decimalsA,
    decimalsB
  ).toNumber(),
  current: PriceMath.sqrtPriceX64ToPrice(
    whirlpool.sqrtPrice,
    decimalsA,
    decimalsB
  ).toNumber(),
  upper: PriceMath.sqrtPriceX64ToPrice(
    PriceMath.tickIndexToSqrtPriceX64(position.tickUpperIndex),
    decimalsA,
    decimalsB
  ).toNumber(),
});

/**
 * @see https://www.orca.so/whirlpools/open-position/HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ
 */
export const getPositionLeverage = (
  priceLower: number,
  priceUpper: number
): number => {
  const ratio = new Decimal(priceLower)
    .div(new Decimal(priceUpper))
    .pow(new Decimal(0.25));

  return Number(
    new Decimal(1).div(new Decimal(1).sub(ratio)).toNumber().toFixed(2)
  );
};

const getTokensDistribution = (
  sqrtPrice: BN,
  sqrtPriceLower: BN,
  sqrtPriceUpper: BN,
  decimalsA: number,
  decimalsB: number,
  liquidity: BN
) => {
  const { tokenA, tokenB } = PoolUtil.getTokenAmountsFromLiquidity(
    liquidity,
    sqrtPrice,
    sqrtPriceLower,
    sqrtPriceUpper,
    true
  );

  const price = PriceMath.sqrtPriceX64ToPrice(
    sqrtPrice,
    decimalsA,
    decimalsB
  ).toNumber();

  const amountTokenA = Number(tokenA.toString()) / 10 ** decimalsA;
  const amountTokenB = Number(tokenB.toString()) / 10 ** decimalsB;

  const totalBalanceInTokenA = amountTokenA + amountTokenB / price;
  const totalBalanceInTokenB = amountTokenA * price + amountTokenB;

  return {
    tokenA: {
      distribution: Number((amountTokenA / totalBalanceInTokenA).toFixed(4)),
      amount: amountTokenA,
    },
    tokenB: {
      distribution: Number((amountTokenB / totalBalanceInTokenB).toFixed(4)),
      amount: amountTokenB,
    },
    totalBalanceInTokenA,
    totalBalanceInTokenB,
  };
};

export const getPositionDistribution = (
  position: PositionData,
  whirlpool: WhirlpoolData,
  decimalsA: number,
  decimalsB: number
) => {
  const sqrtPriceLower = PriceMath.tickIndexToSqrtPriceX64(
    position.tickLowerIndex
  );

  const sqrtPriceUpper = PriceMath.tickIndexToSqrtPriceX64(
    position.tickUpperIndex
  );

  return getTokensDistribution(
    whirlpool.sqrtPrice,
    sqrtPriceLower,
    sqrtPriceUpper,
    decimalsA,
    decimalsB,
    position.liquidity
  );
};
