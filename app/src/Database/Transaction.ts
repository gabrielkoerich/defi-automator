import mongoose from 'mongoose';

export interface TransactionInterface {
  type: string;
  tokenMint: string;
  tokenDecimals: number;
  tokenPriceUsd: number;
  amount: number;
  createdAt: typeof Date;
  updatedAt: typeof Date;
}

export const Transaction = mongoose.model<TransactionInterface>(
  'Transaction',
  new mongoose.Schema(
    {
      type: {
        type: String,
        required: true,
      },
      tokenMint: {
        type: String,
        required: true,
      },
      tokenDecimals: {
        type: Number,
        required: true,
      },
      tokenPriceUsd: {
        type: Number,
        required: true,
      },
      amount: {
        type: Number,
        required: true,
      },
    },
    {
      timestamps: true,
    }
  )
);

export default Transaction;
