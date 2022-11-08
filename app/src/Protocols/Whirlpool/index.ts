import { PublicKey } from '@solana/web3.js';
import { PoolUtil, PDAUtil } from '@orca-so/whirlpools-sdk';

export * from './Position';
// export * from './WhirlpoolRewards';
// export * from './WhirlpoolTick';

export const WHIRLPOOL_PROGRAM_ID = new PublicKey(
  'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc'
);

export const WHIRLPOOL_CONFIG = new PublicKey(
  '2LecshUwdy9xi7meFgHtFJQNSKk4KdTrcpvaB56dP2NQ'
);

export const WHIRLPOOL_CONFIG_DEVNET = new PublicKey(
  '847gd7SckNwJetbjf22ktip9vAtKWPMY4ntdr6CdCsJj'
);

export const getWhirlpoolPda = (
  mintA: PublicKey,
  mintB: PublicKey,
  tickSpacing: number = 64
) => {
  const [tokenMintA, tokenMintB] = PoolUtil.orderMints(mintA, mintB);

  return PDAUtil.getWhirlpool(
    WHIRLPOOL_PROGRAM_ID,
    WHIRLPOOL_CONFIG,
    new PublicKey(tokenMintA),
    new PublicKey(tokenMintB),
    tickSpacing
  );
};
