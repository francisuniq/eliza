import type { Plugin } from '@elizaos/core';
import {
  type Action,
  type ActionResult,
  type Content,
  type GenerateTextParams,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  ModelType,
  type Provider,
  type ProviderResult,
  Service,
  type State,
  logger,
  type MessagePayload,
  type WorldPayload,
  EventType,
} from '@elizaos/core';
import { z } from 'zod';
import axios from 'axios';
import { SigningCosmWasmClient, CosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { stringToPath } from '@cosmjs/crypto';
import { GasPrice } from '@cosmjs/stargate';
import { create } from 'ipfs-http-client';
import pinataSDK from 'pinata-sdk';
import FormData from 'form-data';
import { fromBase64, toBase64 } from '@cosmjs/encoding';
import Big from 'big.js';
import { bech32 } from 'bech32';
import fetch from 'node-fetch';
import * as fs from 'fs';
import * as path from 'path';
import { lookup } from 'mime-types';

// Additional actions will be defined below

/**
 * Configuration schema for the SEI NFT plugin
 */
const configSchema = z.object({
  PRIVATE_KEY: z.string().min(64).max(66),
  SEI_RPC_URL: z.string().url().default('https://rpc.sei-apis.com'),
  SEI_REST_URL: z.string().url().default('https://rest.sei-apis.com'),
  SEI_CHAIN_ID: z.string().default('pacific-1'),
  MAGIC_EDEN_API_KEY: z.string().optional(),
  MAGIC_EDEN_API_URL: z.string().url().default('https://api-mainnet.magiceden.dev'),
  NFTSCAN_API_KEY: z.string().optional(),
  NFTSCAN_API_URL: z.string().url().default('https://seiapi.nftscan.com'),
  PINATA_API_KEY: z.string().optional(),
  PINATA_SECRET_API_KEY: z.string().optional(),
  PINATA_JWT: z.string().optional(),
  CW721_CONTRACT_ADDRESS: z.string().optional(),
  DEFAULT_COLLECTION_NAME: z.string().default('SEI NFT Collection'),
  DEFAULT_COLLECTION_SYMBOL: z.string().default('SNC'),
  GAS_PRICE: z.string().default('0.1usei'),
  GAS_ADJUSTMENT: z.number().default(1.3),
  MARKETPLACE_FEE_BASIS_POINTS: z.number().default(250),
  DEFAULT_ROYALTY_BASIS_POINTS: z.number().default(500),
});

/**
 * NFT Metadata interface following ERC721 standard
 */
interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  external_url?: string;
  animation_url?: string;
  background_color?: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
    display_type?: string;
  }>;
}

/**
 * CW721 Token Info interface
 */
interface CW721TokenInfo {
  token_id: string;
  owner: string;
  approvals: Array<{
    spender: string;
    expires: any;
  }>;
  token_uri?: string;
  extension?: any;
}

/**
 * NFT Collection interface
 */
interface NFTCollection {
  contract_address: string;
  name: string;
  symbol: string;
  description?: string;
  image?: string;
  external_link?: string;
  total_supply: number;
  floor_price?: string;
  volume_24h?: string;
}

/**
 * Marketplace Listing interface
 */
interface MarketplaceListing {
  token_id: string;
  contract_address: string;
  seller: string;
  price: string;
  currency: string;
  marketplace: string;
  listing_time: number;
  metadata?: NFTMetadata;
}

/**
 * IPFS Upload Result interface
 */
interface IPFSUploadResult {
  ipfsHash: string;
  pinSize: number;
  timestamp: string;
  ipfsUrl: string;
}

/**
 * Transaction Result interface
 */
interface TransactionResult {
  transactionHash: string;
  gasUsed: number;
  gasWanted: number;
  height: number;
  code: number;
  rawLog: string;
}

/**
 * IPFS Service for metadata and image storage
 */
class IPFSService {
  private pinata?: any;
  private ipfsClient?: any;

  constructor() {
    this.initializePinata();
    this.initializeIPFSClient();
  }

  private initializePinata() {
    const apiKey = process.env.PINATA_API_KEY;
    const secretKey = process.env.PINATA_SECRET_API_KEY;
    
    if (apiKey && secretKey) {
      this.pinata = new pinataSDK(apiKey, secretKey);
      logger.info('Pinata IPFS client initialized');
    }
  }

  private initializeIPFSClient() {
    try {
      this.ipfsClient = create({ 
        host: 'ipfs.infura.io', 
        port: 5001, 
        protocol: 'https' 
      });
      logger.info('IPFS client initialized');
    } catch (error) {
      logger.warn('Failed to initialize IPFS client:', error);
    }
  }

  async uploadJSON(metadata: NFTMetadata): Promise<IPFSUploadResult> {
    if (this.pinata) {
      return this.uploadWithPinata(metadata);
    } else if (this.ipfsClient) {
      return this.uploadWithIPFS(metadata);
    }
    throw new Error('No IPFS service available. Please configure Pinata or IPFS client.');
  }

  private async uploadWithPinata(metadata: NFTMetadata): Promise<IPFSUploadResult> {
    try {
      const result = await this.pinata.pinJSONToIPFS(metadata, {
        pinataMetadata: {
          name: `${metadata.name}_metadata.json`,
        },
        pinataOptions: {
          cidVersion: 0,
        },
      });

      return {
        ipfsHash: result.IpfsHash,
        pinSize: result.PinSize,
        timestamp: result.Timestamp,
        ipfsUrl: `ipfs://${result.IpfsHash}`,
      };
    } catch (error) {
      logger.error('Pinata upload failed:', error);
      throw new Error(`Failed to upload metadata to Pinata: ${error}`);
    }
  }

  private async uploadWithIPFS(metadata: NFTMetadata): Promise<IPFSUploadResult> {
    try {
      const result = await this.ipfsClient.add(JSON.stringify(metadata));
      
      return {
        ipfsHash: result.cid.toString(),
        pinSize: 0,
        timestamp: new Date().toISOString(),
        ipfsUrl: `ipfs://${result.cid.toString()}`,
      };
    } catch (error) {
      logger.error('IPFS upload failed:', error);
      throw new Error(`Failed to upload metadata to IPFS: ${error}`);
    }
  }

  async uploadFile(filePath: string): Promise<IPFSUploadResult> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const fileName = path.basename(filePath);
    const mimeType = lookup(filePath) || 'application/octet-stream';

    if (this.pinata) {
      try {
        const readableStreamForFile = fs.createReadStream(filePath);
        const result = await this.pinata.pinFileToIPFS(readableStreamForFile, {
          pinataMetadata: {
            name: fileName,
          },
        });

        return {
          ipfsHash: result.IpfsHash,
          pinSize: result.PinSize,
          timestamp: result.Timestamp,
          ipfsUrl: `ipfs://${result.IpfsHash}`,
        };
      } catch (error) {
        logger.error('Pinata file upload failed:', error);
        throw new Error(`Failed to upload file to Pinata: ${error}`);
      }
    }

    throw new Error('File upload requires Pinata configuration');
  }
}

/**
 * Magic Eden API Service
 */
class MagicEdenService {
  private apiKey?: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.MAGIC_EDEN_API_KEY;
    this.baseUrl = process.env.MAGIC_EDEN_API_URL || 'https://api-mainnet.magiceden.dev';
  }

  private getHeaders() {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    return headers;
  }

  async getCollections(limit: number = 20): Promise<NFTCollection[]> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/v3/rtp/sei/collections`,
        {
          headers: this.getHeaders(),
          params: { limit },
        }
      );

      return response.data.collections || [];
    } catch (error) {
      logger.error('Failed to fetch Magic Eden collections:', error);
      throw new Error(`Failed to fetch collections: ${error}`);
    }
  }

  async getListings(collection?: string, limit: number = 20): Promise<MarketplaceListing[]> {
    try {
      const params: any = { limit };
      if (collection) {
        params.collection = collection;
      }

      const response = await axios.get(
        `${this.baseUrl}/v3/rtp/sei/tokens/listings`,
        {
          headers: this.getHeaders(),
          params,
        }
      );

      return response.data.tokens || [];
    } catch (error) {
      logger.error('Failed to fetch Magic Eden listings:', error);
      return []; // Return empty array instead of throwing
    }
  }

  async getTokenDetails(mintAddress: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/v3/rtp/sei/tokens/${mintAddress}`,
        {
          headers: this.getHeaders(),
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Failed to fetch token details:', error);
      throw new Error(`Failed to fetch token details: ${error}`);
    }
  }

  async getCollectionStats(collection: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/v3/rtp/sei/collections/${collection}/stats`,
        {
          headers: this.getHeaders(),
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Failed to fetch collection stats:', error);
      throw new Error(`Failed to fetch collection stats: ${error}`);
    }
  }
}

/**
 * NFTScan API Service
 */
class NFTScanService {
  private apiKey?: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.NFTSCAN_API_KEY;
    this.baseUrl = process.env.NFTSCAN_API_URL || 'https://seiapi.nftscan.com';
  }

  private getHeaders() {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };

    if (this.apiKey) {
      headers['X-API-KEY'] = this.apiKey;
    }

    return headers;
  }

  async getAccountNFTs(address: string, limit: number = 20): Promise<any[]> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/v2/account/own/${address}`,
        {
          headers: this.getHeaders(),
          params: {
            erc_type: 'erc721',
            show_attribute: 'true',
            sort_field: 'timestamp',
            sort_direction: 'desc',
            limit,
          },
        }
      );

      return response.data?.content || [];
    } catch (error) {
      logger.error('Failed to fetch account NFTs from NFTScan:', error);
      return []; // Return empty array instead of throwing
    }
  }

  async getAccountTransactions(address: string, limit: number = 20): Promise<any[]> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/v2/account/transactions/${address}`,
        {
          headers: this.getHeaders(),
          params: {
            erc_type: 'erc721',
            sort_field: 'timestamp',
            sort_direction: 'desc',
            limit,
          },
        }
      );

      return response.data?.content || [];
    } catch (error) {
      logger.error('Failed to fetch account transactions from NFTScan:', error);
      return [];
    }
  }

  async getCollectionInfo(contractAddress: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/v2/collection/${contractAddress}`,
        {
          headers: this.getHeaders(),
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Failed to fetch collection info from NFTScan:', error);
      throw new Error(`Failed to fetch collection info: ${error}`);
    }
  }
}

/**
 * SEI NFT Service - Main service for blockchain interactions
 */
export class SeiNftService extends Service {
  static override serviceType = 'sei-nft';

  override capabilityDescription =
    'Complete SEI blockchain NFT functionality including minting, trading, collection management, and marketplace integration.';

  private client?: SigningCosmWasmClient;
  private queryClient?: CosmWasmClient;
  private wallet?: DirectSecp256k1HdWallet;
  private senderAddress?: string;
  private config: any;
  private ipfsService: IPFSService;
  private magicEdenService: MagicEdenService;
  private nftScanService: NFTScanService;

  constructor(runtime?: IAgentRuntime) {
    super(runtime);
    this.config = this.loadConfig();
    this.ipfsService = new IPFSService();
    this.magicEdenService = new MagicEdenService();
    this.nftScanService = new NFTScanService();
  }

  private loadConfig() {
    return {
      rpcUrl: process.env.SEI_RPC_URL || 'https://rpc.sei-apis.com',
      restUrl: process.env.SEI_REST_URL || 'https://rest.sei-apis.com',
      chainId: process.env.SEI_CHAIN_ID || 'pacific-1',
      privateKey: process.env.PRIVATE_KEY,
      gasPrice: process.env.GAS_PRICE || '0.1usei',
      gasAdjustment: parseFloat(process.env.GAS_ADJUSTMENT || '1.3'),
      contractAddress: process.env.CW721_CONTRACT_ADDRESS,
    };
  }

  static override async start(runtime: IAgentRuntime): Promise<Service> {
    logger.info('Starting SEI NFT service');
    const service = new SeiNftService(runtime);
    await service.initialize();
    return service;
  }

  static override async stop(runtime: IAgentRuntime): Promise<void> {
    logger.info('Stopping SEI NFT service');
    const service = runtime.getService(SeiNftService.serviceType);
    if (!service) {
      throw new Error('SEI NFT service not found');
    }
    if ('stop' in service && typeof service.stop === 'function') {
      await service.stop();
    }
  }

  override async stop(): Promise<void> {
    logger.info('SEI NFT service stopped');
  }

  private async initialize(): Promise<void> {
    try {
      if (!this.config.privateKey) {
        throw new Error('PRIVATE_KEY environment variable is required');
      }

      // Create wallet from private key
      this.wallet = await DirectSecp256k1HdWallet.fromMnemonic(
        this.config.privateKey,
        {
          prefix: 'sei',
        }
      );

      const accounts = await this.wallet.getAccounts();
      this.senderAddress = accounts[0].address;

      // Initialize query client
      this.queryClient = await CosmWasmClient.connect(this.config.rpcUrl);

      // Initialize signing client
      this.client = await SigningCosmWasmClient.connectWithSigner(
        this.config.rpcUrl,
        this.wallet,
        {
          gasPrice: GasPrice.fromString(this.config.gasPrice),
          gasAdjustment: this.config.gasAdjustment,
        }
      );

      logger.info(`SEI NFT service initialized with address: ${this.senderAddress}`);
    } catch (error) {
      logger.error('Failed to initialize SEI NFT service:', error);
      throw error;
    }
  }

  /**
   * Get wallet address
   */
  getWalletAddress(): string {
    if (!this.senderAddress) {
      throw new Error('Service not initialized');
    }
    return this.senderAddress;
  }

  /**
   * Get wallet balance
   */
  async getWalletBalance(): Promise<string> {
    if (!this.client || !this.senderAddress) {
      throw new Error('Service not initialized');
    }

    try {
      const balance = await this.client.getBalance(this.senderAddress, 'usei');
      return new Big(balance.amount).div(1000000).toString();
    } catch (error) {
      logger.error('Failed to get wallet balance:', error);
      throw new Error(`Failed to get wallet balance: ${error}`);
    }
  }

  /**
   * Deploy CW721 NFT contract
   */
  async deployNFTContract(
    name: string,
    symbol: string,
    minter?: string
  ): Promise<{ contractAddress: string; transactionHash: string }> {
    if (!this.client || !this.senderAddress) {
      throw new Error('Service not initialized');
    }

    try {
      // Load CW721 base contract code (this would need to be uploaded first)
      const codeId = 1; // Replace with actual code ID after uploading contract

      const instantiateMsg = {
        name,
        symbol,
        minter: minter || this.senderAddress,
      };

      const result = await this.client.instantiate(
        this.senderAddress,
        codeId,
        instantiateMsg,
        `${name} NFT Contract`,
        'auto'
      );

      return {
        contractAddress: result.contractAddress,
        transactionHash: result.transactionHash,
      };
    } catch (error) {
      logger.error('Failed to deploy NFT contract:', error);
      throw new Error(`Failed to deploy NFT contract: ${error}`);
    }
  }

  /**
   * Mint NFT with metadata upload to IPFS
   */
  async mintNFT(
    metadata: NFTMetadata,
    recipient?: string,
    contractAddress?: string
  ): Promise<{ tokenId: string; transactionHash: string; metadataUri: string }> {
    if (!this.client || !this.senderAddress) {
      throw new Error('Service not initialized');
    }

    const targetContract = contractAddress || this.config.contractAddress;
    if (!targetContract) {
      throw new Error('Contract address is required for minting');
    }

    try {
      // Upload metadata to IPFS
      const ipfsResult = await this.ipfsService.uploadJSON(metadata);
      
      // Generate unique token ID
      const tokenId = `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const mintMsg = {
        mint: {
          token_id: tokenId,
          owner: recipient || this.senderAddress,
          token_uri: ipfsResult.ipfsUrl,
          extension: {},
        },
      };

      const result = await this.client.execute(
        this.senderAddress,
        targetContract,
        mintMsg,
        'auto'
      );

      logger.info(`NFT minted successfully: ${tokenId}`);
      
      return {
        tokenId,
        transactionHash: result.transactionHash,
        metadataUri: ipfsResult.ipfsUrl,
      };
    } catch (error) {
      logger.error('Failed to mint NFT:', error);
      throw new Error(`Failed to mint NFT: ${error}`);
    }
  }

  /**
   * Batch mint NFTs
   */
  async batchMintNFTs(
    metadataList: NFTMetadata[],
    recipients?: string[],
    contractAddress?: string
  ): Promise<Array<{ tokenId: string; transactionHash: string; metadataUri: string }>> {
    const results = [];
    
    for (let i = 0; i < metadataList.length; i++) {
      const metadata = metadataList[i];
      const recipient = recipients ? recipients[i] : undefined;
      
      try {
        const result = await this.mintNFT(metadata, recipient, contractAddress);
        results.push(result);
        
        // Add small delay between mints to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        logger.error(`Failed to mint NFT ${i + 1}:`, error);
        throw error;
      }
    }
    
    return results;
  }

  /**
   * Transfer NFT
   */
  async transferNFT(
    tokenId: string,
    recipient: string,
    contractAddress?: string
  ): Promise<TransactionResult> {
    if (!this.client || !this.senderAddress) {
      throw new Error('Service not initialized');
    }

    const targetContract = contractAddress || this.config.contractAddress;
    if (!targetContract) {
      throw new Error('Contract address is required');
    }

    try {
      const transferMsg = {
        transfer_nft: {
          recipient,
          token_id: tokenId,
        },
      };

      const result = await this.client.execute(
        this.senderAddress,
        targetContract,
        transferMsg,
        'auto'
      );

      return {
        transactionHash: result.transactionHash,
        gasUsed: result.gasUsed,
        gasWanted: result.gasWanted,
        height: result.height,
        code: result.code,
        rawLog: result.rawLog,
      };
    } catch (error) {
      logger.error('Failed to transfer NFT:', error);
      throw new Error(`Failed to transfer NFT: ${error}`);
    }
  }

  /**
   * Get owned NFTs using multiple sources
   */
  async getOwnedNFTs(
    address?: string,
    contractAddress?: string
  ): Promise<Array<CW721TokenInfo & { metadata?: NFTMetadata }>> {
    const targetAddress = address || this.senderAddress;
    if (!targetAddress) {
      throw new Error('Address is required');
    }

    try {
      // Try to get NFTs from NFTScan first
      const nftScanNFTs = await this.nftScanService.getAccountNFTs(targetAddress);
      
      if (nftScanNFTs.length > 0) {
        return nftScanNFTs.map(nft => ({
          token_id: nft.token_id,
          owner: nft.owner,
          approvals: [],
          token_uri: nft.token_uri,
          metadata: nft.metadata,
        }));
      }

      // Fallback to direct contract query if contract address is provided
      if (contractAddress && this.queryClient) {
        const tokensResult = await this.queryClient.queryContractSmart(
          contractAddress,
          {
            tokens: {
              owner: targetAddress,
              limit: 50,
            },
          }
        );

        const tokens = tokensResult.tokens || [];
        const nftsWithMetadata = [];

        for (const tokenId of tokens) {
          try {
            const tokenInfo = await this.queryClient.queryContractSmart(
              contractAddress,
              {
                nft_info: { token_id: tokenId },
              }
            );

            // Fetch metadata if token_uri is provided
            let metadata;
            if (tokenInfo.token_uri) {
              try {
                const metadataUrl = tokenInfo.token_uri.replace('ipfs://', 'https://ipfs.io/ipfs/');
                const response = await axios.get(metadataUrl);
                metadata = response.data;
              } catch (metadataError) {
                logger.warn(`Failed to fetch metadata for token ${tokenId}:`, metadataError);
              }
            }

            nftsWithMetadata.push({
              token_id: tokenId,
              owner: targetAddress,
              approvals: tokenInfo.approvals || [],
              token_uri: tokenInfo.token_uri,
              metadata,
            });
          } catch (tokenError) {
            logger.warn(`Failed to fetch info for token ${tokenId}:`, tokenError);
          }
        }

        return nftsWithMetadata;
      }

      return [];
    } catch (error) {
      logger.error('Failed to get owned NFTs:', error);
      throw new Error(`Failed to get owned NFTs: ${error}`);
    }
  }

  /**
   * Get NFT details
   */
  async getNFTDetails(
    tokenId: string,
    contractAddress?: string
  ): Promise<CW721TokenInfo & { metadata?: NFTMetadata }> {
    if (!this.queryClient) {
      throw new Error('Service not initialized');
    }

    const targetContract = contractAddress || this.config.contractAddress;
    if (!targetContract) {
      throw new Error('Contract address is required');
    }

    try {
      const tokenInfo = await this.queryClient.queryContractSmart(
        targetContract,
        {
          nft_info: { token_id: tokenId },
        }
      );

      const ownerInfo = await this.queryClient.queryContractSmart(
        targetContract,
        {
          owner_of: { token_id: tokenId },
        }
      );

      let metadata;
      if (tokenInfo.token_uri) {
        try {
          const metadataUrl = tokenInfo.token_uri.replace('ipfs://', 'https://ipfs.io/ipfs/');
          const response = await axios.get(metadataUrl);
          metadata = response.data;
        } catch (metadataError) {
          logger.warn(`Failed to fetch metadata for token ${tokenId}:`, metadataError);
        }
      }

      return {
        token_id: tokenId,
        owner: ownerInfo.owner,
        approvals: ownerInfo.approvals || [],
        token_uri: tokenInfo.token_uri,
        metadata,
      };
    } catch (error) {
      logger.error('Failed to get NFT details:', error);
      throw new Error(`Failed to get NFT details: ${error}`);
    }
  }

  /**
   * Get marketplace listings from Magic Eden
   */
  async getMarketplaceListings(
    collection?: string,
    limit: number = 20
  ): Promise<MarketplaceListing[]> {
    try {
      return await this.magicEdenService.getListings(collection, limit);
    } catch (error) {
      logger.error('Failed to get marketplace listings:', error);
      return [];
    }
  }

  /**
   * Get collection statistics
   */
  async getCollectionStats(collection: string): Promise<any> {
    try {
      return await this.magicEdenService.getCollectionStats(collection);
    } catch (error) {
      logger.error('Failed to get collection stats:', error);
      throw new Error(`Failed to get collection stats: ${error}`);
    }
  }

  /**
   * Get transaction history for an address
   */
  async getTransactionHistory(
    address?: string,
    limit: number = 20
  ): Promise<any[]> {
    const targetAddress = address || this.senderAddress;
    if (!targetAddress) {
      throw new Error('Address is required');
    }

    try {
      return await this.nftScanService.getAccountTransactions(targetAddress, limit);
    } catch (error) {
      logger.error('Failed to get transaction history:', error);
      return [];
    }
  }

  /**
   * Estimate gas for a transaction
   */
  async estimateGas(
    contractAddress: string,
    msg: any
  ): Promise<number> {
    if (!this.client || !this.senderAddress) {
      throw new Error('Service not initialized');
    }

    try {
      const simulation = await this.client.simulate(
        this.senderAddress,
        [
          {
            typeUrl: '/cosmwasm.wasm.v1.MsgExecuteContract',
            value: {
              sender: this.senderAddress,
              contract: contractAddress,
              msg: toBase64(new TextEncoder().encode(JSON.stringify(msg))),
              funds: [],
            },
          },
        ],
        undefined
      );

      return Math.ceil(simulation * this.config.gasAdjustment);
    } catch (error) {
      logger.error('Failed to estimate gas:', error);
      throw new Error(`Failed to estimate gas: ${error}`);
    }
  }
}

// Actions implementation continues...
const mintNFTAction: Action = {
  name: 'MINT_NFT',
  similes: ['CREATE_NFT', 'MINT_TOKEN', 'CREATE_TOKEN', 'MAKE_NFT'],
  description: 'Mints a new NFT on the SEI blockchain with metadata stored on IPFS',

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State | undefined
  ): Promise<boolean> => {
    if (!message.content.text) return false;
    
    const text = message.content.text.toLowerCase();
    return text.includes('mint nft') || 
           text.includes('create nft') || 
           text.includes('mint token') ||
           text.includes('create token') ||
           text.includes('make nft');
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State | undefined,
    _options: Record<string, unknown> = {},
    callback?: HandlerCallback,
    _responses?: Memory[]
  ): Promise<ActionResult> => {
    try {
      if (!message.content.text) {
        return {
          success: false,
          error: new Error('Message content text is undefined'),
          text: 'I need a message with text to process your NFT minting request.',
        };
      }

      const service = runtime.getService(SeiNftService.serviceType) as SeiNftService;
      if (!service) {
        throw new Error('SEI NFT service not available');
      }

      // Parse NFT details from message
      const text = message.content.text;
      const nameMatch = text.match(/name[:\s]+([^,\n]+)/i);
      const descMatch = text.match(/description[:\s]+([^,\n]+)/i);
      const imageMatch = text.match(/image[:\s]+(https?:\/\/[^\s,\n]+)/i);
      const contractMatch = text.match(/contract[:\s]+(sei[a-z0-9]{39,})/i);

      const metadata: NFTMetadata = {
        name: nameMatch?.[1]?.trim() || 'AI Generated NFT',
        description: descMatch?.[1]?.trim() || 'An NFT created by AI agent',
        image: imageMatch?.[1]?.trim() || 'https://via.placeholder.com/512x512.png?text=NFT',
        attributes: [
          {
            trait_type: 'Created By',
            value: 'AI Agent'
          },
          {
            trait_type: 'Creation Date',
            value: new Date().toISOString().split('T')[0]
          }
        ]
      };

      const contractAddress = contractMatch?.[1];
      const result = await service.mintNFT(metadata, undefined, contractAddress);

      const response = `🎨 Successfully minted NFT "${metadata.name}"!

✅ Token ID: ${result.tokenId}
🔗 Transaction: ${result.transactionHash}
📝 Metadata: ${result.metadataUri}
👤 Owner: ${service.getWalletAddress()}

Your NFT has been created and the metadata is stored permanently on IPFS!`;

      if (callback) {
        await callback({
          text: response,
          actions: ['MINT_NFT'],
          source: message.content.source,
        });
      }

      return {
        text: response,
        success: true,
        data: {
          actions: ['MINT_NFT'],
          source: message.content.source,
          mintResult: result,
          metadata,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to mint NFT';
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        text: `❌ Sorry, I couldn't mint the NFT. ${errorMessage}`,
      };
    }
  },

  examples: [
    [
      {
        name: '{{name1}}',
        content: {
          text: 'Mint an NFT with name: Digital Sunset, description: A beautiful digital sunset artwork, image: https://example.com/sunset.jpg',
        },
      },
      {
        name: '{{name2}}',
        content: {
          text: '🎨 Successfully minted NFT "Digital Sunset"!\n\n✅ Token ID: token_123...\n🔗 Transaction: 0xabc...\n📝 Metadata: ipfs://Qm...',
          actions: ['MINT_NFT'],
        },
      },
    ],
  ],
};

// Additional Actions
const viewOwnedNFTsAction: Action = {
  name: 'VIEW_OWNED_NFTS',
  similes: ['SHOW_MY_NFTS', 'GET_MY_NFTS', 'LIST_MY_NFTS', 'MY_COLLECTION', 'MY_PORTFOLIO'],
  description: 'Shows NFTs owned by the user with detailed metadata from IPFS',

  validate: async (runtime: IAgentRuntime, message: Memory, _state: State | undefined): Promise<boolean> => {
    if (!message.content.text) return false;
    const text = message.content.text.toLowerCase();
    return text.includes('show me my nft') || text.includes('my nft') || text.includes('owned nft') ||
           text.includes('my collection') || text.includes('my portfolio') || text.includes('what nfts do i have');
  },

  handler: async (runtime: IAgentRuntime, message: Memory, _state: State | undefined, _options: Record<string, unknown> = {}, callback?: HandlerCallback, _responses?: Memory[]): Promise<ActionResult> => {
    try {
      const service = runtime.getService(SeiNftService.serviceType) as SeiNftService;
      if (!service) throw new Error('SEI NFT service not available');

      const ownedNFTs = await service.getOwnedNFTs();
      const walletAddress = service.getWalletAddress();
      const balance = await service.getWalletBalance();

      let response = `📊 **Your NFT Portfolio**\n\n👤 **Address**: \`${walletAddress}\`\n💰 **Balance**: ${balance} SEI\n\n`;

      if (ownedNFTs.length === 0) {
        response += `🔍 You don't own any NFTs yet.\n\n🎨 **Get started by**:\n• Minting new NFTs\n• Purchasing from Magic Eden marketplace\n• Transferring from other wallets`;
      } else {
        response += `🎨 **Collection Summary**: ${ownedNFTs.length} NFT${ownedNFTs.length > 1 ? 's' : ''}\n\n`;
        ownedNFTs.slice(0, 10).forEach((nft, index) => {
          response += `**${index + 1}. ${nft.metadata?.name || `Token #${nft.token_id}`}**\n`;
          response += `   🆔 Token ID: \`${nft.token_id}\`\n`;
          if (nft.metadata?.description) {
            const desc = nft.metadata.description.length > 100 ? nft.metadata.description.slice(0, 100) + '...' : nft.metadata.description;
            response += `   📝 Description: ${desc}\n`;
          }
          if (nft.metadata?.attributes && nft.metadata.attributes.length > 0) {
            response += `   ✨ Traits: ${nft.metadata.attributes.slice(0, 3).map(attr => `${attr.trait_type}: ${attr.value}`).join(', ')}\n`;
          }
          if (nft.token_uri) response += `   🔗 Metadata: ${nft.token_uri}\n`;
          response += '\n';
        });
        if (ownedNFTs.length > 10) response += `... and ${ownedNFTs.length - 10} more NFTs in your collection.`;
      }

      if (callback) {
        await callback({ text: response, actions: ['VIEW_OWNED_NFTS'], source: message.content.source });
      }

      return { text: response, success: true, data: { actions: ['VIEW_OWNED_NFTS'], source: message.content.source, ownedNFTs, walletAddress, balance } };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to retrieve owned NFTs';
      return { success: false, error: error instanceof Error ? error : new Error(String(error)), text: `❌ Sorry, I couldn't retrieve your NFTs. ${errorMessage}` };
    }
  },

  examples: [[{ name: '{{name1}}', content: { text: 'Show me my NFT collection' } }, { name: '{{name2}}', content: { text: '📊 **Your NFT Portfolio**\n\n👤 **Address**: `sei123...`\n💰 **Balance**: 2.5 SEI', actions: ['VIEW_OWNED_NFTS'] } }]],
};

const viewMarketplaceAction: Action = {
  name: 'VIEW_MARKETPLACE',
  similes: ['BROWSE_NFTS', 'MARKETPLACE', 'AVAILABLE_NFTS', 'BROWSE_MARKETPLACE', 'MAGIC_EDEN'],
  description: 'Browse available NFTs on Magic Eden marketplace',

  validate: async (runtime: IAgentRuntime, message: Memory, _state: State | undefined): Promise<boolean> => {
    if (!message.content.text) return false;
    const text = message.content.text.toLowerCase();
    return text.includes('marketplace') || text.includes('browse nft') || text.includes('available nft') || text.includes('magic eden') || text.includes('nfts for sale') || text.includes('buy nft');
  },

  handler: async (runtime: IAgentRuntime, message: Memory, _state: State | undefined, _options: Record<string, unknown> = {}, callback?: HandlerCallback, _responses?: Memory[]): Promise<ActionResult> => {
    try {
      const service = runtime.getService(SeiNftService.serviceType) as SeiNftService;
      if (!service) throw new Error('SEI NFT service not available');

      const text = message.content.text;
      const collectionMatch = text.match(/collection[:\s]+([^\s,\n]+)/i);
      const collection = collectionMatch?.[1];

      const listings = await service.getMarketplaceListings(collection, 15);

      let response = `🏪 **Magic Eden Marketplace**\n\n`;

      if (listings.length === 0) {
        response += `🔍 No NFTs currently listed for sale.\n\n💡 **Try**:\n• Checking specific collections\n• Coming back later for new listings\n• Browsing by collection name`;
      } else {
        response += `🎨 **Available NFTs** (${listings.length} listings):\n\n`;
        listings.slice(0, 10).forEach((listing, index) => {
          response += `**${index + 1}. ${listing.metadata?.name || `Token #${listing.token_id}`}**\n`;
          response += `   💰 Price: ${listing.price} ${listing.currency}\n`;
          response += `   👤 Seller: \`${listing.seller.slice(0, 8)}...${listing.seller.slice(-6)}\`\n`;
          response += `   🆔 Token ID: \`${listing.token_id}\`\n`;
          response += `   📋 Contract: \`${listing.contract_address.slice(0, 8)}...${listing.contract_address.slice(-6)}\`\n`;
          if (listing.metadata?.description) {
            const desc = listing.metadata.description.length > 80 ? listing.metadata.description.slice(0, 80) + '...' : listing.metadata.description;
            response += `   📝 ${desc}\n`;
          }
          response += '\n';
        });
        if (listings.length > 10) response += `... and ${listings.length - 10} more listings available.\n\n`;
        response += `💡 **To purchase**: Contact the seller or use Magic Eden directly`;
      }

      if (callback) {
        await callback({ text: response, actions: ['VIEW_MARKETPLACE'], source: message.content.source });
      }

      return { text: response, success: true, data: { actions: ['VIEW_MARKETPLACE'], source: message.content.source, listings } };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to browse marketplace';
      return { success: false, error: error instanceof Error ? error : new Error(String(error)), text: `❌ Sorry, I couldn't browse the marketplace. ${errorMessage}` };
    }
  },

  examples: [[{ name: '{{name1}}', content: { text: 'Browse NFTs on Magic Eden marketplace' } }, { name: '{{name2}}', content: { text: '🏪 **Magic Eden Marketplace**\n\n🎨 **Available NFTs**', actions: ['VIEW_MARKETPLACE'] } }]],
};

export const seiNftPlugin: Plugin = {
  name: 'plugin-sei-nft',
  description: 'Complete SEI blockchain NFT plugin with CosmWasm CW721 contracts, IPFS metadata storage, Magic Eden marketplace integration, and comprehensive NFT management',
  config: {
    PRIVATE_KEY: process.env.PRIVATE_KEY,
    SEI_RPC_URL: process.env.SEI_RPC_URL,
    SEI_REST_URL: process.env.SEI_REST_URL,
    SEI_CHAIN_ID: process.env.SEI_CHAIN_ID,
    MAGIC_EDEN_API_KEY: process.env.MAGIC_EDEN_API_KEY,
    NFTSCAN_API_KEY: process.env.NFTSCAN_API_KEY,
    PINATA_API_KEY: process.env.PINATA_API_KEY,
    PINATA_SECRET_API_KEY: process.env.PINATA_SECRET_API_KEY,
    CW721_CONTRACT_ADDRESS: process.env.CW721_CONTRACT_ADDRESS,
  },
  
  async init(config: Record<string, string>) {
    logger.info('Initializing complete SEI NFT plugin');
    try {
      const validatedConfig = await configSchema.parseAsync(config);

      // Set all environment variables
      for (const [key, value] of Object.entries(validatedConfig)) {
        if (value) process.env[key] = value;
      }

      // Validate required environment variables
      if (!process.env.PRIVATE_KEY) {
        throw new Error('PRIVATE_KEY environment variable is required');
      }

      logger.info('SEI NFT plugin initialized successfully');
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(
          `Invalid plugin configuration: ${error.errors.map((e) => e.message).join(', ')}`
        );
      }
      throw error;
    }
  },

  models: {
    [ModelType.TEXT_SMALL]: async () => {
      return 'I can help you with complete SEI blockchain NFT operations including minting with IPFS metadata, marketplace trading, collection management, and portfolio analysis.';
    },
    [ModelType.TEXT_LARGE]: async () => {
      return `I specialize in comprehensive SEI blockchain NFT operations:

🎨 **NFT Creation**: Mint NFTs with metadata stored on IPFS
📊 **Portfolio Management**: View and manage your NFT collection
🏪 **Marketplace Integration**: Browse and trade on Magic Eden
⛓️ **Blockchain Operations**: Transfer, batch operations, gas optimization
📈 **Analytics**: Collection stats, price tracking, transaction history

I use real CosmWasm CW721 contracts, IPFS storage via Pinata, and integrate with Magic Eden's official APIs. Just tell me what you'd like to do with NFTs!`;
    },
  },

  routes: [
    {
      name: 'api-nft-mint',
      path: '/api/nft/mint',
      type: 'POST',
      handler: async (req: any, res: any) => {
        try {
          const { name, description, image, attributes, contract_address } = req.body;
          
          if (!name || !description) {
            return res.status(400).json({ error: 'Name and description are required' });
          }

          const service = req.runtime.getService(SeiNftService.serviceType) as SeiNftService;
          if (!service) {
            return res.status(500).json({ error: 'SEI NFT service not available' });
          }

          const metadata: NFTMetadata = {
            name,
            description,
            image: image || 'https://via.placeholder.com/512x512.png?text=NFT',
            attributes: attributes || []
          };

          const result = await service.mintNFT(metadata, undefined, contract_address);
          res.json(result);
        } catch (error) {
          res.status(500).json({
            error: 'Failed to mint NFT',
            details: error instanceof Error ? error.message : String(error),
          });
        }
      },
    },
    // Additional routes would be added here...
  ],

  events: {
    [EventType.MESSAGE_RECEIVED]: [
      async (params: MessagePayload) => {
        logger.debug('MESSAGE_RECEIVED event received');
        logger.debug({ message: params.message }, 'Message:');
      },
    ],
  },

  services: [SeiNftService],
  actions: [
    mintNFTAction,
    viewOwnedNFTsAction,
    viewMarketplaceAction,
  ],
  providers: [],
};

export default seiNftPlugin;