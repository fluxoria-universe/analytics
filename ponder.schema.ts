import { onchainTable } from "ponder";

export const tokenPaid = onchainTable("token_paid", (t) => ({
  address: t.hex().primaryKey(),
  amount: t.bigint().notNull(),
}));

export const tokenBorrowed = onchainTable("token_borrowed", (t) => ({
  address: t.hex().primaryKey(),
  amount: t.bigint().notNull(),
}));

export const swap = onchainTable("swap", (t) => ({
  id: t.text().primaryKey(),
  sender: t.hex().notNull(),
  recipient: t.hex().notNull(),
  amount0: t.bigint().notNull(),
  amount1: t.bigint().notNull(),
  sqrtPriceX96: t.bigint(),
  liquidity: t.bigint(),
  tick: t.bigint(),
  tokenName0: t.text(),
  tokenName1: t.text(),
  tokenSymbol0: t.text(),
  tokenSymbol1: t.text(),
  transactionHash: t.hex().notNull(),
}));