import { PublicKey } from '@solana/web3.js';
import axios from 'axios';
import CoinGecko from 'coingecko-api';

global.tokens = global.tokens || [];

type JupTokenInfo = {
  chainId: number;
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI: string;
  tags: Record<string, string>;
  extensions: Record<string, string>;
};

export const getTokens = async (): Promise<JupTokenInfo[]> => {
  if (global.tokens.length === 0) {
    console.log(`Fetching tokens from Jupiter`);

    global.tokens = (
      await axios.get(`https://cache.jup.ag/tokens`)
    ).data.filter((token) => token.chainId === 101);
  }

  return global.tokens;
};

export const getTokenBySymbol = async (symbol: string): Promise<JupTokenInfo> =>
  (await getTokens()).filter(
    (token) => token.symbol.toUpperCase() === symbol.toUpperCase()
  )[0];

export const getTokenByMint = async (mint: PublicKey): Promise<JupTokenInfo> =>
  (await getTokens()).filter((token) => token.address === mint.toString())[0];

/**
 * @see https://api.coingecko.com/api/v3/coins/list
 */
export const getPriceBySymbol = async (symbol: string) => {
  const client = new CoinGecko();

  const token = await getTokenBySymbol(symbol);

  const { data } = await client.coins.fetch(token.extensions.coingeckoId, {});

  return data?.market_data?.current_price?.usd;
};

export const getPriceByMint = async (mint: PublicKey) => {
  const { symbol } = await getTokenByMint(mint);

  return getPriceBySymbol(symbol);
};
