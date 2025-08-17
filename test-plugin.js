// Simple test script for the SEI NFT plugin
const { seiNftPlugin } = require('./sei-nft-plugin');

async function testPlugin() {
  try {
    console.log('Testing SEI NFT Plugin...');
    
    // Test plugin initialization
    await seiNftPlugin.init({
      PRIVATE_KEY: 'test_private_key_for_testing_only_do_not_use_in_production_123456789',
      SEI_RPC_URL: 'https://rpc.sei-apis.com',
      SEI_REST_URL: 'https://rest.sei-apis.com',
      SEI_CHAIN_ID: 'pacific-1',
      PINATA_JWT: 'test_jwt_token',
    });
    
    console.log('✅ Plugin initialized successfully');
    
    // Test service creation
    const service = new seiNftPlugin.services[0]();
    console.log('✅ Service created successfully');
    
    // Test service start
    await service.start();
    console.log('✅ Service started successfully');
    
    console.log('\n🎉 All tests passed! The plugin is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testPlugin();