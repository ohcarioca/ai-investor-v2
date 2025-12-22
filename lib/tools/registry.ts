/**
 * Tool Registry
 * Central coordination point for all tools
 * Handles registration, lookup, and execution
 */

import { ITool, ToolContext, ToolResult, ToolDefinition, ToolCategory } from './base/types';

// Import all tools
import {
  GetWalletBalanceTool,
  GetInvestmentDataTool,
  GenerateChartTool,
  GetPNLDataTool,
} from './implementations/balance';
import {
  InvestTool,
  ConfirmInvestTool,
  WithdrawTool,
  ConfirmWithdrawTool,
} from './implementations/investment';
import { SwapTokensTool, ConfirmSwapTool } from './implementations/swap';
import { GetTransactionHistoryTool } from './implementations/history';
import {
  GetSolanaBalanceTool,
  SolanaInvestTool,
  ConfirmSolanaInvestTool,
} from './implementations/solana';

/**
 * Registry for managing all available tools
 */
export class ToolRegistry {
  private tools: Map<string, ITool> = new Map();

  /**
   * Register a tool in the registry
   * @throws Error if tool already registered
   */
  register(tool: ITool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool already registered: ${tool.name}`);
    }
    this.tools.set(tool.name, tool);
    console.log(`[ToolRegistry] Registered tool: ${tool.name} (${tool.category})`);
  }

  /**
   * Register multiple tools at once
   */
  registerAll(tools: ITool[]): void {
    tools.forEach((tool) => this.register(tool));
  }

  /**
   * Get a tool by name
   */
  get(name: string): ITool | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all registered tools
   */
  getAll(): ITool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tools by category
   */
  getByCategory(category: ToolCategory): ITool[] {
    return this.getAll().filter((tool) => tool.category === category);
  }

  /**
   * Get tool definitions in OpenAI format
   * Used for function calling
   */
  getDefinitions(): Array<{ type: 'function'; function: ToolDefinition }> {
    return this.getAll().map((tool) => ({
      type: 'function' as const,
      function: tool.getDefinition(),
    }));
  }

  /**
   * Execute a tool by name
   */
  async execute(
    toolName: string,
    params: Record<string, unknown>,
    context: ToolContext
  ): Promise<ToolResult> {
    const tool = this.get(toolName);

    if (!tool) {
      console.error(`[ToolRegistry] Unknown tool: ${toolName}`);
      return {
        success: false,
        error: `Unknown tool: ${toolName}`,
        errorCode: 'UNKNOWN_TOOL',
      };
    }

    console.log(`[ToolRegistry] Executing tool: ${toolName}`, {
      category: tool.category,
      requiresWallet: tool.requiresWallet,
      hasWallet: context.isConnected,
      chainId: context.chainId,
      walletAddress: context.walletAddress?.slice(0, 10) + '...',
    });

    try {
      const startTime = Date.now();
      const result = await tool.execute(params, context);
      const duration = Date.now() - startTime;

      console.log(`[ToolRegistry] Tool ${toolName} completed in ${duration}ms`, {
        success: result.success,
        hasError: !!result.error,
      });

      return result;
    } catch (error) {
      console.error(`[ToolRegistry] Tool ${toolName} failed:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Tool execution failed',
        errorCode: 'TOOL_EXECUTION_ERROR',
      };
    }
  }

  /**
   * Check if a tool exists
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Get count of registered tools
   */
  get count(): number {
    return this.tools.size;
  }

  /**
   * Get list of all tool names
   */
  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }
}

/**
 * Create a registry with all default tools registered
 */
export function createDefaultRegistry(): ToolRegistry {
  const registry = new ToolRegistry();

  // Balance tools
  registry.register(new GetWalletBalanceTool());
  registry.register(new GetInvestmentDataTool());
  registry.register(new GenerateChartTool());
  registry.register(new GetPNLDataTool());

  // Investment tools
  registry.register(new InvestTool());
  registry.register(new ConfirmInvestTool());
  registry.register(new WithdrawTool());
  registry.register(new ConfirmWithdrawTool());

  // Swap tools
  registry.register(new SwapTokensTool());
  registry.register(new ConfirmSwapTool());

  // History tools
  registry.register(new GetTransactionHistoryTool());

  // Solana tools
  registry.register(new GetSolanaBalanceTool());
  registry.register(new SolanaInvestTool());
  registry.register(new ConfirmSolanaInvestTool());

  console.log(`[ToolRegistry] Created default registry with ${registry.count} tools`);

  return registry;
}

// Singleton instance
let registryInstance: ToolRegistry | null = null;

/**
 * Get the singleton tool registry instance
 * Creates and initializes on first call
 */
export function getToolRegistry(): ToolRegistry {
  if (!registryInstance) {
    registryInstance = createDefaultRegistry();
  }
  return registryInstance;
}

/**
 * Reset the registry (useful for testing)
 */
export function resetToolRegistry(): void {
  registryInstance = null;
}
