# SEI NFT Plugin Usage Examples

This document provides detailed examples of how to use the SEI NFT plugin with natural language commands and API calls.

## Natural Language Commands

### 1. Minting NFTs

#### Basic Mint
```
User: "Mint an NFT with name: Sunset Paradise, description: A beautiful sunset over the ocean"
Agent: Successfully minted NFT "Sunset Paradise"!

Token ID: 1234
Transaction Hash: 0xabcd1234...
Owner: 0x742d35cc6634c0532925a3b8d6A39E5d4f7c7b76
```

#### Mint with Image
```
User: "Create an NFT with name: Digital Dragon, description: A mystical dragon artwork, image: https://example.com/dragon.jpg"
Agent: Successfully minted NFT "Digital Dragon"!

Token ID: 1235
Transaction Hash: 0xefgh5678...
Owner: 0x742d35cc6634c0532925a3b8d6A39E5d4f7c7b76
```

### 2. Viewing Your Collection

#### View All NFTs
```
User: "Show me my NFTs"
Agent: Your NFT Collection (Address: 0x742d35cc6634c0532925a3b8d6A39E5d4f7c7b76)
Wallet Balance: 2.5 SEI

You own 3 NFTs:

1. Sunset Paradise
   Token ID: 1234
   Contract: 0x50b2bB7c0C0E6c374E8cC5b88e3Ee4DcC5AE1234
   Description: A beautiful sunset over the ocean

2. Digital Dragon
   Token ID: 1235
   Contract: 0x50b2bB7c0C0E6c374E8cC5b88e3Ee4DcC5AE1234
   Description: A mystical dragon artwork

3. Ocean Waves
   Token ID: 1236
   Contract: 0x50b2bB7c0C0E6c374E8cC5b88e3Ee4DcC5AE1234
   Description: Peaceful ocean waves
```

#### Alternative Commands
```
User: "What NFTs do I have?"
User: "My collection"
User: "List my NFTs"
```

### 3. Browsing the Marketplace

#### View Available NFTs
```
User: "Show me available NFTs to buy"
Agent: Available NFTs on Magic Eden Marketplace:

Found 5 NFTs for sale:

1. Cool Art #123
   Token ID: 123
   Contract: 0xabc123...
   Price: 0.5 SEI
   Seller: 0x123abc...
   Description: A cool piece of digital art

2. Rare Gem #456
   Token ID: 456
   Contract: 0xdef456...
   Price: 1.2 SEI
   Seller: 0x456def...
   Description: A rare and valuable NFT
```

#### Alternative Commands
```
User: "Browse NFTs on marketplace"
User: "What NFTs are for sale?"
User: "Available NFTs"
```

### 4. Purchasing NFTs

#### Buy an NFT
```
User: "Buy NFT token ID: 123, contract: 0xabc123456789abcdef123456789abcdef12345678, price: 0.5"
Agent: Successfully purchased NFT!

Token ID: 123
Contract: 0xabc123456789abcdef123456789abcdef12345678
Price Paid: 0.5 SEI
Transaction Hash: 0x987654321...
New Owner: 0x742d35cc6634c0532925a3b8d6A39E5d4f7c7b76
```

### 5. Selling NFTs

#### List NFT for Sale
```
User: "Sell NFT token ID: 1234, contract: 0x50b2bB7c0C0E6c374E8cC5b88e3Ee4DcC5AE1234, price: 1.0"
Agent: Successfully listed NFT for sale!

Token ID: 1234
Contract: 0x50b2bB7c0C0E6c374E8cC5b88e3Ee4DcC5AE1234
Asking Price: 1.0 SEI
Listing ID: listing_1703123456789_1234
Seller: 0x742d35cc6634c0532925a3b8d6A39E5d4f7c7b76

Your NFT is now available on Magic Eden marketplace!
```

## API Examples

### 1. Mint NFT via API

```bash
curl -X POST http://localhost:3000/api/nft/mint \
  -H "Content-Type: application/json" \
  -d '{
    "name": "API Minted NFT",
    "description": "An NFT created via API",
    "image": "https://example.com/api-nft.jpg",
    "attributes": [
      {
        "trait_type": "Color",
        "value": "Blue"
      },
      {
        "trait_type": "Rarity",
        "value": "Common"
      }
    ]
  }'
```

Response:
```json
{
  "tokenId": "1237",
  "transactionHash": "0xijk789..."
}
```

### 2. Get Owned NFTs via API

```bash
curl http://localhost:3000/api/nft/owned
```

Response:
```json
{
  "walletAddress": "0x742d35cc6634c0532925a3b8d6A39E5d4f7c7b76",
  "balance": "2.5",
  "nfts": [
    {
      "tokenId": "1234",
      "contractAddress": "0x50b2bB7c0C0E6c374E8cC5b88e3Ee4DcC5AE1234",
      "name": "Sunset Paradise",
      "description": "A beautiful sunset over the ocean",
      "image": "https://via.placeholder.com/300x300.png?text=NFT",
      "owner": "0x742d35cc6634c0532925a3b8d6A39E5d4f7c7b76"
    }
  ]
}
```

### 3. Get Available NFTs via API

```bash
curl "http://localhost:3000/api/nft/available?limit=10"
```

Response:
```json
{
  "nfts": [
    {
      "tokenId": "123",
      "contractAddress": "0xabc123...",
      "name": "Cool Art #123",
      "description": "A cool piece of digital art",
      "image": "https://example.com/art123.jpg",
      "owner": "0x123abc...",
      "price": "0.5",
      "marketplace": "magiceden"
    }
  ]
}
```

## Advanced Examples

### 1. Batch Operations
```
User: "Show me my collection and then show available NFTs"
Agent: [Shows collection first, then marketplace listings]
```

### 2. Conditional Operations
```
User: "If I have more than 5 NFTs, sell the oldest one for 0.8 SEI"
Agent: [Checks collection and executes based on condition]
```

### 3. Price Alerts
```
User: "Let me know if any NFT under 0.3 SEI becomes available"
Agent: [Sets up monitoring for price alerts]
```

## Error Handling Examples

### 1. Missing Private Key
```
User: "Show me my NFTs"
Agent: Sorry, I couldn't retrieve your NFTs. PRIVATE_KEY environment variable is required
```

### 2. Invalid Purchase Details
```
User: "Buy NFT 123"
Agent: Please provide the token ID, contract address, and price for the NFT you want to purchase. Example: "Buy NFT token ID: 123, contract: 0x..., price: 0.5"
```

### 3. Network Issues
```
User: "Show available NFTs"
Agent: Sorry, I couldn't retrieve available NFTs. Failed to get available NFTs: Network error
```

## Integration Examples

### JavaScript/TypeScript Integration

```typescript
import seiNftPlugin from './sei-nft-plugin';
import { Agent } from '@elizaos/core';

// Initialize the agent with the plugin
const agent = new Agent({
  name: 'NFT Assistant',
  plugins: [seiNftPlugin],
  // ... other configuration
});

// Start the agent
await agent.start();

// The agent can now respond to NFT-related queries
```

### Environment Setup

```bash
# .env file
PRIVATE_KEY=1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
SEI_RPC_URL=https://evm-rpc.sei-apis.com
NFTSCAN_API_KEY=your_api_key_here
NFT_CONTRACT_ADDRESS=0x50b2bB7c0C0E6c374E8cC5b88e3Ee4DcC5AE1234
```

## Best Practices

1. **Always test with small amounts first**
2. **Verify contract addresses before transactions**
3. **Keep your private key secure**
4. **Monitor gas fees on the SEI network**
5. **Use descriptive names and metadata for NFTs**
6. **Check marketplace listings before purchasing**

## Troubleshooting Common Issues

### Issue: "Failed to mint NFT"
**Solution**: Check that you have sufficient SEI balance and a valid NFT contract address

### Issue: "No NFTs found"
**Solution**: Ensure the wallet address is correct and has minted or purchased NFTs

### Issue: "Magic Eden API error"
**Solution**: Check internet connection and try again later if the service is down

### Issue: "Invalid private key"
**Solution**: Ensure private key is 64 characters and properly formatted in .env file