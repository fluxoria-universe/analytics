import { createConfig } from "ponder";
import { BaseContractAbi } from "./abis/BaseContractAbi";

export default createConfig({
  chains: {
    base: { id: 8453, rpc: process.env.PONDER_RPC_URL_8453 },
  },
  contracts: {
    BaseContract: {
      chain: "base",
      abi: BaseContractAbi,
      address: "0xb9b05ac285bc1598c20ec99cb29d214875c004e4",
      startBlock: 37244000, 
    },
  },
});
