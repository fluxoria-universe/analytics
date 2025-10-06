import { createConfig, factory } from "ponder";
import { UniswapV3PoolAbi } from "./abis/UniswapV3PoolAbi";
import { UniswapV3FactoryAbi } from "./abis/UniswapV3FactoryAbi";
import { ERC20Abi } from "./abis/ERC20Abi";
import { getAbiItem } from "viem";

export default createConfig({
  chains: {
    mainnet: { id: 1, rpc: process.env.PONDER_RPC_URL_1 },
  },
  contracts: {
    UniswapV3Pool: {
      chain: "mainnet",
      abi: UniswapV3PoolAbi,
      address: factory({
        address: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
        event: getAbiItem({ abi: UniswapV3FactoryAbi, name: "PoolCreated" }),
        parameter: "pool",
      }),
      startBlock: 23000000,
    },
  },
});
