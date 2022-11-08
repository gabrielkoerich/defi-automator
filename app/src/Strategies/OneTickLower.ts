import { PositionData, TickUtil, WhirlpoolData } from '@orca-so/whirlpools-sdk';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  Token,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { AnchorProvider, BN } from '@project-serum/anchor';
import { Strategy } from '.';
import { positionHasCollectibles } from '../Protocols/Whirlpool';

export class OneTickLower implements Strategy {
  public name: string = 'one-tick-lower';

  public inputToken: string = 'tokenMintB';

  getInitTicks(whirlpool: WhirlpoolData): {
    tickLowerIndex: number;
    tickUpperIndex: number;
  } {
    const tickUpperIndex = TickUtil.getPrevInitializableTickIndex(
      whirlpool.tickCurrentIndex,
      whirlpool.tickSpacing
    );

    const tickLowerIndex = TickUtil.getPrevInitializableTickIndex(
      tickUpperIndex - 25 * whirlpool.tickSpacing, // -15 ticks for now
      whirlpool.tickSpacing
    );

    // const priceLower = PriceMath.sqrtPriceX64ToPrice(
    //   PriceMath.tickIndexToSqrtPriceX64(tickLowerIndex),
    //   9,
    //   6
    // ).toNumber();

    // const priceUpper = PriceMath.sqrtPriceX64ToPrice(
    //   PriceMath.tickIndexToSqrtPriceX64(tickUpperIndex),
    //   9,
    //   6
    // ).toNumber();

    // console.log({calcPriceLower, calcPriceUpper});

    return {
      tickLowerIndex,
      tickUpperIndex,
      // inputTokenMint: poolData.tokenMintB,
    };
  }

  async getIncreaseLiquidityParams(
    provider: AnchorProvider,
    whirlpool: WhirlpoolData
  ) {
    const tokenAccount = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      whirlpool[this.inputToken],
      provider.wallet.publicKey
    );

    const { value } = await provider.connection.getTokenAccountBalance(
      tokenAccount
    );

    // Input is token B on OneTickLower
    return {
      inputTokenMint: whirlpool[this.inputToken],
      inputTokenAmount: new BN(value.amount),
    };
  }

  /**
   * Close position when current tick diff is larger than one tick
   */
  shouldClose(whirlpool: WhirlpoolData, position: PositionData): boolean {
    if (positionHasCollectibles(position)) {
      console.log(`Position has collectible fees/rewards.`);

      return false;
    }

    if (position.liquidity.eq(new BN(0))) {
      return true;
    }

    const { tickCurrentIndex, tickSpacing } = whirlpool;
    const { tickLowerIndex, tickUpperIndex } = position;

    const prevLowerTick = TickUtil.getPrevInitializableTickIndex(
      tickLowerIndex - tickSpacing,
      tickSpacing
    );
    const nextUpperTick = TickUtil.getNextInitializableTickIndex(
      tickUpperIndex + tickSpacing,
      tickSpacing
    );

    if (tickCurrentIndex < prevLowerTick) {
      console.log(
        `Closing: Current tick ${tickCurrentIndex} is smaller than previous lower tick ${prevLowerTick}`
      );

      return true;
    }

    if (tickCurrentIndex > nextUpperTick) {
      console.log(
        `Closing: Current tick ${tickCurrentIndex} is larger than next upper tick ${nextUpperTick}`
      );

      return true;
    }

    return false;
  }
}
