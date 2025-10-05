import { createConfig } from '@ponder/core';

export default createConfig({
  networks: {
    mainnet: {
      chainId: 1,
      rpc: process.env.ETHEREUM_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo',
      pollingInterval: 1000,
    },
  },
  contracts: {
    UniswapV3Factory: {
      network: 'mainnet',
      address: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
      abi: './abis/UniswapV3Factory.json',
      startBlock: parseInt(process.env.START_BLOCK || '12369621'),
    },
    UniswapV3Pool: {
      network: 'mainnet',
      abi: './abis/UniswapV3Pool.json',
      factory: {
        address: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
        event: 'PoolCreated',
        parameter: 'pool',
      },
    },
  },
});
