# SEI NFT Plugin

A comprehensive SEI blockchain NFT plugin with CosmWasm CW721 contracts, IPFS metadata storage, Magic Eden marketplace integration, and complete NFT management functionality.

## Features

🎨 **NFT Creation & Management**
- Mint NFTs with metadata stored on IPFS
- Deploy CW721 smart contracts
- Transfer NFTs between addresses
- Batch operations support

🏪 **Marketplace Integration**
- Browse NFTs on Magic Eden
- Buy and sell NFTs with real transactions
- Manage listings and cancel sales
- Price tracking and analytics

📊 **Portfolio Management**
- View owned NFT collections
- Transaction history tracking
- Balance and gas management
- Collection statistics

⛓️ **Blockchain Operations**
- SEI network integration
- CosmWasm contract interactions
- Gas optimization
- Transaction simulation

## Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Set up environment variables:**
Create a `.env` file with the following variables:

```env
# Required
PRIVATE_KEY=your_sei_private_key_here

# SEI Network Configuration
SEI_RPC_URL=https://rpc.sei-apis.com
SEI_REST_URL=https://rest.sei-apis.com
SEI_CHAIN_ID=pacific-1

# IPFS Configuration (Pinata)
PINATA_JWT=your_pinata_jwt_token
PINATA_GATEWAY=your_dedicated_gateway_domain (optional)

# Marketplace APIs (Optional)
MAGIC_EDEN_API_KEY=your_magic_eden_api_key
NFTSCAN_API_KEY=your_nftscan_api_key

# Contract Configuration
CW721_CONTRACT_ADDRESS=your_deployed_contract_address (optional)
```

## Usage

### Basic NFT Minting

```typescript
import { seiNftPlugin } from './sei-nft-plugin';

// Initialize the plugin
await seiNftPlugin.init({
  PRIVATE_KEY: process.env.PRIVATE_KEY,
  SEI_RPC_URL: process.env.SEI_RPC_URL,
  PINATA_JWT: process.env.PINATA_JWT,
});

// Get the service
const service = runtime.getService('sei-nft') as SeiNftService;

// Mint an NFT
const metadata = {
  name: "Digital Art #1",
  description: "A beautiful digital artwork",
  image: "https://example.com/artwork.jpg",
  attributes: [
    { trait_type: "Artist", value: "AI Artist" },
    { trait_type: "Style", value: "Digital" }
  ]
};

const result = await service.mintNFT(metadata);
console.log(`NFT minted: ${result.tokenId}`);
```

### Marketplace Operations

```typescript
// Browse available NFTs
const listings = await service.getMarketplaceListings();

// Buy an NFT
const purchase = await service.buyNFT(
  "token_123",
  "sei1contract...",
  "0.5"
);

// List an NFT for sale
const listing = await service.sellNFT(
  "token_123",
  "sei1contract...",
  "1.0"
);
```

### Portfolio Management

```typescript
// Get owned NFTs
const ownedNFTs = await service.getOwnedNFTs();

// Get wallet balance
const balance = await service.getWalletBalance();

// Get transaction history
const history = await service.getTransactionHistory();
```

## API Endpoints

The plugin provides several REST API endpoints:

- `POST /api/nft/mint` - Mint a new NFT
- `POST /api/nft/buy` - Buy an NFT from marketplace
- `POST /api/nft/sell` - List an NFT for sale
- `POST /api/nft/cancel` - Cancel a listing
- `GET /api/nft/owned` - Get owned NFTs
- `GET /api/nft/marketplace` - Browse marketplace

## Actions

The plugin includes several AI actions for natural language interaction:

- **MINT_NFT** - Create new NFTs with natural language
- **VIEW_OWNED_NFTS** - Show your NFT collection
- **VIEW_MARKETPLACE** - Browse available NFTs
- **BUY_NFT** - Purchase NFTs from marketplace
- **SELL_NFT** - List NFTs for sale
- **CANCEL_LISTING** - Remove listings

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PRIVATE_KEY` | Yes | Your SEI private key for transactions |
| `SEI_RPC_URL` | No | SEI RPC endpoint (default: mainnet) |
| `SEI_REST_URL` | No | SEI REST endpoint (default: mainnet) |
| `SEI_CHAIN_ID` | No | SEI chain ID (default: pacific-1) |
| `PINATA_JWT` | No | Pinata JWT for IPFS storage |
| `MAGIC_EDEN_API_KEY` | No | Magic Eden API key |
| `NFTSCAN_API_KEY` | No | NFTScan API key |

### Gas Configuration

```typescript
GAS_PRICE=0.1usei          // Gas price for transactions
GAS_ADJUSTMENT=1.3         // Gas adjustment multiplier
```

## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

### Running

```bash
npm start
```

## Architecture

The plugin consists of several key components:

1. **SeiNftService** - Main service for blockchain interactions
2. **IPFSService** - Handles metadata and file storage on IPFS
3. **MagicEdenService** - Integrates with Magic Eden marketplace
4. **NFTScanService** - Provides NFT data and analytics
5. **Actions** - Natural language processing for user interactions

## Security Notes

- Never commit your private keys to version control
- Use environment variables for sensitive configuration
- Test on testnet before mainnet deployment
- Validate all user inputs before processing

## Troubleshooting

### Common Issues

1. **"Service not initialized"**
   - Ensure all required environment variables are set
   - Check that the plugin is properly initialized

2. **"No IPFS service available"**
   - Verify your Pinata JWT token is correct
   - Check network connectivity

3. **"Failed to connect to SEI network"**
   - Verify RPC and REST URLs are correct
   - Check network connectivity and firewall settings

### Debug Mode

Enable debug logging by setting the log level:

```typescript
logger.setLevel('debug');
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Create an issue on GitHub
- Check the troubleshooting section
- Review the configuration examples

## Roadmap

- [ ] Multi-chain support
- [ ] Advanced analytics dashboard
- [ ] Automated trading strategies
- [ ] Social features and sharing
- [ ] Mobile app integration