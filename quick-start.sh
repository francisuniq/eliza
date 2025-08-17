#!/bin/bash

# 🚀 SEI NFT Plugin - Quick Start Script
# This script automates the setup process for a fully functional SEI NFT plugin

set -e

echo "🎉 Welcome to SEI NFT Plugin Setup!"
echo "====================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "Visit: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ npm $(npm -v) detected"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Check if .env file exists
if [ ! -f .env ]; then
    echo ""
    echo "🔧 Creating .env file..."
    cat > .env << EOF
# SEI NFT Plugin Configuration
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
EOF
    echo "✅ .env file created"
    echo "⚠️  Please edit .env file with your actual values before proceeding"
else
    echo "✅ .env file already exists"
fi

# Check if contract is deployed
if [ -f contract-info.json ]; then
    echo "✅ Contract already deployed"
    CONTRACT_ADDRESS=$(grep -o '"contractAddress": "[^"]*"' contract-info.json | cut -d'"' -f4)
    echo "📋 Contract Address: $CONTRACT_ADDRESS"
else
    echo ""
    echo "🏗️  No contract deployed yet"
    echo "💡 You can deploy a contract later with: npm run deploy"
fi

echo ""
echo "🎯 Setup Complete! Next Steps:"
echo "==============================="

if [ ! -f .env ] || grep -q "your_sei_private_key_here" .env; then
    echo "1. 📝 Edit .env file with your actual values"
    echo "   - Set your SEI private key"
    echo "   - Configure IPFS (Pinata JWT)"
    echo "   - Add marketplace API keys (optional)"
fi

if [ ! -f contract-info.json ]; then
    echo "2. 🏗️  Deploy your CW721 contract:"
    echo "   npm run deploy:mainnet    # For mainnet"
    echo "   npm run deploy:testnet    # For testnet"
fi

echo "3. 🧪 Test the plugin:"
echo "   npm test"

echo "4. 🚀 Start using the plugin:"
echo "   npm start"

echo ""
echo "📚 For detailed setup instructions, see SETUP.md"
echo "🔧 For troubleshooting, see the troubleshooting section in SETUP.md"

echo ""
echo "🎉 Happy NFT minting on SEI! 🚀"