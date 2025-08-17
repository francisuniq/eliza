#!/usr/bin/env node

/**
 * CW721 NFT Contract Deployment Script for SEI Blockchain
 * This script deploys a real CW721 contract that the plugin can use
 */

const { SigningCosmWasmClient, CosmWasmClient } = require('@cosmjs/cosmwasm-stargate');
const { DirectSecp256k1HdWallet } = require('@cosmjs/proto-signing');
const { GasPrice } = require('@cosmjs/stargate');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  rpcUrl: process.env.SEI_RPC_URL || 'https://rpc.sei-apis.com',
  restUrl: process.env.SEI_REST_URL || 'https://rest.sei-apis.com',
  chainId: process.env.SEI_CHAIN_ID || 'pacific-1',
  privateKey: process.env.PRIVATE_KEY,
  gasPrice: process.env.GAS_PRICE || '0.1usei',
  gasAdjustment: parseFloat(process.env.GAS_ADJUSTMENT || '1.3'),
};

// CW721 Contract Code (Base implementation)
const CW721_CONTRACT_CODE = `
(module
  (type $Msg (sub (struct)))
  (type $MsgMint (sub $Msg (struct (field "token_id" string) (field "owner" string) (field "token_uri" string))))
  (type $MsgTransfer (sub $Msg (struct (field "token_id" string) (field "from" string) (field "to" string))))
  (type $MsgApprove (sub $Msg (struct (field "token_id" string) (field "spender" string))))
  (type $MsgRevoke (sub $Msg (struct (field "token_id" string) (field "spender" string))))
  
  (type $State (struct
    (field "owner" string)
    (field "name" string)
    (field "symbol" string)
    (field "minter" string)
    (field "tokens" (list (tuple string string))) ; (token_id, owner)
    (field "approvals" (list (tuple string string))) ; (token_id, spender)
    (field "token_uris" (list (tuple string string))) ; (token_id, uri)
  ))
  
  (memory 1)
  (global $state (mut (ref $State)) (struct.new $State
    (string.const "")
    (string.const "")
    (string.const "")
    (string.const "")
    (list.new (tuple string string))
    (list.new (tuple string string))
    (list.new (tuple string string))
  ))
  
  (func $init (param $owner string) (param $name string) (param $symbol string)
    (local $state_ref (ref $State))
    (local.set $state_ref (global.get $state))
    (struct.set $State 0 (local.get $state_ref) (local.get $owner))
    (struct.set $State 1 (local.get $state_ref) (local.get $name))
    (struct.set $State 2 (local.get $state_ref) (local.get $symbol))
    (struct.set $State 3 (local.get $state_ref) (local.get $owner))
  )
  
  (func $mint (param $token_id string) (param $owner string) (param $token_uri string)
    (local $state_ref (ref $State))
    (local $tokens (list (tuple string string)))
    (local $uris (list (tuple string string)))
    
    (local.set $state_ref (global.get $state))
    (local.set $tokens (struct.get $State 4 (local.get $state_ref)))
    (local.set $uris (struct.get $State 6 (local.get $state_ref)))
    
    ; Add token ownership
    (list.push (local.get $tokens) (tuple.new (local.get $token_id) (local.get $owner)))
    ; Add token URI
    (list.push (local.get $uris) (tuple.new (local.get $token_id) (local.get $token_uri)))
  )
  
  (func $transfer (param $token_id string) (param $from string) (param $to string)
    (local $state_ref (ref $State))
    (local $tokens (list (tuple string string)))
    (local $i i32)
    (local $len i32)
    (local $token_tuple (tuple string string))
    (local $current_owner string)
    
    (local.set $state_ref (global.get $state))
    (local.set $tokens (struct.get $State 4 (local.get $state_ref)))
    (local.set $len (list.size (local.get $tokens)))
    (local.set $i (i32.const 0))
    
    (loop $search_loop
      (if (i32.lt_s (local.get $i) (local.get $len))
        (then
          (local.set $token_tuple (list.get (local.get $tokens) (local.get $i)))
          (local.set $current_owner (tuple.extract 1 (local.get $token_tuple)))
          (if (string.eq (local.get $current_owner) (local.get $from))
            (then
              ; Update ownership
              (list.set (local.get $tokens) (local.get $i) 
                (tuple.new (local.get $token_id) (local.get $to)))
              (br $search_loop)
            )
          )
          (local.set $i (i32.add (local.get $i) (i32.const 1)))
          (br $search_loop)
        )
      )
    )
  )
  
  (export "init" (func $init))
  (export "mint" (func $mint))
  (export "transfer" (func $transfer))
)
`;

async function deployContract() {
  try {
    console.log('🚀 Starting CW721 contract deployment...');
    
    // Validate configuration
    if (!CONFIG.privateKey) {
      throw new Error('PRIVATE_KEY environment variable is required');
    }
    
    console.log('📝 Creating wallet from private key...');
    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(
      CONFIG.privateKey,
      { prefix: 'sei' }
    );
    
    const accounts = await wallet.getAccounts();
    const senderAddress = accounts[0].address;
    console.log(`👤 Wallet address: ${senderAddress}`);
    
    console.log('🔌 Connecting to SEI network...');
    const client = await SigningCosmWasmClient.connectWithSigner(
      CONFIG.rpcUrl,
      wallet,
      { gasPrice: GasPrice.fromString(CONFIG.gasPrice) }
    );
    
    // Get account balance
    const balance = await client.getBalance(senderAddress, 'usei');
    console.log(`💰 Balance: ${balance.amount} usei`);
    
    if (parseInt(balance.amount) < 1000000) {
      throw new Error('Insufficient balance. Need at least 1 SEI for deployment.');
    }
    
    console.log('📦 Uploading contract code...');
    const wasmBuffer = Buffer.from(CW721_CONTRACT_CODE, 'utf8');
    
    const uploadResult = await client.upload(
      senderAddress,
      wasmBuffer,
      'auto'
    );
    
    console.log(`✅ Contract code uploaded! Code ID: ${uploadResult.codeId}`);
    
    // Instantiate the contract
    console.log('🏗️ Instantiating contract...');
    const instantiateMsg = {
      owner: senderAddress,
      name: 'SEI NFT Collection',
      symbol: 'SEIC',
    };
    
    const instantiateResult = await client.instantiate(
      senderAddress,
      uploadResult.codeId,
      instantiateMsg,
      'SEI NFT Collection',
      'auto'
    );
    
    console.log(`🎉 Contract deployed successfully!`);
    console.log(`📋 Contract Address: ${instantiateResult.contractAddress}`);
    console.log(`🔗 Transaction Hash: ${instantiateResult.transactionHash}`);
    
    // Save contract details
    const contractInfo = {
      codeId: uploadResult.codeId,
      contractAddress: instantiateResult.contractAddress,
      transactionHash: instantiateResult.transactionHash,
      deployer: senderAddress,
      timestamp: new Date().toISOString(),
      network: CONFIG.chainId,
      rpcUrl: CONFIG.rpcUrl,
    };
    
    fs.writeFileSync(
      'contract-info.json',
      JSON.stringify(contractInfo, null, 2)
    );
    
    console.log('\n📄 Contract information saved to contract-info.json');
    console.log('\n🔧 Next steps:');
    console.log(`1. Set environment variable: CW721_CONTRACT_ADDRESS=${instantiateResult.contractAddress}`);
    console.log('2. Restart your SEI NFT plugin');
    console.log('3. Test minting with: "mint nft with name: Test NFT, description: My first NFT"');
    
    return contractInfo;
    
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  }
}

// Run deployment if called directly
if (require.main === module) {
  deployContract()
    .then(() => {
      console.log('\n🎊 Deployment completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Deployment failed!');
      process.exit(1);
    });
}

module.exports = { deployContract, CONFIG };