import { IncreaseLiquidityInput, PDAUtil } from '@orca-so/whirlpools-sdk';
import { BN } from '@project-serum/anchor';
import { WHIRLPOOL_PROGRAM_ID } from '../Protocols/Whirlpool';
import { PositionManager } from '..';
import { getStrategyIncreaseLiquidityQuote } from '../Strategies';

export const addLiquidity = async (manager: PositionManager) => {
  if (manager.config.distribution === 0) {
    return;
  }

  const pool = await manager.getPool();
  const position = await manager.getPosition();

  const strategy = await manager.getStrategy(true);

  if (position) {
    const { quote } = await getStrategyIncreaseLiquidityQuote(
      strategy,
      manager.provider,
      pool.getData(),
      // manager.config.distribution,
      position.getData()
    );

    if (quote.liquidityAmount.eq(new BN(0))) {
      return;
    }

    console.log('Increasing liquidity', {
      tokenEstA: quote.tokenEstA.toString(),
      tokenEstB: quote.tokenEstB.toString(),
      amount: quote.liquidityAmount.toNumber(),
    });

    const increaseTx = await position.increaseLiquidity({
      tokenMaxA: quote.tokenMaxA,
      tokenMaxB: quote.tokenMaxB,
      liquidityAmount: quote.liquidityAmount,
    } as IncreaseLiquidityInput);

    try {
      await increaseTx.buildAndExecute();
    } catch (e) {
      console.log(`Error: Couldn't add liquidity, position needs swaps.`);
    }

    return;
  }

  const { tickLowerIndex, tickUpperIndex, quote } =
    await getStrategyIncreaseLiquidityQuote(
      strategy,
      manager.provider,
      pool.getData()
      // manager.config.distribution,
    );

  if (quote.liquidityAmount.eq(new BN(0))) {
    return;
  }

  console.log('Opening position', {
    tokenEstA: quote.tokenEstA.toString(),
    tokenEstB: quote.tokenEstB.toString(),
    amount: quote.liquidityAmount.toNumber(),
  });

  const { positionMint, tx } = await pool.openPosition(
    tickLowerIndex,
    tickUpperIndex,
    quote
  );

  const positionPda = PDAUtil.getPosition(WHIRLPOOL_PROGRAM_ID, positionMint);

  await tx.buildAndExecute();

  const model = await manager.getModel();

  model.strategy = strategy.name;
  model.mint = positionMint.toString();
  model.address = positionPda.publicKey.toString();

  await model.save();

  console.log(`Position opened.`, {
    address: model.address,
  });
};

export default addLiquidity;
