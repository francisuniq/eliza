import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import seiNftPlugin, { SeiNftService } from './sei-nft-plugin';
import { IAgentRuntime, Memory, State } from '@elizaos/core';

// Mock dependencies
jest.mock('ethers');
jest.mock('axios');

describe('SEI NFT Plugin', () => {
  let mockRuntime: jest.Mocked<IAgentRuntime>;
  let mockService: SeiNftService;

  beforeEach(() => {
    // Setup mock runtime
    mockRuntime = {
      getService: jest.fn(),
    } as any;

    // Setup environment variables for testing
    process.env.PRIVATE_KEY = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    process.env.SEI_RPC_URL = 'https://test-rpc.sei.com';
    process.env.NFT_CONTRACT_ADDRESS = '0x1234567890123456789012345678901234567890';
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.PRIVATE_KEY;
    delete process.env.SEI_RPC_URL;
    delete process.env.NFT_CONTRACT_ADDRESS;
  });

  describe('Plugin Configuration', () => {
    it('should have correct plugin metadata', () => {
      expect(seiNftPlugin.name).toBe('plugin-sei-nft');
      expect(seiNftPlugin.description).toContain('SEI blockchain NFT plugin');
      expect(seiNftPlugin.services).toHaveLength(1);
      expect(seiNftPlugin.actions).toHaveLength(5);
    });

    it('should initialize with valid configuration', async () => {
      const config = {
        PRIVATE_KEY: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        SEI_RPC_URL: 'https://evm-rpc.sei-apis.com',
      };

      await expect(seiNftPlugin.init(config)).resolves.toBeUndefined();
    });

    it('should throw error with invalid private key', async () => {
      const config = {
        PRIVATE_KEY: 'invalid_key',
      };

      await expect(seiNftPlugin.init(config)).rejects.toThrow();
    });
  });

  describe('SeiNftService', () => {
    beforeEach(() => {
      // Mock ethers for service initialization
      const mockProvider = {
        getBalance: jest.fn().mockResolvedValue('1000000000000000000'), // 1 ETH in wei
      };
      const mockWallet = {
        address: '0x742d35cc6634c0532925a3b8d6A39E5d4f7c7b76',
        connect: jest.fn().mockReturnValue(mockWallet),
      };

      (require('ethers') as any).JsonRpcProvider = jest.fn().mockImplementation(() => mockProvider);
      (require('ethers') as any).Wallet = jest.fn().mockImplementation(() => mockWallet);
      (require('ethers') as any).formatEther = jest.fn().mockReturnValue('1.0');
    });

    it('should create service instance', () => {
      expect(() => new SeiNftService(mockRuntime)).not.toThrow();
    });

    it('should get wallet address', () => {
      const service = new SeiNftService(mockRuntime);
      const address = service.getWalletAddress();
      expect(address).toBe('0x742d35cc6634c0532925a3b8d6A39E5d4f7c7b76');
    });

    it('should get wallet balance', async () => {
      const service = new SeiNftService(mockRuntime);
      const balance = await service.getWalletBalance();
      expect(balance).toBe('1.0');
    });
  });

  describe('Actions', () => {
    describe('MINT_NFT Action', () => {
      it('should validate mint NFT messages correctly', async () => {
        const mintAction = seiNftPlugin.actions.find(action => action.name === 'MINT_NFT')!;
        
        const validMessage: Memory = {
          content: { text: 'Mint an NFT with name: Test NFT' },
        } as Memory;

        const invalidMessage: Memory = {
          content: { text: 'What time is it?' },
        } as Memory;

        expect(await mintAction.validate(mockRuntime, validMessage, undefined)).toBe(true);
        expect(await mintAction.validate(mockRuntime, invalidMessage, undefined)).toBe(false);
      });
    });

    describe('VIEW_OWNED_NFTS Action', () => {
      it('should validate view NFTs messages correctly', async () => {
        const viewAction = seiNftPlugin.actions.find(action => action.name === 'VIEW_OWNED_NFTS')!;
        
        const validMessage: Memory = {
          content: { text: 'Show me my NFTs' },
        } as Memory;

        const invalidMessage: Memory = {
          content: { text: 'What is the weather?' },
        } as Memory;

        expect(await viewAction.validate(mockRuntime, validMessage, undefined)).toBe(true);
        expect(await viewAction.validate(mockRuntime, invalidMessage, undefined)).toBe(false);
      });
    });

    describe('PURCHASE_NFT Action', () => {
      it('should validate purchase NFT messages correctly', async () => {
        const purchaseAction = seiNftPlugin.actions.find(action => action.name === 'PURCHASE_NFT')!;
        
        const validMessage: Memory = {
          content: { text: 'Buy NFT token ID: 123' },
        } as Memory;

        const invalidMessage: Memory = {
          content: { text: 'Hello there' },
        } as Memory;

        expect(await purchaseAction.validate(mockRuntime, validMessage, undefined)).toBe(true);
        expect(await purchaseAction.validate(mockRuntime, invalidMessage, undefined)).toBe(false);
      });
    });
  });

  describe('API Routes', () => {
    it('should have correct API routes defined', () => {
      const routes = seiNftPlugin.routes;
      expect(routes).toHaveLength(3);
      
      const routePaths = routes.map(route => route.path);
      expect(routePaths).toContain('/api/nft/mint');
      expect(routePaths).toContain('/api/nft/owned');
      expect(routePaths).toContain('/api/nft/available');
    });
  });

  describe('Models', () => {
    it('should provide model responses', async () => {
      const smallModelResponse = await seiNftPlugin.models.small(mockRuntime, { prompt: 'test' });
      const largeModelResponse = await seiNftPlugin.models.large(mockRuntime, { prompt: 'test' });

      expect(smallModelResponse).toContain('SEI blockchain NFT operations');
      expect(largeModelResponse).toContain('SEI blockchain NFT operations');
    });
  });
});

describe('Integration Tests', () => {
  // These tests would require actual network connections and should be run separately
  describe.skip('Real Network Tests', () => {
    it('should connect to SEI network', async () => {
      // Test actual network connection
    });

    it('should fetch real NFT data', async () => {
      // Test NFTScan API integration
    });

    it('should interact with Magic Eden API', async () => {
      // Test Magic Eden marketplace integration
    });
  });
});