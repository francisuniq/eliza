# SEI NFT Plugin - Production Deployment Guide

## 🚀 Complete Production Deployment

This guide covers deploying the fully-featured SEI NFT plugin with all real integrations and no mocks.

## 📋 Prerequisites

### 1. Node.js Environment
- **Node.js**: v18.0.0 or higher
- **npm**: v8.0.0 or higher
- **TypeScript**: v5.2.2 or higher

### 2. SEI Blockchain Setup
- **SEI Wallet**: With private key for signing transactions
- **SEI Tokens**: For gas fees (minimum 1 SEI recommended)
- **RPC Access**: Mainnet or testnet RPC endpoint

### 3. Required API Keys
- **Pinata**: For IPFS metadata storage (recommended)
- **Magic Eden**: For marketplace integration (optional but recommended)
- **NFTScan**: For NFT data retrieval (optional but recommended)

## 🔧 Installation Steps

### 1. Install Dependencies

```bash
# Clone or copy the plugin files
npm install

# Install required dependencies
npm install @cosmjs/stargate @cosmjs/proto-signing @cosmjs/cosmwasm-stargate
npm install @cosmjs/amino @cosmjs/crypto @cosmjs/encoding @cosmjs/utils
npm install ethers axios zod dotenv pinata-sdk ipfs-http-client
npm install form-data mime-types big.js bech32 node-fetch

# Install development dependencies
npm install --save-dev @types/node @types/big.js @types/mime-types
npm install --save-dev typescript ts-node jest @types/jest eslint prettier
```

### 2. Environment Configuration

Create your `.env` file:

```bash
cp .env.example .env
```

Configure the required variables:

```env
# REQUIRED: Your SEI wallet private key
PRIVATE_KEY=your_64_character_private_key_here

# SEI Blockchain Configuration (Mainnet)
SEI_RPC_URL=https://rpc.sei-apis.com
SEI_REST_URL=https://rest.sei-apis.com
SEI_CHAIN_ID=pacific-1

# For Testnet (Arctic-1)
# SEI_RPC_URL=https://rpc.arctic-1.seinetwork.io
# SEI_REST_URL=https://rest.arctic-1.seinetwork.io
# SEI_CHAIN_ID=arctic-1

# IPFS Storage (Pinata - Recommended)
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_API_KEY=your_pinata_secret_key
PINATA_JWT=your_pinata_jwt_token

# Magic Eden API (for marketplace features)
MAGIC_EDEN_API_KEY=your_magic_eden_api_key

# NFTScan API (for NFT data)
NFTSCAN_API_KEY=your_nftscan_api_key

# Default NFT Contract (deploy your own CW721 contract)
CW721_CONTRACT_ADDRESS=sei1your_contract_address_here
```

### 3. Deploy CW721 Contract (Required for Minting)

Before minting NFTs, you need to deploy a CW721 contract:

```bash
# Install seid CLI
curl -L https://github.com/sei-protocol/sei-chain/releases/download/v3.0.8/sei-linux-amd64 -o seid
chmod +x seid
sudo mv seid /usr/local/bin/

# Store CW721 contract code
seid tx wasm store cw721_base.wasm \
  --from=your_wallet_name \
  --chain-id=pacific-1 \
  --node=https://rpc.sei-apis.com \
  --gas=5000000 \
  --fees=500000usei

# Get code ID from transaction result, then instantiate
seid tx wasm instantiate [CODE_ID] \
  '{"name":"Your NFT Collection","symbol":"YNC","minter":"your_sei_address"}' \
  --from=your_wallet_name \
  --admin=your_sei_address \
  --label="Your NFT Contract" \
  --chain-id=pacific-1 \
  --node=https://rpc.sei-apis.com \
  --gas=250000 \
  --fees=25000usei
```

### 4. Get API Keys

#### Pinata (IPFS Storage)
1. Visit [app.pinata.cloud](https://app.pinata.cloud/)
2. Create account and verify email
3. Go to API Keys section
4. Create new API key with admin permissions
5. Save API Key, Secret Key, and JWT token

#### Magic Eden (Marketplace)
1. Visit [docs.magiceden.io](https://docs.magiceden.io/)
2. Apply for API access
3. Follow their developer onboarding process
4. Get API key for SEI marketplace access

#### NFTScan (NFT Data)
1. Visit [developer.nftscan.com](https://developer.nftscan.com/)
2. Create developer account
3. Get free API key (up to 100 requests/day)
4. Upgrade for higher limits if needed

## 🏗️ Integration with Eliza

### 1. Basic Integration

```typescript
import seiNftPlugin from './sei-nft-plugin';
import { Agent } from '@elizaos/core';

const agent = new Agent({
  name: 'NFT Assistant',
  plugins: [seiNftPlugin],
  // ... other configuration
});

// Initialize the plugin
await seiNftPlugin.init({
  PRIVATE_KEY: process.env.PRIVATE_KEY,
  SEI_RPC_URL: process.env.SEI_RPC_URL,
  PINATA_API_KEY: process.env.PINATA_API_KEY,
  PINATA_SECRET_API_KEY: process.env.PINATA_SECRET_API_KEY,
  CW721_CONTRACT_ADDRESS: process.env.CW721_CONTRACT_ADDRESS,
});

// Start the agent
await agent.start();
```

### 2. Advanced Configuration

```typescript
const seiNftConfig = {
  PRIVATE_KEY: process.env.PRIVATE_KEY,
  SEI_RPC_URL: process.env.SEI_RPC_URL,
  SEI_REST_URL: process.env.SEI_REST_URL,
  SEI_CHAIN_ID: process.env.SEI_CHAIN_ID,
  MAGIC_EDEN_API_KEY: process.env.MAGIC_EDEN_API_KEY,
  NFTSCAN_API_KEY: process.env.NFTSCAN_API_KEY,
  PINATA_API_KEY: process.env.PINATA_API_KEY,
  PINATA_SECRET_API_KEY: process.env.PINATA_SECRET_API_KEY,
  CW721_CONTRACT_ADDRESS: process.env.CW721_CONTRACT_ADDRESS,
  GAS_PRICE: '0.1usei',
  GAS_ADJUSTMENT: '1.3',
  MARKETPLACE_FEE_BASIS_POINTS: '250',
  DEFAULT_ROYALTY_BASIS_POINTS: '500',
};

await seiNftPlugin.init(seiNftConfig);
```

## 🎯 Available Features

### Core NFT Operations
- ✅ **NFT Minting**: Real CW721 contract minting with IPFS metadata
- ✅ **Portfolio Management**: View owned NFTs with full metadata
- ✅ **Marketplace Browsing**: Real Magic Eden integration
- ✅ **NFT Transfers**: Blockchain-based ownership transfers
- ✅ **Batch Operations**: Efficient bulk minting
- ✅ **Gas Optimization**: Real gas estimation and optimization

### Blockchain Features
- ✅ **CosmWasm Integration**: Native SEI smart contract support
- ✅ **IPFS Storage**: Decentralized metadata via Pinata
- ✅ **Transaction Handling**: Full blockchain transaction support
- ✅ **Error Management**: Comprehensive error handling
- ✅ **Multi-network**: Mainnet and testnet support

### API Integrations
- ✅ **Magic Eden**: Real marketplace data and listings
- ✅ **NFTScan**: Comprehensive NFT analytics
- ✅ **IPFS/Pinata**: Reliable metadata storage
- ✅ **SEI RPC**: Direct blockchain interaction

## 🎮 Usage Examples

### 1. Minting NFTs
```
User: "Mint an NFT with name: Digital Sunset, description: Beautiful sunset artwork, image: https://example.com/sunset.jpg"

Agent: 🎨 Successfully minted NFT "Digital Sunset"!

✅ Token ID: token_1703123456_abc123def
🔗 Transaction: 0xabc123def456...
📝 Metadata: ipfs://QmABC123DEF456...
👤 Owner: sei1abc123def456...

Your NFT has been created and the metadata is stored permanently on IPFS!
```

### 2. Viewing Portfolio
```
User: "Show me my NFT collection"

Agent: 📊 **Your NFT Portfolio**

👤 **Address**: `sei1abc123def456ghi789jkl012mno345pqr678stu`
💰 **Balance**: 2.5 SEI

🎨 **Collection Summary**: 3 NFTs

1. **Digital Sunset**
   🆔 Token ID: `token_1703123456_abc123def`
   📝 Description: Beautiful sunset artwork
   ✨ Traits: Color: Orange, Style: Digital, Rarity: Unique
   🔗 Metadata: ipfs://QmABC123DEF456...
```

### 3. Marketplace Browsing
```
User: "Browse NFTs on Magic Eden marketplace"

Agent: 🏪 **Magic Eden Marketplace**

🎨 **Available NFTs** (12 listings):

1. **Cosmic Dreams #42**
   💰 Price: 0.8 SEI
   👤 Seller: `sei1def456...890xyz`
   🆔 Token ID: `cosmic_42`
   📋 Contract: `sei1ghi789...234abc`
   📝 A mesmerizing piece of cosmic digital art featuring swirling galaxies...
```

### 4. Batch Minting
```
User: "Batch mint 5 NFTs with base name: Generative Art, description: AI-generated artwork series"

Agent: ✅ **Batch Mint Completed Successfully!**

🎨 **Minted 5 NFTs**:

1. **Generative Art #1**
   🆔 Token ID: `token_1703123457_def456ghi`
   🔗 Transaction: `0xdef456ghi789...`
   📝 Metadata: ipfs://QmDEF456GHI789...

[... continues for all 5 NFTs ...]
```

## 🔒 Security Best Practices

### 1. Private Key Management
- **Never commit** private keys to version control
- Use **environment variables** for all sensitive data
- Consider **hardware wallets** for production
- Implement **key rotation** policies
- Use **encrypted storage** for backups

### 2. API Key Security
- **Restrict API key permissions** to minimum required
- **Monitor API usage** for unusual activity
- **Rotate keys regularly**
- **Use rate limiting** to prevent abuse

### 3. Smart Contract Security
- **Audit contract code** before deployment
- **Test on testnet** extensively
- **Use established contract templates** (like CW721-base)
- **Implement proper access controls**
- **Monitor contract interactions**

## 📊 Monitoring and Analytics

### 1. Transaction Monitoring
```typescript
// Monitor successful mints
service.on('nft_minted', (data) => {
  console.log(`NFT minted: ${data.tokenId} by ${data.owner}`);
  // Log to analytics service
});

// Monitor failed transactions
service.on('transaction_failed', (error) => {
  console.error(`Transaction failed: ${error.message}`);
  // Alert monitoring system
});
```

### 2. Performance Metrics
- **Transaction success rate**
- **Gas usage optimization**
- **IPFS upload times**
- **API response times**
- **Error rates by operation type**

### 3. Usage Analytics
- **NFTs minted per day**
- **Active wallet addresses**
- **Most popular collections**
- **Average transaction costs**
- **User engagement metrics**

## 🚨 Troubleshooting

### Common Issues and Solutions

#### 1. "PRIVATE_KEY environment variable is required"
```bash
# Check if .env file exists and has correct format
cat .env | grep PRIVATE_KEY

# Ensure private key is 64 characters (without 0x prefix)
echo ${#PRIVATE_KEY}  # Should output 64
```

#### 2. "Failed to connect to SEI RPC"
```bash
# Test RPC connectivity
curl -X POST https://rpc.sei-apis.com \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"status","id":1}'

# Try alternative RPC endpoints if needed
```

#### 3. "Insufficient funds for gas"
```bash
# Check wallet balance
seid query bank balances your_sei_address \
  --node=https://rpc.sei-apis.com

# Get more SEI tokens if needed
```

#### 4. "Contract address required for minting"
```bash
# Deploy a new CW721 contract or use existing one
# Update CW721_CONTRACT_ADDRESS in .env file
```

#### 5. "IPFS upload failed"
```bash
# Check Pinata API credentials
curl -X GET https://api.pinata.cloud/data/testAuthentication \
  -H "pinata_api_key: YOUR_API_KEY" \
  -H "pinata_secret_api_key: YOUR_SECRET_KEY"
```

## 🔄 Updates and Maintenance

### 1. Keeping Dependencies Updated
```bash
# Check for outdated packages
npm outdated

# Update dependencies
npm update

# Update major versions carefully
npm install @cosmjs/stargate@latest
```

### 2. Smart Contract Updates
- **Monitor contract for vulnerabilities**
- **Prepare migration plans** for contract upgrades
- **Test updates on testnet** first
- **Coordinate with users** for major changes

### 3. API Integration Updates
- **Monitor API provider announcements**
- **Test breaking changes** in development
- **Implement fallback mechanisms**
- **Update documentation** as needed

## 📞 Support and Resources

### Official Documentation
- **SEI Network**: [docs.sei.io](https://docs.sei.io/)
- **CosmWasm**: [docs.cosmwasm.com](https://docs.cosmwasm.com/)
- **Magic Eden**: [docs.magiceden.io](https://docs.magiceden.io/)
- **Pinata**: [docs.pinata.cloud](https://docs.pinata.cloud/)

### Community Resources
- **SEI Discord**: [discord.gg/sei](https://discord.gg/sei)
- **CosmWasm Telegram**: [t.me/CosmWasm](https://t.me/CosmWasm)
- **GitHub Issues**: Report bugs and feature requests

### Emergency Contacts
- **Critical Issues**: Reach out to SEI core team
- **API Issues**: Contact respective API providers
- **Security Issues**: Follow responsible disclosure

## 🏆 Production Checklist

### Pre-Deployment
- [ ] All environment variables configured
- [ ] CW721 contract deployed and tested
- [ ] API keys obtained and tested
- [ ] IPFS storage configured
- [ ] Security review completed
- [ ] Testnet testing completed

### Post-Deployment
- [ ] Transaction monitoring enabled
- [ ] Error logging configured
- [ ] Performance metrics tracked
- [ ] Backup procedures in place
- [ ] Update procedures documented
- [ ] Team training completed

### Ongoing Maintenance
- [ ] Weekly dependency updates
- [ ] Monthly security reviews
- [ ] Quarterly performance analysis
- [ ] Annual security audits
- [ ] Continuous monitoring active

---

## 🎉 Congratulations!

You now have a complete, production-ready SEI NFT plugin with:

- ✅ **Real CosmWasm CW721 integration**
- ✅ **IPFS metadata storage via Pinata**
- ✅ **Magic Eden marketplace integration**
- ✅ **NFTScan analytics integration**
- ✅ **Comprehensive error handling**
- ✅ **Gas optimization**
- ✅ **Batch operations**
- ✅ **Full TypeScript support**
- ✅ **Production-ready security**

The plugin is ready for production use with real blockchain transactions, IPFS storage, and marketplace integration. No mocks, no simulations - everything is fully functional!