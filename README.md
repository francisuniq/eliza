# SEI NFT Plugin for Eliza

A comprehensive SEI blockchain NFT plugin that enables AI agents to mint, buy, sell, and manage NFTs with Magic Eden marketplace integration.

## Features

- 🎨 **NFT Minting**: Create new NFTs directly on the SEI blockchain
- 👀 **Portfolio Viewing**: View owned NFTs and wallet balance
- 🛒 **Marketplace Integration**: Browse and purchase NFTs from Magic Eden
- 💰 **Selling**: List owned NFTs for sale on Magic Eden marketplace
- 🔐 **Secure Wallet Management**: Uses private key from environment variables
- 📊 **NFT Data**: Integration with NFTScan API for comprehensive NFT information

## Installation

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Set Up Environment Variables**:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your private key:
   ```env
   PRIVATE_KEY=your_64_character_private_key_here
   ```

3. **Optional Configuration**:
   - Get a free NFTScan API key from [developer.nftscan.com](https://developer.nftscan.com/) for higher rate limits
   - Set up your default NFT contract address for easier minting

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PRIVATE_KEY` | ✅ | Your wallet's private key (64 characters, without 0x prefix) |
| `SEI_RPC_URL` | ❌ | SEI blockchain RPC endpoint (default: https://evm-rpc.sei-apis.com) |
| `MAGIC_EDEN_API_URL` | ❌ | Magic Eden API endpoint (default: https://api-mainnet.magiceden.dev) |
| `NFTSCAN_API_URL` | ❌ | NFTScan API endpoint (default: https://seiapi.nftscan.com) |
| `NFTSCAN_API_KEY` | ❌ | NFTScan API key for higher rate limits |
| `NFT_CONTRACT_ADDRESS` | ❌ | Default contract address for NFT minting |

## Usage

### Available Actions

The plugin supports these natural language commands:

#### 1. Mint NFT
```
"Mint an NFT with name: My Awesome Art, description: A beautiful digital artwork, image: https://example.com/art.jpg"
```

#### 2. View Your NFTs
```
"Show me my NFTs"
"What NFTs do I have?"
"My collection"
```

#### 3. Browse Marketplace
```
"Show me available NFTs to buy"
"Browse NFTs on marketplace"
"What NFTs are for sale?"
```

#### 4. Purchase NFT
```
"Buy NFT token ID: 123, contract: 0xabc..., price: 0.5"
```

#### 5. Sell NFT
```
"Sell NFT token ID: 123, contract: 0xabc..., price: 1.0"
```

### API Endpoints

The plugin also provides REST API endpoints:

#### Mint NFT
```http
POST /api/nft/mint
Content-Type: application/json

{
  "name": "My NFT",
  "description": "An awesome NFT",
  "image": "https://example.com/image.jpg",
  "attributes": [
    {
      "trait_type": "Color",
      "value": "Blue"
    }
  ]
}
```

#### Get Owned NFTs
```http
GET /api/nft/owned?address=0x123... (optional)
```

#### Get Available NFTs
```http
GET /api/nft/available?collection=collection_name&limit=20
```

## Integration with Eliza

To use this plugin with your Eliza agent:

1. **Import the plugin**:
   ```typescript
   import seiNftPlugin from './sei-nft-plugin';
   ```

2. **Add to your agent configuration**:
   ```typescript
   const agent = new Agent({
     plugins: [seiNftPlugin],
     // ... other configuration
   });
   ```

3. **Initialize with environment variables**:
   ```typescript
   await seiNftPlugin.init({
     PRIVATE_KEY: process.env.PRIVATE_KEY,
     SEI_RPC_URL: process.env.SEI_RPC_URL,
     // ... other config
   });
   ```

## Security Considerations

⚠️ **Important Security Notes**:

- **Never commit your private key** to version control
- Store your private key in the `.env` file and add `.env` to `.gitignore`
- Consider using hardware wallets or secure key management systems in production
- The private key gives full access to your wallet - keep it secure!

## Development

### Building
```bash
npm run build
```

### Running in Development
```bash
npm run dev
```

### Testing
```bash
npm test
```

### Linting
```bash
npm run lint
```

## Magic Eden Integration

This plugin integrates with Magic Eden's SEI marketplace:

- **Viewing Listings**: Browse available NFTs for purchase
- **Purchasing**: Buy NFTs directly through the marketplace
- **Selling**: List your NFTs for sale (simplified implementation)

Note: The buying/selling functionality uses a simplified implementation. For production use, you would need to integrate with Magic Eden's official APIs and smart contracts.

## NFTScan Integration

The plugin uses NFTScan API to:

- Fetch owned NFTs with metadata
- Get comprehensive NFT information
- Access transaction history
- Support multiple NFT standards

## Supported Networks

- **SEI Mainnet**: https://evm-rpc.sei-apis.com
- **SEI Testnet**: Can be configured via `SEI_RPC_URL`

## Troubleshooting

### Common Issues

1. **"PRIVATE_KEY environment variable is required"**
   - Make sure your `.env` file contains a valid private key
   - Ensure the private key is 64 characters long (without 0x prefix)

2. **"Failed to get owned NFTs"**
   - Check your internet connection
   - Verify the NFTScan API is accessible
   - Consider adding an NFTScan API key for higher rate limits

3. **"NFT contract address is required for minting"**
   - Set `NFT_CONTRACT_ADDRESS` in your environment variables
   - Or provide a contract address when calling the mint function

### Getting Help

1. Check the console logs for detailed error messages
2. Verify all environment variables are set correctly
3. Ensure your wallet has sufficient SEI tokens for transactions
4. Test with small amounts first

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## Disclaimer

This plugin is for educational and development purposes. Always test thoroughly before using with real assets. The developers are not responsible for any loss of funds or NFTs.