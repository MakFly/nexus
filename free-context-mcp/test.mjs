#!/usr/bin/env node

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

async function testMCP() {
  // Start server
  const transport = new StdioClientTransport({
    command: 'bun',
    args: ['src/index.ts'],
  })

  const client = new Client({
    name: 'test-client',
    version: '1.0.0',
  }, {
    capabilities: {}
  })

  try {
    // Connect to server
    await client.connect(transport)
    console.log('Connected to MCP server')

    // List tools
    const tools = await client.listTools()
    console.log('\nAvailable tools:')
    tools.tools.forEach(tool => {
      console.log(`  - ${tool.name}: ${tool.description}`)
    })

    // Test context_malloc
    console.log('\n--- Testing context_malloc ---')
    const mallocResult = await client.callTool({
      name: 'context_malloc',
      arguments: {
        projectId: 'test-project',
        maxTokens: 200000
      }
    })
    console.log('Result:', mallocResult.content[0].text)

    // Parse session ID
    const mallocData = JSON.parse(mallocResult.content[0].text)
    const sessionId = mallocData.sessionId

    // Test context_add_memory
    console.log('\n--- Testing context_add_memory ---')
    const memoryResult = await client.callTool({
      name: 'context_add_memory',
      arguments: {
        sessionId: sessionId,
        category: 'decision',
        content: 'Test decision: Use bun as default package manager'
      }
    })
    console.log('Result:', memoryResult.content[0].text)

    // Test context_search
    console.log('\n--- Testing context_search ---')
    const searchResult = await client.callTool({
      name: 'context_search',
      arguments: {
        query: 'decision',
        limit: 10
      }
    })
    console.log('Result:', searchResult.content[0].text)

    // Test context_checkpoint
    console.log('\n--- Testing context_checkpoint ---')
    const checkpointResult = await client.callTool({
      name: 'context_checkpoint',
      arguments: {
        sessionId: sessionId,
        name: 'initial-state',
        contextSummary: 'Initial test session',
        tokenCount: 1000
      }
    })
    console.log('Result:', checkpointResult.content[0].text)

    // Test context_free
    console.log('\n--- Testing context_free ---')
    const freeResult = await client.callTool({
      name: 'context_free',
      arguments: {
        sessionId: sessionId
      }
    })
    console.log('Result:', freeResult.content[0].text)

    console.log('\n✅ All tests passed!')

  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

testMCP()
