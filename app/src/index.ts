import BN from 'bn.js';
import { u64 as U64 } from '@solana/spl-token';

export * from './PositionManager';
export * as Tasks from './Tasks';
export * as Database from './Database';
export * as Protocols from './Protocols';

/**
 * U64_MAX = new BN('18446744073709551615');
 * @see https://doc.rust-lang.org/std/primitive.u64.html#associatedconstant.MAX
 */
export const U64_MAX = new U64(
  new U64(2).pow(new U64(64)).sub(new BN(1)).toString()
);
