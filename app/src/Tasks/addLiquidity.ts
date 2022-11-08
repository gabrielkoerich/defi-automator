import { IncreaseLiquidityInput, PDAUtil } from '@orca-so/whirlpools-sdk';
import { BN } from '@project-serum/anchor';
import { WHIRLPOOL_PROGRAM_ID } from '../Protocols/Whirlpool';
import { PositionManager } from '..';
import { getStrategyIncreaseLiquidityQuote } from '../Strategies';

export const addLiquidity = async (manager: PositionManager) => {
  const model = await manager.getModel();

  if (manager.config.distribution === 0) {
    return;
  }

  const { client } = manager.getProtocol();

  const pool = await client.getPool(model.pool);

  const strategy = await manager.getStrategy(true);

  if (model.address) {
    console.log('Position exists.', {
      address: model.address,
    });

    const position = await client.getPosition(model.address);

    const { quote } = await getStrategyIncreaseLiquidityQuote(
      strategy,
      manager.provider,
      pool.getData(),
      position.getData()
    );

    if (quote.liquidityAmount.eq(new BN(0))) {
      return;
    }

    console.log('Increasing liquidity', {
      tokenEstA: quote.tokenEstA.toString(),
      tokenEstB: quote.tokenEstB.toString(),
      // tokenMaxA: quote.tokenMaxA.toString(),
      // tokenMaxB: quote.tokenMaxB.toString(),
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
      console.log(`Error: Couldn't add liquidity, Position needs swaps.`);

      return;
    }

    console.log('Liquidity increased.');

    return;
  }

  const { tickLowerIndex, tickUpperIndex, quote } =
    await getStrategyIncreaseLiquidityQuote(
      strategy,
      manager.provider,
      pool.getData()
    );

  // Mints a position and insert liquidity (2 instructions)
  const { positionMint, tx } = await pool.openPosition(
    tickLowerIndex,
    tickUpperIndex,
    quote
  );

  const positionPda = PDAUtil.getPosition(WHIRLPOOL_PROGRAM_ID, positionMint);

  await tx.buildAndExecute();

  model.strategy = strategy.name;
  model.address = positionPda.publicKey.toString();

  await model.save();

  console.log(`Position opened.`, {
    address: model.address,
  });
};

export default addLiquidity;
