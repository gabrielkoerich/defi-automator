import { Schema, model } from 'mongoose';
import { TransactionInterface } from './Transaction';

export interface PositionInterface {
  chain: string;
  protocol: string;
  pool: string;
  address?: string;
  strategy?: string;
  transactions?: TransactionInterface[];
  createdAt: typeof Date;
  updatedAt: typeof Date;
  getState();
}

export const Position = model<PositionInterface>(
  'Position',
  new Schema<PositionInterface>(
    {
      chain: {
        type: String,
        required: true,
      },
      protocol: {
        type: String,
        required: true,
      },
      pool: {
        type: String,
        required: true,
        unique: true,
      },
      address: {
        type: String,
      },
      strategy: {
        type: String,
      },
      transactions: [
        {
          type: Schema.Types.ObjectId,
          ref: 'Snapshot',
        },
      ],
    },
    {
      timestamps: true,
      methods: {
        getState() {
          console.log(this.address);
        },
      },
    }
  )
);

export default Position;
