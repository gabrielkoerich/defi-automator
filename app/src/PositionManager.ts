import { AnchorProvider, BN } from '@project-serum/anchor';
import type { Document } from 'mongoose';
import {
  buildWhirlpoolClient,
  Whirlpool,
  WhirlpoolContext,
} from '@orca-so/whirlpools-sdk';
import { PublicKey, Transaction } from '@solana/web3.js';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  Token,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { Position, PositionInterface } from './Database';
import {
  WHIRLPOOL_PROGRAM_ID,
  getWhirlpoolPositionState,
} from './Protocols/Whirlpool';
import { getStrategy, Strategy } from './Strategies';
import { getTokenByMint } from './tokens';

export class PositionManager {
  private model: (Document & PositionInterface) | null;

  private pool: Whirlpool | null;

  private strategy: Strategy | null;

  public constructor(
    public readonly provider: AnchorProvider,
    private readonly protocol: string,
    public readonly config: any
  ) {
    this.provider = provider;
    this.protocol = protocol;
    this.config = config;
  }

  public async getModel(): Promise<Document & PositionInterface> {
    if (this.model) {
      return this.model;
    }

    const attributes = {
      pool: this.config.pool,
      chain: 'solana',
      protocol: this.protocol,
    };

    // TODO:
    // Check how to handle more than one position/strategy for the same pool
    // this.model =
    //   (await (this.address
    //     ? Position.findOne({ address: this.address.toString() })
    //     : Position.findOne(attributes))) || new Position(attributes);

    this.model =
      (await Position.findOne(attributes)) || new Position(attributes);

    await this.model.save();

    return this.model;
  }

  public async getStrategy(reload: boolean = false): Promise<Strategy> {
    if (!this.strategy || reload) {
      this.strategy = await getStrategy(this);
    }

    return this.strategy;
  }

  // TODO: Make abstract later using this.protocol
  public getProtocol() {
    const ctx = WhirlpoolContext.withProvider(
      this.provider,
      WHIRLPOOL_PROGRAM_ID
    );

    const client = buildWhirlpoolClient(ctx);

    return { ctx, client };
  }

  public async getPool() {
    const { client } = this.getProtocol();

    if (!this.pool) {
      this.pool = await client.getPool(this.config.pool);
    }

    return this.pool;
  }

  public async getPosition() {
    const model = await this.getModel();

    if (!model.address) {
      return null;
    }

    const { client } = this.getProtocol();

    try {
      return await client.getPosition(model.address);
    } catch (e) {
      if (
        !e.message.includes(
          `Unable to fetch Position at address at ${model.address}`
        )
      ) {
        throw e;
      }

      model.address = null;

      await model.save();

      return null;
    }
  }

  async getTokenAccountForMint(mint: PublicKey, create: boolean = true) {
    const tokenAccount = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      mint,
      this.provider.wallet.publicKey
    );

    const info = await this.provider.connection.getAccountInfo(tokenAccount);

    if (!info && create) {
      await this.provider.sendAndConfirm(
        new Transaction().add(
          Token.createAssociatedTokenAccountInstruction(
            ASSOCIATED_TOKEN_PROGRAM_ID,
            TOKEN_PROGRAM_ID,
            mint,
            tokenAccount,
            this.provider.wallet.publicKey,
            this.provider.wallet.publicKey
          )
        )
      );
    }

    return tokenAccount;
  }

  public async getTokenBalance(
    tokenAccount: PublicKey,
    uiAmount: boolean = false
  ): Promise<BN> {
    const { value } = await this.provider.connection.getTokenAccountBalance(
      tokenAccount
    );

    return uiAmount
      ? new BN(value.amount).div(new BN(10 ** value.decimals))
      : new BN(value.amount);
  }

  async closeTokenAccount(tokenAccount: PublicKey) {
    const balance = await this.getTokenBalance(tokenAccount);

    console.log(`Closing token account ${tokenAccount.toString()}`);

    if (!balance.eq(new BN(0))) {
      throw new Error(
        `Account ${tokenAccount.toString} has balance: ${balance.toNumber}`
      );
    }

    return this.provider.sendAndConfirm(
      new Transaction().add(
        Token.createCloseAccountInstruction(
          TOKEN_PROGRAM_ID,
          tokenAccount,
          this.provider.wallet.publicKey,
          this.provider.wallet.publicKey,
          []
        )
      )
    );
  }

  public async getTokenBalances(uiAmount: boolean = false) {
    const whirlpool = await this.getPool();

    const whirlpoolData = whirlpool.getData();

    return {
      tokenBalanceA: await this.getTokenBalance(
        await this.getTokenAccountForMint(whirlpoolData.tokenMintA),
        uiAmount
      ),
      tokenBalanceB: await this.getTokenBalance(
        await this.getTokenAccountForMint(whirlpoolData.tokenMintB),
        uiAmount
      ),
    };
  }

  public async getTokenSymbols() {
    const whirlpool = await this.getPool();

    const whirlpoolData = whirlpool.getData();

    const { symbol: tokenASymbol } = await getTokenByMint(
      whirlpoolData.tokenMintA
    );
    const { symbol: tokenBSymbol } = await getTokenByMint(
      whirlpoolData.tokenMintB
    );

    return [tokenASymbol, tokenBSymbol];
  }

  // TODO: PositionState interface
  public async getState(): Promise<any> {
    const whirlpool = await this.getPool();
    const position = await this.getPosition();

    if (!position) {
      return null;
    }

    const state = await getWhirlpoolPositionState(
      whirlpool.getData(),
      position.getData(),
      whirlpool.getTokenAInfo(),
      whirlpool.getTokenBInfo()
    );

    return {
      tokens: (await this.getTokenSymbols()).join('/'),
      protocol: this.protocol,
      strategy: this.model.strategy || this.config.strategy,
      // pool: this.config.pool,
      ...state,
    };
  }
}
