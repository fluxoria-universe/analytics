import { gql } from 'graphql-tag';
import { createTestClient } from 'apollo-server-testing';
import { ApolloServer } from '@apollo/server';
import fs from 'fs';
import path from 'path';

describe('DEX Contract Configuration Integration', () => {
  let testClient: any;
  let server: ApolloServer;

  beforeAll(async () => {
    const schemaPath = path.join(__dirname, '../../contracts/schema.graphql');
    const typeDefs = fs.readFileSync(schemaPath, 'utf8');
    
    const resolvers = {
      Query: {
        dexContract: () => {
          throw new Error('DEXContract resolver not implemented');
        },
        dexContracts: () => {
          throw new Error('DEXContracts resolver not implemented');
        },
        health: () => ({
          status: 'ok',
          lastBlock: '0',
          lagSeconds: 0,
          timestamp: new Date().toISOString(),
        }),
      },
      Mutation: {
        addDEXContract: () => {
          throw new Error('AddDEXContract mutation not implemented');
        },
        pauseIndexing: () => {
          throw new Error('PauseIndexing mutation not implemented');
        },
        resumeIndexing: () => {
          throw new Error('ResumeIndexing mutation not implemented');
        },
      },
    };

    server = new ApolloServer({
      typeDefs,
      resolvers,
    });

    testClient = createTestClient(server);
  });

  afterAll(async () => {
    await server.stop();
  });

  describe('DEX contract lifecycle', () => {
    it('should add new DEX contract configuration', async () => {
      const mutation = gql`
        mutation AddDEXContract($address: String!, $chainId: Int!, $name: String, $protocol: DEXProtocol!, $startBlock: String!) {
          addDEXContract(address: $address, chainId: $chainId, name: $name, protocol: $protocol, startBlock: $startBlock) {
            id
            address
            chainId
            name
            protocol
            startBlock
            status
            configuredAt
          }
        }
      `;

      const result = await testClient.mutate({
        mutation,
        variables: {
          address: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
          chainId: 1,
          name: 'Uniswap V3 Factory',
          protocol: 'UNISWAP_V3',
          startBlock: '12369621',
        },
      });

      expect(result.errors).toBeUndefined();
      expect(result.data.addDEXContract).toBeDefined();
      expect(result.data.addDEXContract.address).toBe('0x1F98431c8aD98523631AE4a59f267346ea31F984');
      expect(result.data.addDEXContract.chainId).toBe(1);
      expect(result.data.addDEXContract.protocol).toBe('UNISWAP_V3');
      expect(result.data.addDEXContract.status).toBe('PENDING');
    });

    it('should validate contract address format', async () => {
      const mutation = gql`
        mutation AddDEXContract($address: String!, $chainId: Int!, $protocol: DEXProtocol!, $startBlock: String!) {
          addDEXContract(address: $address, chainId: $chainId, protocol: $protocol, startBlock: $startBlock) {
            id
          }
        }
      `;

      const result = await testClient.mutate({
        mutation,
        variables: {
          address: 'invalid-address',
          chainId: 1,
          protocol: 'UNISWAP_V3',
          startBlock: '12369621',
        },
      });

      expect(result.errors).toBeDefined();
      expect(result.errors[0].message).toContain('Invalid contract address');
    });

    it('should validate start block is not negative', async () => {
      const mutation = gql`
        mutation AddDEXContract($address: String!, $chainId: Int!, $protocol: DEXProtocol!, $startBlock: String!) {
          addDEXContract(address: $address, chainId: $chainId, protocol: $protocol, startBlock: $startBlock) {
            id
          }
        }
      `;

      const result = await testClient.mutate({
        mutation,
        variables: {
          address: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
          chainId: 1,
          protocol: 'UNISWAP_V3',
          startBlock: '-1',
        },
      });

      expect(result.errors).toBeDefined();
      expect(result.errors[0].message).toContain('Start block must be positive');
    });

    it('should prevent duplicate contract addresses', async () => {
      const mutation = gql`
        mutation AddDEXContract($address: String!, $chainId: Int!, $protocol: DEXProtocol!, $startBlock: String!) {
          addDEXContract(address: $address, chainId: $chainId, protocol: $protocol, startBlock: $startBlock) {
            id
          }
        }
      `;

      const variables = {
        address: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
        chainId: 1,
        protocol: 'UNISWAP_V3',
        startBlock: '12369621',
      };

      // First addition should succeed
      const firstResult = await testClient.mutate({
        mutation,
        variables,
      });

      expect(firstResult.errors).toBeUndefined();

      // Second addition should fail
      const secondResult = await testClient.mutate({
        mutation,
        variables,
      });

      expect(secondResult.errors).toBeDefined();
      expect(secondResult.errors[0].message).toContain('Contract already exists');
    });
  });

  describe('indexing control', () => {
    it('should pause indexing for a contract', async () => {
      const mutation = gql`
        mutation PauseIndexing($address: String!) {
          pauseIndexing(address: $address) {
            id
            address
            status
          }
        }
      `;

      const result = await testClient.mutate({
        mutation,
        variables: { address: '0x1F98431c8aD98523631AE4a59f267346ea31F984' },
      });

      expect(result.errors).toBeUndefined();
      expect(result.data.pauseIndexing).toBeDefined();
      expect(result.data.pauseIndexing.status).toBe('PAUSED');
    });

    it('should resume indexing for a contract', async () => {
      const mutation = gql`
        mutation ResumeIndexing($address: String!) {
          resumeIndexing(address: $address) {
            id
            address
            status
          }
        }
      `;

      const result = await testClient.mutate({
        mutation,
        variables: { address: '0x1F98431c8aD98523631AE4a59f267346ea31F984' },
      });

      expect(result.errors).toBeUndefined();
      expect(result.data.resumeIndexing).toBeDefined();
      expect(result.data.resumeIndexing.status).toBe('ACTIVE');
    });

    it('should handle pause/resume for non-existent contract', async () => {
      const mutation = gql`
        mutation PauseIndexing($address: String!) {
          pauseIndexing(address: $address) {
            id
            status
          }
        }
      `;

      const result = await testClient.mutate({
        mutation,
        variables: { address: '0x0000000000000000000000000000000000000000' },
      });

      expect(result.errors).toBeDefined();
      expect(result.errors[0].message).toContain('Contract not found');
    });
  });

  describe('contract status transitions', () => {
    it('should transition from PENDING to ACTIVE when indexing starts', async () => {
      const query = gql`
        query GetDEXContract($address: String!) {
          dexContract(address: $address) {
            id
            status
            lastIndexedBlock
          }
        }
      `;

      const result = await testClient.query({
        query,
        variables: { address: '0x1F98431c8aD98523631AE4a59f267346ea31F984' },
      });

      expect(result.errors).toBeUndefined();
      expect(result.data.dexContract).toBeDefined();
      expect(['PENDING', 'ACTIVE']).toContain(result.data.dexContract.status);
    });

    it('should update lastIndexedBlock during active indexing', async () => {
      const query = gql`
        query GetDEXContract($address: String!) {
          dexContract(address: $address) {
            id
            status
            lastIndexedBlock
          }
        }
      `;

      const result = await testClient.query({
        query,
        variables: { address: '0x1F98431c8aD98523631AE4a59f267346ea31F984' },
      });

      expect(result.errors).toBeUndefined();
      expect(result.data.dexContract).toBeDefined();
      
      if (result.data.dexContract.status === 'ACTIVE') {
        expect(result.data.dexContract.lastIndexedBlock).toBeDefined();
        expect(parseInt(result.data.dexContract.lastIndexedBlock)).toBeGreaterThan(0);
      }
    });
  });
});
