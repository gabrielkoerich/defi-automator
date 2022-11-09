import { Percentage } from '@orca-so/common-sdk';
import { DecreaseLiquidityInput } from '@orca-so/whirlpools-sdk';
import { BN } from '@project-serum/anchor';
import { PositionManager } from '..';

export const closePosition = async (manager: PositionManager) => {
  const position = await manager.getPosition();

  if (!position) {
    console.log('No position address.');

    return;
  }

  const pool = await manager.getPool();
  const strategy = await manager.getStrategy();

  if (
    manager.config.distribution > 0 &&
    !strategy.shouldClose(pool.getData(), position.getData())
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

  const model = await manager.getModel();

  const closeTx = await pool.closePosition(
    model.address,
    Percentage.fromFraction(1, 1000)
  );

  await closeTx.buildAndExecute();

  model.address = null;
  model.strategy = null;

  await model.save();
};

export default closePosition;
