import { ponder } from "ponder:registry";
import schema from "ponder:schema";
import { ERC20Abi } from "../abis/ERC20Abi";

ponder.on("UniswapV3Pool:Flash", async ({ event, context }) => {
  const poolAddress = event.log.address;

  const [token0, token1] = await Promise.all([
    context.client.readContract({
      abi: context.contracts.UniswapV3Pool.abi,
      functionName: "token0",
      address: poolAddress,
      cache: "immutable",
    }),
    context.client.readContract({
      abi: context.contracts.UniswapV3Pool.abi,
      functionName: "token1",
      address: poolAddress,
      cache: "immutable",
    }),
  ]);

  await context.db
    .insert(schema.tokenBorrowed)
    .values({
      address: token0,
      amount: event.args.amount0,
    })
    .onConflictDoUpdate((row) => ({ amount: row.amount + event.args.amount0 }));
  await context.db
    .insert(schema.tokenBorrowed)
    .values({
      address: token1,
      amount: event.args.amount1,
    })
    .onConflictDoUpdate((row) => ({ amount: row.amount + event.args.amount1 }));
  await context.db
    .insert(schema.tokenPaid)
    .values({
      address: token0,
      amount: event.args.paid0,
    })
    .onConflictDoUpdate((row) => ({ amount: row.amount + event.args.amount0 }));
  await context.db
    .insert(schema.tokenPaid)
    .values({
      address: token1,
      amount: event.args.paid1,
    })
    .onConflictDoUpdate((row) => ({ amount: row.amount + event.args.amount1 }));
});

ponder.on("UniswapV3Pool:Swap", async ({ event, context }) => {
  const poolAddress = event.log.address;

  // Get token addresses from the pool
  const [token0, token1] = await Promise.all([
    context.client.readContract({
      abi: context.contracts.UniswapV3Pool.abi,
      functionName: "token0",
      address: poolAddress,
      cache: "immutable",
    }),
    context.client.readContract({
      abi: context.contracts.UniswapV3Pool.abi,
      functionName: "token1",
      address: poolAddress,
      cache: "immutable",
    }),
  ]);

  // Get token names and symbols with error handling
  const [tokenName0, tokenName1, tokenSymbol0, tokenSymbol1] = await Promise.allSettled([
    context.client.readContract({
      abi: ERC20Abi,
      functionName: "name",
      address: token0,
    }),
    context.client.readContract({
      abi: ERC20Abi,
      functionName: "name",
      address: token1,
    }),
    context.client.readContract({
      abi: ERC20Abi,
      functionName: "symbol",
      address: token0,
    }),
    context.client.readContract({
      abi: ERC20Abi,
      functionName: "symbol",
      address: token1,
    }),
  ]).then((results) => [
    results[0].status === "fulfilled" ? results[0].value : "Unknown Token",
    results[1].status === "fulfilled" ? results[1].value : "Unknown Token",
    results[2].status === "fulfilled" ? results[2].value : "UNKNOWN",
    results[3].status === "fulfilled" ? results[3].value : "UNKNOWN",
  ]);

  await context.db.insert(schema.swap).values({
    id: event.id,
    sender: event.args.sender,
    recipient: event.args.recipient,
    amount0: event.args.amount0,
    amount1: event.args.amount1,
    sqrtPriceX96: event.args.sqrtPriceX96,
    liquidity: event.args.liquidity,
    tick: BigInt(event.args.tick),
    tokenName0,
    tokenName1,
    tokenSymbol0,
    tokenSymbol1,
    transactionHash: event.transaction.hash,
  });
});

