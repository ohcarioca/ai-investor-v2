import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ToolRegistry,
  createDefaultRegistry,
  getToolRegistry,
  resetToolRegistry,
} from './registry';
import { ITool, ToolContext, ToolResult, ToolCategory } from './base/types';

// Mock tool for testing
class MockTool implements ITool {
  readonly name: string;
  readonly description = 'A mock tool for testing';
  readonly category: ToolCategory;
  readonly requiresWallet = false;

  constructor(name: string, category: ToolCategory = 'balance') {
    this.name = name;
    this.category = category;
  }

  getDefinition() {
    return {
      name: this.name,
      description: this.description,
      parameters: {
        type: 'object' as const,
        properties: {},
        required: [],
      },
    };
  }

  async execute(
    params: Record<string, unknown>,
    context: ToolContext
  ): Promise<ToolResult> {
    return {
      success: true,
      data: { mock: true, params },
    };
  }
}

// Mock tool that throws error
class ErrorTool implements ITool {
  readonly name = 'error_tool';
  readonly description = 'A tool that throws errors';
  readonly category: ToolCategory = 'swap';
  readonly requiresWallet = false;

  getDefinition() {
    return {
      name: this.name,
      description: this.description,
      parameters: {
        type: 'object' as const,
        properties: {},
        required: [],
      },
    };
  }

  async execute(): Promise<ToolResult> {
    throw new Error('Intentional error');
  }
}

describe('ToolRegistry', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry();
    // Suppress console.log in tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('register', () => {
    it('should register a tool successfully', () => {
      const tool = new MockTool('test_tool');
      registry.register(tool);

      expect(registry.has('test_tool')).toBe(true);
      expect(registry.count).toBe(1);
    });

    it('should throw error when registering duplicate tool', () => {
      const tool = new MockTool('test_tool');
      registry.register(tool);

      expect(() => registry.register(tool)).toThrow(
        'Tool already registered: test_tool'
      );
    });
  });

  describe('registerAll', () => {
    it('should register multiple tools', () => {
      const tools = [
        new MockTool('tool1'),
        new MockTool('tool2'),
        new MockTool('tool3'),
      ];

      registry.registerAll(tools);

      expect(registry.count).toBe(3);
      expect(registry.has('tool1')).toBe(true);
      expect(registry.has('tool2')).toBe(true);
      expect(registry.has('tool3')).toBe(true);
    });
  });

  describe('get', () => {
    it('should return tool by name', () => {
      const tool = new MockTool('test_tool');
      registry.register(tool);

      const result = registry.get('test_tool');
      expect(result).toBe(tool);
    });

    it('should return undefined for unknown tool', () => {
      const result = registry.get('unknown_tool');
      expect(result).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('should return all registered tools', () => {
      registry.register(new MockTool('tool1'));
      registry.register(new MockTool('tool2'));

      const tools = registry.getAll();
      expect(tools.length).toBe(2);
    });

    it('should return empty array when no tools registered', () => {
      const tools = registry.getAll();
      expect(tools).toEqual([]);
    });
  });

  describe('getByCategory', () => {
    it('should return tools by category', () => {
      registry.register(new MockTool('balance1', 'balance'));
      registry.register(new MockTool('balance2', 'balance'));
      registry.register(new MockTool('swap1', 'swap'));

      const balanceTools = registry.getByCategory('balance');
      expect(balanceTools.length).toBe(2);

      const swapTools = registry.getByCategory('swap');
      expect(swapTools.length).toBe(1);
    });
  });

  describe('getDefinitions', () => {
    it('should return definitions in OpenAI format', () => {
      registry.register(new MockTool('test_tool'));

      const definitions = registry.getDefinitions();

      expect(definitions.length).toBe(1);
      expect(definitions[0].type).toBe('function');
      expect(definitions[0].function.name).toBe('test_tool');
    });
  });

  describe('execute', () => {
    const mockContext: ToolContext = {
      walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
      chainId: 43114,
      isConnected: true,
    };

    it('should execute tool and return result', async () => {
      registry.register(new MockTool('test_tool'));

      const result = await registry.execute('test_tool', { foo: 'bar' }, mockContext);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ mock: true, params: { foo: 'bar' } });
    });

    it('should return error for unknown tool', async () => {
      const result = await registry.execute('unknown_tool', {}, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown tool: unknown_tool');
      expect(result.errorCode).toBe('UNKNOWN_TOOL');
    });

    it('should handle tool execution errors', async () => {
      registry.register(new ErrorTool());

      const result = await registry.execute('error_tool', {}, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Intentional error');
      expect(result.errorCode).toBe('TOOL_EXECUTION_ERROR');
    });
  });

  describe('getToolNames', () => {
    it('should return list of all tool names', () => {
      registry.register(new MockTool('tool_a'));
      registry.register(new MockTool('tool_b'));
      registry.register(new MockTool('tool_c'));

      const names = registry.getToolNames();

      expect(names).toContain('tool_a');
      expect(names).toContain('tool_b');
      expect(names).toContain('tool_c');
      expect(names.length).toBe(3);
    });
  });
});

describe('createDefaultRegistry', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('should create registry with all default tools', () => {
    const registry = createDefaultRegistry();

    // Should have 9 tools (3 balance + 4 investment + 2 swap)
    expect(registry.count).toBe(9);

    // Balance tools
    expect(registry.has('get_wallet_balance')).toBe(true);
    expect(registry.has('get_investment_data')).toBe(true);
    expect(registry.has('generate_chart')).toBe(true);

    // Investment tools
    expect(registry.has('invest')).toBe(true);
    expect(registry.has('confirm_invest')).toBe(true);
    expect(registry.has('withdraw')).toBe(true);
    expect(registry.has('confirm_withdraw')).toBe(true);

    // Swap tools
    expect(registry.has('swap_tokens')).toBe(true);
    expect(registry.has('confirm_swap')).toBe(true);
  });
});

describe('getToolRegistry (singleton)', () => {
  beforeEach(() => {
    resetToolRegistry();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('should return the same instance on multiple calls', () => {
    const instance1 = getToolRegistry();
    const instance2 = getToolRegistry();

    expect(instance1).toBe(instance2);
  });

  it('should create new instance after reset', () => {
    const instance1 = getToolRegistry();
    resetToolRegistry();
    const instance2 = getToolRegistry();

    expect(instance1).not.toBe(instance2);
  });
});
