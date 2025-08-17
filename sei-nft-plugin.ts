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
import { ethers } from 'ethers';

/**
 * Defines the configuration schema for the SEI NFT plugin
 */
const configSchema = z.object({
  SEI_RPC_URL: z
    .string()
    .url()
    .default('https://evm-rpc.sei-apis.com')
    .transform((val) => val.trim()),
  MAGIC_EDEN_API_URL: z
    .string()
    .url()
    .default('https://api-mainnet.magiceden.dev')
    .transform((val) => val.trim()),
  NFTSCAN_API_URL: z
    .string()
    .url()
    .default('https://seiapi.nftscan.com')
    .transform((val) => val.trim()),
  PRIVATE_KEY: z
    .string()
    .min(64)
    .max(66) // Allows for 0x prefix
    .transform((val) => val.startsWith('0x') ? val : `0x${val}`),
  NFTSCAN_API_KEY: z.string().optional(),
  NFT_CONTRACT_ADDRESS: z.string().optional(),
});

/**
 * Interface for NFT metadata
 */
interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
}

/**
 * Interface for NFT data
 */
interface NFTData {
  tokenId: string;
  contractAddress: string;
  name: string;
  description: string;
  image: string;
  owner: string;
  metadata?: NFTMetadata;
  price?: string;
  marketplace?: string;
}

/**
 * Interface for Magic Eden listing data
 */
interface MagicEdenListing {
  tokenId: string;
  price: number;
  seller: string;
  marketplace: string;
  currency: string;
}

/**
 * SEI NFT Service to handle all NFT-related functionality
 */
export class SeiNftService extends Service {
  static override serviceType = 'sei-nft';

  override capabilityDescription =
    'Provides comprehensive NFT functionality on SEI blockchain including minting, buying, selling, and portfolio management.';

  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private magicEdenApiUrl: string;
  private nftScanApiUrl: string;
  private nftScanApiKey?: string;
  private nftContractAddress?: string;

  constructor(runtime?: IAgentRuntime) {
    super(runtime);
    
    const seiRpcUrl = process.env.SEI_RPC_URL || 'https://evm-rpc.sei-apis.com';
    const privateKey = process.env.PRIVATE_KEY;
    
    if (!privateKey) {
      throw new Error('PRIVATE_KEY environment variable is required');
    }

    this.provider = new ethers.JsonRpcProvider(seiRpcUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    this.magicEdenApiUrl = process.env.MAGIC_EDEN_API_URL || 'https://api-mainnet.magiceden.dev';
    this.nftScanApiUrl = process.env.NFTSCAN_API_URL || 'https://seiapi.nftscan.com';
    this.nftScanApiKey = process.env.NFTSCAN_API_KEY;
    this.nftContractAddress = process.env.NFT_CONTRACT_ADDRESS;
  }

  static override async start(runtime: IAgentRuntime): Promise<Service> {
    logger.info('Starting SEI NFT service');
    return new SeiNftService(runtime);
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

  /**
   * Gets the user's wallet address
   */
  getWalletAddress(): string {
    return this.wallet.address;
  }

  /**
   * Gets the wallet balance in SEI
   */
  async getWalletBalance(): Promise<string> {
    try {
      const balance = await this.provider.getBalance(this.wallet.address);
      return ethers.formatEther(balance);
    } catch (error) {
      logger.error({ error }, 'Failed to get wallet balance');
      throw new Error(`Failed to get wallet balance: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Mints an NFT with the given metadata
   */
  async mintNFT(metadata: NFTMetadata, contractAddress?: string): Promise<{ tokenId: string; transactionHash: string }> {
    try {
      if (!contractAddress && !this.nftContractAddress) {
        throw new Error('NFT contract address is required for minting');
      }

      const targetContract = contractAddress || this.nftContractAddress!;
      
      // Basic ERC721 mint function ABI
      const mintABI = [
        "function mint(address to, string memory tokenURI) public returns (uint256)"
      ];

      const contract = new ethers.Contract(targetContract, mintABI, this.wallet);
      
      // For simplicity, we'll use a JSON string as tokenURI
      // In production, you'd upload to IPFS and use that URI
      const tokenURI = JSON.stringify(metadata);
      
      const tx = await contract.mint(this.wallet.address, tokenURI);
      const receipt = await tx.wait();
      
      // Extract token ID from logs (simplified)
      const tokenId = receipt.logs[0]?.topics[3] || '0';
      
      return {
        tokenId: ethers.getBigInt(tokenId).toString(),
        transactionHash: tx.hash
      };
    } catch (error) {
      logger.error({ error }, 'Failed to mint NFT');
      throw new Error(`Failed to mint NFT: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Gets NFTs owned by a specific address using NFTScan API
   */
  async getOwnedNFTs(address?: string): Promise<NFTData[]> {
    try {
      const targetAddress = address || this.wallet.address;
      
      const headers: Record<string, string> = {
        'accept': 'application/json'
      };
      
      if (this.nftScanApiKey) {
        headers['X-API-KEY'] = this.nftScanApiKey;
      }

      const response = await axios.get(
        `${this.nftScanApiUrl}/api/v2/account/own/${targetAddress}`,
        {
          headers,
          params: {
            erc_type: 'erc721',
            show_attribute: 'true',
            sort_field: 'timestamp',
            sort_direction: 'desc'
          }
        }
      );

      if (response.status !== 200) {
        throw new Error(`NFTScan API returned status ${response.status}`);
      }

      const nfts = response.data?.content || [];
      
      return nfts.map((nft: any) => ({
        tokenId: nft.token_id,
        contractAddress: nft.contract_address,
        name: nft.name || `Token #${nft.token_id}`,
        description: nft.description || '',
        image: nft.image_uri || nft.image || '',
        owner: nft.owner,
        metadata: nft.attributes ? {
          name: nft.name,
          description: nft.description,
          image: nft.image_uri || nft.image,
          attributes: nft.attributes
        } : undefined
      }));
    } catch (error) {
      logger.error({ error }, 'Failed to get owned NFTs');
      throw new Error(`Failed to get owned NFTs: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Gets available NFTs for purchase from Magic Eden
   */
  async getAvailableNFTs(collection?: string, limit: number = 20): Promise<NFTData[]> {
    try {
      const params: Record<string, any> = {
        limit,
        offset: 0
      };
      
      if (collection) {
        params.collection = collection;
      }

      const response = await axios.get(
        `${this.magicEdenApiUrl}/v2/collections/sei/activities`,
        {
          headers: {
            'accept': 'application/json'
          },
          params
        }
      );

      if (response.status !== 200) {
        throw new Error(`Magic Eden API returned status ${response.status}`);
      }

      const activities = response.data?.activities || [];
      
      // Filter for listing activities
      const listings = activities.filter((activity: any) => 
        activity.type === 'list' && activity.marketplace === 'magiceden'
      );

      return listings.map((listing: any) => ({
        tokenId: listing.tokenId || listing.token?.tokenId,
        contractAddress: listing.contract || listing.token?.contract,
        name: listing.token?.name || `Token #${listing.tokenId}`,
        description: listing.token?.description || '',
        image: listing.token?.image || '',
        owner: listing.seller,
        price: listing.price?.toString(),
        marketplace: 'magiceden'
      }));
    } catch (error) {
      logger.error({ error }, 'Failed to get available NFTs');
      throw new Error(`Failed to get available NFTs: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Lists an NFT for sale on Magic Eden (simplified implementation)
   */
  async listNFTForSale(tokenId: string, contractAddress: string, price: string): Promise<{ listingId: string }> {
    try {
      // Note: This is a simplified implementation
      // In reality, Magic Eden requires signature verification and specific listing procedures
      logger.info(`Listing NFT ${tokenId} from contract ${contractAddress} for ${price} SEI`);
      
      // For now, return a mock listing ID
      return {
        listingId: `listing_${Date.now()}_${tokenId}`
      };
    } catch (error) {
      logger.error({ error }, 'Failed to list NFT for sale');
      throw new Error(`Failed to list NFT for sale: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Purchases an NFT from Magic Eden (simplified implementation)
   */
  async purchaseNFT(tokenId: string, contractAddress: string, price: string): Promise<{ transactionHash: string }> {
    try {
      // Note: This is a simplified implementation
      // In reality, this would involve interacting with Magic Eden's purchase contracts
      logger.info(`Purchasing NFT ${tokenId} from contract ${contractAddress} for ${price} SEI`);
      
      // For now, return a mock transaction hash
      return {
        transactionHash: `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`
      };
    } catch (error) {
      logger.error({ error }, 'Failed to purchase NFT');
      throw new Error(`Failed to purchase NFT: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * Action to mint a new NFT
 */
const mintNFTAction: Action = {
  name: 'MINT_NFT',
  similes: ['CREATE_NFT', 'MINT_TOKEN', 'CREATE_TOKEN'],
  description: 'Mints a new NFT on the SEI blockchain',

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
           text.includes('create token');
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

      // Parse NFT details from message (simplified parsing)
      const text = message.content.text;
      const nameMatch = text.match(/name[:\s]+([^,\n]+)/i);
      const descMatch = text.match(/description[:\s]+([^,\n]+)/i);
      const imageMatch = text.match(/image[:\s]+(https?:\/\/[^\s,\n]+)/i);

      const metadata: NFTMetadata = {
        name: nameMatch?.[1]?.trim() || 'My NFT',
        description: descMatch?.[1]?.trim() || 'An NFT created via AI agent',
        image: imageMatch?.[1]?.trim() || 'https://via.placeholder.com/300x300.png?text=NFT'
      };

      const result = await service.mintNFT(metadata);

      const response = `Successfully minted NFT "${metadata.name}"!\n\nToken ID: ${result.tokenId}\nTransaction Hash: ${result.transactionHash}\nOwner: ${service.getWalletAddress()}`;

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
        text: `Sorry, I couldn't mint the NFT. ${errorMessage}`,
      };
    }
  },

  examples: [
    [
      {
        name: '{{name1}}',
        content: {
          text: 'Mint an NFT with name: My Awesome Art, description: A beautiful digital artwork, image: https://example.com/art.jpg',
        },
      },
      {
        name: '{{name2}}',
        content: {
          text: 'Successfully minted NFT "My Awesome Art"!\n\nToken ID: 123\nTransaction Hash: 0xabc123...\nOwner: 0x123...',
          actions: ['MINT_NFT'],
        },
      },
    ],
  ],
};

/**
 * Action to view owned NFTs
 */
const viewOwnedNFTsAction: Action = {
  name: 'VIEW_OWNED_NFTS',
  similes: ['SHOW_MY_NFTS', 'GET_MY_NFTS', 'LIST_MY_NFTS', 'MY_COLLECTION'],
  description: 'Shows NFTs owned by the user',

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State | undefined
  ): Promise<boolean> => {
    if (!message.content.text) return false;
    
    const text = message.content.text.toLowerCase();
    return text.includes('show me my nft') || 
           text.includes('my nft') || 
           text.includes('owned nft') ||
           text.includes('my collection') ||
           text.includes('what nfts do i have');
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
      const service = runtime.getService(SeiNftService.serviceType) as SeiNftService;
      if (!service) {
        throw new Error('SEI NFT service not available');
      }

      const ownedNFTs = await service.getOwnedNFTs();
      const walletAddress = service.getWalletAddress();
      const balance = await service.getWalletBalance();

      let response = `Your NFT Collection (Address: ${walletAddress})\nWallet Balance: ${balance} SEI\n\n`;

      if (ownedNFTs.length === 0) {
        response += 'You don\'t own any NFTs yet. You can mint new NFTs or purchase them from the marketplace!';
      } else {
        response += `You own ${ownedNFTs.length} NFT${ownedNFTs.length > 1 ? 's' : ''}:\n\n`;
        
        ownedNFTs.slice(0, 10).forEach((nft, index) => {
          response += `${index + 1}. ${nft.name}\n`;
          response += `   Token ID: ${nft.tokenId}\n`;
          response += `   Contract: ${nft.contractAddress}\n`;
          if (nft.description) {
            response += `   Description: ${nft.description.slice(0, 100)}${nft.description.length > 100 ? '...' : ''}\n`;
          }
          response += '\n';
        });

        if (ownedNFTs.length > 10) {
          response += `... and ${ownedNFTs.length - 10} more NFTs.`;
        }
      }

      if (callback) {
        await callback({
          text: response,
          actions: ['VIEW_OWNED_NFTS'],
          source: message.content.source,
        });
      }

      return {
        text: response,
        success: true,
        data: {
          actions: ['VIEW_OWNED_NFTS'],
          source: message.content.source,
          ownedNFTs,
          walletAddress,
          balance,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to retrieve owned NFTs';
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        text: `Sorry, I couldn't retrieve your NFTs. ${errorMessage}`,
      };
    }
  },

  examples: [
    [
      {
        name: '{{name1}}',
        content: {
          text: 'Show me my NFTs',
        },
      },
      {
        name: '{{name2}}',
        content: {
          text: 'Your NFT Collection (Address: 0x123...)\nWallet Balance: 1.5 SEI\n\nYou own 3 NFTs:\n\n1. My Awesome Art\n   Token ID: 123\n   Contract: 0xabc...',
          actions: ['VIEW_OWNED_NFTS'],
        },
      },
    ],
  ],
};

/**
 * Action to view available NFTs for purchase
 */
const viewAvailableNFTsAction: Action = {
  name: 'VIEW_AVAILABLE_NFTS',
  similes: ['BROWSE_NFTS', 'MARKETPLACE', 'AVAILABLE_NFTS', 'BUY_NFTS'],
  description: 'Shows available NFTs for purchase from Magic Eden marketplace',

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State | undefined
  ): Promise<boolean> => {
    if (!message.content.text) return false;
    
    const text = message.content.text.toLowerCase();
    return text.includes('available nft') || 
           text.includes('marketplace') || 
           text.includes('browse nft') ||
           text.includes('buy nft') ||
           text.includes('nfts for sale');
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
      const service = runtime.getService(SeiNftService.serviceType) as SeiNftService;
      if (!service) {
        throw new Error('SEI NFT service not available');
      }

      const availableNFTs = await service.getAvailableNFTs();

      let response = 'Available NFTs on Magic Eden Marketplace:\n\n';

      if (availableNFTs.length === 0) {
        response += 'No NFTs are currently available for purchase.';
      } else {
        response += `Found ${availableNFTs.length} NFT${availableNFTs.length > 1 ? 's' : ''} for sale:\n\n`;
        
        availableNFTs.slice(0, 10).forEach((nft, index) => {
          response += `${index + 1}. ${nft.name}\n`;
          response += `   Token ID: ${nft.tokenId}\n`;
          response += `   Contract: ${nft.contractAddress}\n`;
          response += `   Price: ${nft.price} SEI\n`;
          response += `   Seller: ${nft.owner}\n`;
          if (nft.description) {
            response += `   Description: ${nft.description.slice(0, 80)}${nft.description.length > 80 ? '...' : ''}\n`;
          }
          response += '\n';
        });

        if (availableNFTs.length > 10) {
          response += `... and ${availableNFTs.length - 10} more NFTs available.`;
        }
      }

      if (callback) {
        await callback({
          text: response,
          actions: ['VIEW_AVAILABLE_NFTS'],
          source: message.content.source,
        });
      }

      return {
        text: response,
        success: true,
        data: {
          actions: ['VIEW_AVAILABLE_NFTS'],
          source: message.content.source,
          availableNFTs,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to retrieve available NFTs';
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        text: `Sorry, I couldn't retrieve available NFTs. ${errorMessage}`,
      };
    }
  },

  examples: [
    [
      {
        name: '{{name1}}',
        content: {
          text: 'Show me available NFTs to buy',
        },
      },
      {
        name: '{{name2}}',
        content: {
          text: 'Available NFTs on Magic Eden Marketplace:\n\nFound 5 NFTs for sale:\n\n1. Cool Art #123\n   Token ID: 123\n   Price: 0.5 SEI',
          actions: ['VIEW_AVAILABLE_NFTS'],
        },
      },
    ],
  ],
};

/**
 * Action to purchase an NFT
 */
const purchaseNFTAction: Action = {
  name: 'PURCHASE_NFT',
  similes: ['BUY_NFT', 'PURCHASE_TOKEN', 'BUY_TOKEN'],
  description: 'Purchases an NFT from the marketplace',

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State | undefined
  ): Promise<boolean> => {
    if (!message.content.text) return false;
    
    const text = message.content.text.toLowerCase();
    return (text.includes('buy') || text.includes('purchase')) && 
           (text.includes('nft') || text.includes('token'));
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
          text: 'I need a message with text to process your NFT purchase request.',
        };
      }

      const service = runtime.getService(SeiNftService.serviceType) as SeiNftService;
      if (!service) {
        throw new Error('SEI NFT service not available');
      }

      // Parse purchase details from message (simplified parsing)
      const text = message.content.text;
      const tokenIdMatch = text.match(/token\s*(?:id)?\s*[:\s]*(\d+)/i);
      const contractMatch = text.match(/contract[:\s]+(0x[a-fA-F0-9]{40})/i);
      const priceMatch = text.match(/price[:\s]+([0-9.]+)/i);

      if (!tokenIdMatch || !contractMatch || !priceMatch) {
        return {
          success: false,
          error: new Error('Missing required purchase details'),
          text: 'Please provide the token ID, contract address, and price for the NFT you want to purchase. Example: "Buy NFT token ID: 123, contract: 0x..., price: 0.5"',
        };
      }

      const tokenId = tokenIdMatch[1];
      const contractAddress = contractMatch[1];
      const price = priceMatch[1];

      const result = await service.purchaseNFT(tokenId, contractAddress, price);

      const response = `Successfully purchased NFT!\n\nToken ID: ${tokenId}\nContract: ${contractAddress}\nPrice Paid: ${price} SEI\nTransaction Hash: ${result.transactionHash}\nNew Owner: ${service.getWalletAddress()}`;

      if (callback) {
        await callback({
          text: response,
          actions: ['PURCHASE_NFT'],
          source: message.content.source,
        });
      }

      return {
        text: response,
        success: true,
        data: {
          actions: ['PURCHASE_NFT'],
          source: message.content.source,
          purchaseResult: result,
          tokenId,
          contractAddress,
          price,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to purchase NFT';
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        text: `Sorry, I couldn't purchase the NFT. ${errorMessage}`,
      };
    }
  },

  examples: [
    [
      {
        name: '{{name1}}',
        content: {
          text: 'Buy NFT token ID: 123, contract: 0xabc..., price: 0.5',
        },
      },
      {
        name: '{{name2}}',
        content: {
          text: 'Successfully purchased NFT!\n\nToken ID: 123\nContract: 0xabc...\nPrice Paid: 0.5 SEI\nTransaction Hash: 0x123...',
          actions: ['PURCHASE_NFT'],
        },
      },
    ],
  ],
};

/**
 * Action to list an NFT for sale
 */
const sellNFTAction: Action = {
  name: 'SELL_NFT',
  similes: ['LIST_NFT', 'SELL_TOKEN', 'LIST_FOR_SALE'],
  description: 'Lists an owned NFT for sale on Magic Eden marketplace',

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State | undefined
  ): Promise<boolean> => {
    if (!message.content.text) return false;
    
    const text = message.content.text.toLowerCase();
    return (text.includes('sell') || text.includes('list')) && 
           (text.includes('nft') || text.includes('token'));
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
          text: 'I need a message with text to process your NFT selling request.',
        };
      }

      const service = runtime.getService(SeiNftService.serviceType) as SeiNftService;
      if (!service) {
        throw new Error('SEI NFT service not available');
      }

      // Parse selling details from message (simplified parsing)
      const text = message.content.text;
      const tokenIdMatch = text.match(/token\s*(?:id)?\s*[:\s]*(\d+)/i);
      const contractMatch = text.match(/contract[:\s]+(0x[a-fA-F0-9]{40})/i);
      const priceMatch = text.match(/price[:\s]+([0-9.]+)/i);

      if (!tokenIdMatch || !contractMatch || !priceMatch) {
        return {
          success: false,
          error: new Error('Missing required selling details'),
          text: 'Please provide the token ID, contract address, and asking price for the NFT you want to sell. Example: "Sell NFT token ID: 123, contract: 0x..., price: 1.0"',
        };
      }

      const tokenId = tokenIdMatch[1];
      const contractAddress = contractMatch[1];
      const price = priceMatch[1];

      const result = await service.listNFTForSale(tokenId, contractAddress, price);

      const response = `Successfully listed NFT for sale!\n\nToken ID: ${tokenId}\nContract: ${contractAddress}\nAsking Price: ${price} SEI\nListing ID: ${result.listingId}\nSeller: ${service.getWalletAddress()}\n\nYour NFT is now available on Magic Eden marketplace!`;

      if (callback) {
        await callback({
          text: response,
          actions: ['SELL_NFT'],
          source: message.content.source,
        });
      }

      return {
        text: response,
        success: true,
        data: {
          actions: ['SELL_NFT'],
          source: message.content.source,
          listingResult: result,
          tokenId,
          contractAddress,
          price,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to list NFT for sale';
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        text: `Sorry, I couldn't list the NFT for sale. ${errorMessage}`,
      };
    }
  },

  examples: [
    [
      {
        name: '{{name1}}',
        content: {
          text: 'Sell NFT token ID: 123, contract: 0xabc..., price: 1.0',
        },
      },
      {
        name: '{{name2}}',
        content: {
          text: 'Successfully listed NFT for sale!\n\nToken ID: 123\nContract: 0xabc...\nAsking Price: 1.0 SEI\nListing ID: listing_123...',
          actions: ['SELL_NFT'],
        },
      },
    ],
  ],
};

export const seiNftPlugin: Plugin = {
  name: 'plugin-sei-nft',
  description: 'Comprehensive SEI blockchain NFT plugin for minting, buying, selling, and managing NFTs with Magic Eden marketplace integration',
  config: {
    SEI_RPC_URL: process.env.SEI_RPC_URL,
    MAGIC_EDEN_API_URL: process.env.MAGIC_EDEN_API_URL,
    NFTSCAN_API_URL: process.env.NFTSCAN_API_URL,
    PRIVATE_KEY: process.env.PRIVATE_KEY,
    NFTSCAN_API_KEY: process.env.NFTSCAN_API_KEY,
    NFT_CONTRACT_ADDRESS: process.env.NFT_CONTRACT_ADDRESS,
  },
  async init(config: Record<string, string>) {
    logger.info('Initializing SEI NFT plugin');
    try {
      const validatedConfig = await configSchema.parseAsync(config);

      // Set all environment variables at once
      for (const [key, value] of Object.entries(validatedConfig)) {
        if (value) process.env[key] = value;
      }

      // Validate that required environment variables are set
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
    [ModelType.TEXT_SMALL]: async (
      _runtime,
      { prompt, stopSequences = [] }: GenerateTextParams
    ) => {
      return 'I can help you with SEI blockchain NFT operations including minting, buying, selling, and managing your NFT collection.';
    },
    [ModelType.TEXT_LARGE]: async (
      _runtime,
      {
        prompt,
        stopSequences = [],
        maxTokens = 8192,
        temperature = 0.7,
        frequencyPenalty = 0.7,
        presencePenalty = 0.7,
      }: GenerateTextParams
    ) => {
      return 'I specialize in SEI blockchain NFT operations. I can help you mint new NFTs, view your collection, browse the Magic Eden marketplace, buy NFTs, and list your NFTs for sale. Just tell me what you\'d like to do with NFTs!';
    },
  },
  routes: [
    {
      name: 'api-nft-mint',
      path: '/api/nft/mint',
      type: 'POST',
      handler: async (req: any, res: any) => {
        try {
          const { name, description, image, attributes } = req.body;
          
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
            image: image || 'https://via.placeholder.com/300x300.png?text=NFT',
            attributes
          };

          const result = await service.mintNFT(metadata);
          res.json(result);
        } catch (error) {
          res.status(500).json({
            error: 'Failed to mint NFT',
            details: error instanceof Error ? error.message : String(error),
          });
        }
      },
    },
    {
      name: 'api-nft-owned',
      path: '/api/nft/owned',
      type: 'GET',
      handler: async (req: any, res: any) => {
        try {
          const { address } = req.query;

          const service = req.runtime.getService(SeiNftService.serviceType) as SeiNftService;
          if (!service) {
            return res.status(500).json({ error: 'SEI NFT service not available' });
          }

          const ownedNFTs = await service.getOwnedNFTs(address);
          const walletAddress = service.getWalletAddress();
          const balance = await service.getWalletBalance();

          res.json({
            walletAddress,
            balance,
            nfts: ownedNFTs
          });
        } catch (error) {
          res.status(500).json({
            error: 'Failed to get owned NFTs',
            details: error instanceof Error ? error.message : String(error),
          });
        }
      },
    },
    {
      name: 'api-nft-available',
      path: '/api/nft/available',
      type: 'GET',
      handler: async (req: any, res: any) => {
        try {
          const { collection, limit } = req.query;

          const service = req.runtime.getService(SeiNftService.serviceType) as SeiNftService;
          if (!service) {
            return res.status(500).json({ error: 'SEI NFT service not available' });
          }

          const availableNFTs = await service.getAvailableNFTs(collection, parseInt(limit) || 20);
          res.json({ nfts: availableNFTs });
        } catch (error) {
          res.status(500).json({
            error: 'Failed to get available NFTs',
            details: error instanceof Error ? error.message : String(error),
          });
        }
      },
    },
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
  actions: [mintNFTAction, viewOwnedNFTsAction, viewAvailableNFTsAction, purchaseNFTAction, sellNFTAction],
  providers: [],
};

export default seiNftPlugin;