import { DecreaseLiquidityInput } from '@orca-so/whirlpools-sdk';
import { BN } from '@project-serum/anchor';
import { Percentage } from '@orca-so/common-sdk';
import { PositionManager } from '..';

export const closePosition = async (manager: PositionManager) => {
  const model = await manager.getModel();

  if (!model.address) {
    console.log('No position address.');

    return;
  }

  const { client } = manager.getProtocol();

  const whirlpool = await client.getPool(model.pool);
  const position = await client.getPosition(model.address);

  const strategy = await manager.getStrategy();

  if (
    manager.config.distribution > 0 &&
    !strategy.shouldClose(whirlpool.getData(), position.getData())
  ) {
    return;
  }

  const { liquidity } = position.getData();

  if (liquidity.gt(new BN(0))) {
    const decreaseTx = await position.decreaseLiquidity({
      tokenMinA: new BN(0),
      tokenMinB: new BN(0),
      liquidityAmount: liquidity,
    } as DecreaseLiquidityInput);

    await decreaseTx.buildAndExecute();
  }

  const closeTx = await whirlpool.closePosition(
    model.address,
    Percentage.fromFraction(1, 1000)
  );

  await closeTx.buildAndExecute();

  model.address = null;
  model.strategy = null;

  await model.save();

  console.log(`Position closed.`);
};

export default closePosition;
