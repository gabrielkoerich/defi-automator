import { PublicKey, Transaction } from '@solana/web3.js';
import {
  collectFeesIx,
  collectRewardIx,
  updateFeesAndRewardsIx,
} from '@orca-so/whirlpools-sdk/dist/instructions';
import { PDAUtil, PositionData, WhirlpoolData } from '@orca-so/whirlpools-sdk';
import { PositionManager } from '..';
import { WHIRLPOOL_PROGRAM_ID } from '../Protocols/Whirlpool';

const getTickArrays = (whirlpool: WhirlpoolData, position: PositionData) => {
  const tickArrayLowerPda = PDAUtil.getTickArrayFromTickIndex(
    position.tickLowerIndex,
    whirlpool.tickSpacing,
    position.whirlpool,
    WHIRLPOOL_PROGRAM_ID
  );

  const tickArrayUpperPda = PDAUtil.getTickArrayFromTickIndex(
    position.tickUpperIndex,
    whirlpool.tickSpacing,
    position.whirlpool,
    WHIRLPOOL_PROGRAM_ID
  );

  return {
    tickArrayLower: tickArrayLowerPda.publicKey,
    tickArrayUpper: tickArrayUpperPda.publicKey,
  };
};

export const collectFeesAndRewards = async (manager: PositionManager) => {
  const model = await manager.getModel(true);

  if (!model.address) {
    console.log('No position address.');

    return;
  }

  const { ctx, client } = manager.getProtocol();

  const whirlpool = await client.getPool(model.pool);
  const whirlpoolData = whirlpool.getData();

  const position = await client.getPosition(model.address);
  const positionData = position.getData();

  const { tickArrayLower, tickArrayUpper } = getTickArrays(
    whirlpoolData,
    positionData
  );

  const updateIx = updateFeesAndRewardsIx(ctx.program, {
    whirlpool: positionData.whirlpool,
    position: new PublicKey(model.address),
    tickArrayLower,
    tickArrayUpper,
  }).instructions;

  const feesIx = collectFeesIx(ctx.program, {
    whirlpool: positionData.whirlpool,
    position: new PublicKey(model.address),
    positionTokenAccount: await manager.getTokenAccountForMint(
      positionData.positionMint
    ),
    tokenOwnerAccountA: await manager.getTokenAccountForMint(
      whirlpoolData.tokenMintA
    ),
    tokenOwnerAccountB: await manager.getTokenAccountForMint(
      whirlpoolData.tokenMintB
    ),
    tokenVaultA: whirlpoolData.tokenVaultA,
    tokenVaultB: whirlpoolData.tokenVaultB,
    positionAuthority: manager.provider.wallet.publicKey,
  }).instructions;

  const rewardIx = (
    await Promise.all(
      whirlpoolData.rewardInfos.map(async (reward, index) =>
        PublicKey.default.equals(reward.mint)
          ? null
          : collectRewardIx(ctx.program, {
              whirlpool: positionData.whirlpool,
              position: new PublicKey(model.address),
              positionTokenAccount: await manager.getTokenAccountForMint(
                positionData.positionMint
              ),
              rewardIndex: index,
              rewardOwnerAccount: await manager.getTokenAccountForMint(
                reward.mint
              ),
              rewardVault: reward.vault,
              positionAuthority: manager.provider.wallet.publicKey,
            }).instructions
      )
    )
  )
    .flat()
    .filter((instruction) => instruction != null);

  try {
    await manager.provider.sendAndConfirm(
      new Transaction()
        .add(...updateIx)
        .add(...feesIx)
        .add(...rewardIx)
    );
  } catch (e) {
    await manager.provider.sendAndConfirm(
      new Transaction().add(...feesIx).add(...rewardIx)
    );
  }
};

export default collectFeesAndRewards;
