import { PublicKey, Transaction } from '@solana/web3.js';
import axios from 'axios';
import { PositionManager } from '..';
import { getTokenByMint } from '../tokens';

const getJupiterQuote = async (
  inputMint: PublicKey,
  outputMint: PublicKey,
  amount: number
) => {
  const { symbol: inputSymbol } = await getTokenByMint(inputMint);
  const { symbol: outputSymbol } = await getTokenByMint(outputMint);

  console.log(
    `Fetching swap route: ${amount} ${inputSymbol} to ${outputSymbol}`
  );

  return (
    await axios.get(
      `https://quote-api.jup.ag/v1/quote?inputMint=${inputMint.toString()}&outputMint=${outputMint.toString()}&amount=${amount}&slippage=0.5`
    )
  ).data;
};

const getJupiterTransaction = async (route, userPublicKey) =>
  (
    await axios.post('https://quote-api.jup.ag/v1/swap', {
      route,
      userPublicKey,
    })
  ).data;

export const swapCollectedTokens = async (manager: PositionManager) => {
  const model = await manager.getModel();

  if (!model.address) {
    console.log('No position address.');

    return;
  }

  const { client } = manager.getProtocol();

  const whirlpool = await client.getPool(model.pool);
  const whirlpoolData = whirlpool.getData();

  const strategy = await manager.getStrategy();

  // TODO: move to stragegy?
  const outputToken = strategy.inputToken;

  const rewards = (
    await Promise.all(
      whirlpoolData.rewardInfos
        .filter((reward) => !PublicKey.default.equals(reward.mint))
        .map(async (reward) => {
          const tokenAccount = await manager.getTokenAccountForMint(
            reward.mint
          );

          const { value } =
            await manager.provider.connection.getTokenAccountBalance(
              tokenAccount
            );

          const balance = Number(value.amount);

          if (balance <= 100) {
            return null;
          }

          try {
            const quote = await getJupiterQuote(
              reward.mint,
              whirlpoolData[outputToken],
              balance
            );

            return {
              mint: reward.mint,
              outputMint: whirlpoolData[outputToken],
              tokenAccount,
              balance,
              quote,
            };
          } catch (e) {
            console.error(e.config?.url, e.response?.data);

            return null;
          }
        })
    )
  ).filter((reward) => reward != null);

  for (const { mint, outputMint, balance, quote } of rewards) {
    const route = quote.data[0];

    const { setupTransaction, swapTransaction, cleanupTransaction } =
      await getJupiterTransaction(
        route,
        manager.provider.wallet.publicKey.toString()
      );

    try {
      for (const serializedTransaction of [
        setupTransaction,
        swapTransaction,
        cleanupTransaction,
      ].filter(Boolean)) {
        const tx = Transaction.from(
          Buffer.from(serializedTransaction, 'base64')
        );

        await manager.provider.sendAndConfirm(tx);
      }
    } catch (e) {
      console.log(`Error: Couldn't swap.`);
    }
  }
};

export default swapCollectedTokens;
