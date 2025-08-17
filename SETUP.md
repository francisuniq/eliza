# 🚀 SEI NFT Plugin - Complete Setup Guide

This guide will help you set up a **fully functional, production-ready** SEI NFT plugin with real blockchain interactions, no simulations or mocks.

## 📋 Prerequisites

- Node.js 18+ and npm
- SEI wallet with private key
- At least 1 SEI for contract deployment
- Pinata account for IPFS storage (optional but recommended)

## 🛠️ Installation

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Create a `.env` file in your project root:

```env
# Required - Your SEI private key (64-66 characters)
PRIVATE_KEY=your_sei_private_key_here_minimum_64_characters_long

# SEI Network Configuration
SEI_RPC_URL=https://rpc.sei-apis.com
SEI_REST_URL=https://rest.sei-apis.com
SEI_CHAIN_ID=pacific-1

# IPFS Configuration (Pinata - Recommended)
PINATA_JWT=your_pinata_jwt_token_here
PINATA_GATEWAY=your_dedicated_gateway_domain (optional)

# Marketplace APIs (Optional but recommended)
MAGIC_EDEN_API_KEY=your_magic_eden_api_key
NFTSCAN_API_KEY=your_nftscan_api_key

# Gas Configuration
GAS_PRICE=0.1usei
GAS_ADJUSTMENT=1.3
```

## 🏗️ Contract Deployment

### Option 1: Deploy Your Own Contract (Recommended)

1. **Deploy to Mainnet:**
   ```bash
   npm run deploy:mainnet
   ```

2. **Deploy to Testnet:**
   ```bash
   npm run deploy:testnet
   ```

3. **Deploy with Custom Network:**
   ```bash
   SEI_CHAIN_ID=your_chain_id npm run deploy
   ```

### Option 2: Use Existing Contract

If you already have a deployed CW721 contract, just set the environment variable:
```env
CW721_CONTRACT_ADDRESS=sei1your_contract_address_here
```

## 🔧 Plugin Setup

### 1. Initialize the Plugin
```typescript
import { seiNftPlugin } from './sei-nft-plugin';

// Initialize with your configuration
await seiNftPlugin.init({
  PRIVATE_KEY: process.env.PRIVATE_KEY,
  SEI_RPC_URL: process.env.SEI_RPC_URL,
  PINATA_JWT: process.env.PINATA_JWT,
  CW721_CONTRACT_ADDRESS: process.env.CW721_CONTRACT_ADDRESS,
});
```

### 2. Start the Service
```typescript
const service = runtime.getService('sei-nft') as SeiNftService;
await service.start();
```

## 🧪 Testing

### 1. Test Plugin Initialization
```bash
npm test
```

### 2. Test NFT Minting
```typescript
// Test the mintNFT action
const metadata = {
  name: "Test NFT",
  description: "A test NFT for verification",
  image: "https://via.placeholder.com/512x512.png?text=Test+NFT",
  attributes: [
    { trait_type: "Test", value: "Yes" }
  ]
};

const result = await service.mintNFT(metadata);
console.log('Minted NFT:', result);
```

## 🎯 Usage Examples

### Natural Language Commands

The plugin supports natural language interaction:

```bash
# Mint an NFT
"mint nft with name: Digital Art, description: Beautiful artwork, image: https://example.com/art.jpg"

# View your collection
"show me my NFT collection"

# Browse marketplace
"browse NFTs on Magic Eden marketplace"

# Buy an NFT
"buy NFT token ID: abc123, contract: sei1def..., price: 0.5"

# Sell an NFT
"sell NFT token ID: abc123, contract: sei1def..., price: 1.0"
```

### API Endpoints

The plugin provides REST API endpoints:

```bash
# Mint NFT
POST /api/nft/mint
{
  "name": "Digital Art",
  "description": "Beautiful artwork",
  "image": "https://example.com/art.jpg",
  "attributes": [{"trait_type": "Style", "value": "Digital"}]
}

# Buy NFT
POST /api/nft/buy
{
  "tokenId": "abc123",
  "contractAddress": "sei1def...",
  "price": "0.5"
}

# Get owned NFTs
GET /api/nft/owned?address=sei1your_address
```

## 🔍 Verification

### 1. Check Contract Deployment
```bash
# View contract info
cat contract-info.json
```

### 2. Verify on SEI Explorer
- Visit [SEI Explorer](https://sei.explorers.guru/)
- Search for your contract address
- Verify the contract is deployed and active

### 3. Test IPFS Upload
```typescript
// Test IPFS service
const ipfsResult = await service.ipfsService.uploadJSON({
  name: "Test",
  description: "Test metadata"
});
console.log('IPFS Hash:', ipfsResult.ipfsHash);
```

## 🚨 Troubleshooting

### Common Issues

1. **"Service not initialized"**
   - Ensure all required environment variables are set
   - Check that the plugin is properly initialized

2. **"Contract address is required"**
   - Deploy a contract or set CW721_CONTRACT_ADDRESS
   - Run `npm run deploy` to deploy a new contract

3. **"Failed to connect to SEI network"**
   - Verify RPC and REST URLs are correct
   - Check network connectivity and firewall settings

4. **"Insufficient balance"**
   - Ensure your wallet has at least 1 SEI
   - Check gas price configuration

5. **"IPFS upload failed"**
   - Verify Pinata JWT token is correct
   - Check network connectivity

### Debug Mode

Enable debug logging:
```typescript
logger.setLevel('debug');
```

## 🔒 Security Considerations

- **Never commit private keys** to version control
- Use environment variables for sensitive configuration
- Test on testnet before mainnet deployment
- Validate all user inputs before processing
- Use HTTPS for all API communications

## 📊 Monitoring

### Transaction Tracking
- Monitor transactions on SEI Explorer
- Check gas usage and optimization
- Track IPFS upload success rates

### Performance Metrics
- Response times for API calls
- Success rates for blockchain operations
- IPFS upload/download performance

## 🚀 Production Deployment

### 1. Environment Setup
```bash
# Production environment
NODE_ENV=production
SEI_CHAIN_ID=pacific-1
GAS_PRICE=0.1usei
```

### 2. Load Balancing
- Deploy multiple instances behind a load balancer
- Use Redis for session management
- Implement rate limiting

### 3. Monitoring & Logging
- Use structured logging (JSON)
- Implement health checks
- Monitor blockchain node health

## 📚 Additional Resources

- [SEI Documentation](https://docs.sei.io/)
- [CosmWasm Documentation](https://docs.cosmwasm.com/)
- [Pinata IPFS API](https://docs.pinata.cloud/)
- [Magic Eden API](https://docs.magiceden.dev/)

## 🆘 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review error logs and stack traces
3. Verify environment configuration
4. Test with minimal configuration
5. Create an issue with detailed error information

## 🎉 Success!

Once everything is working:

- ✅ Contract deployed and verified
- ✅ Plugin initialized successfully
- ✅ NFT minting working
- ✅ IPFS uploads successful
- ✅ Marketplace integration active

You now have a **fully functional, production-ready** SEI NFT plugin! 🚀