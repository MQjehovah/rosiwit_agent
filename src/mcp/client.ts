import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import type { MCPServerConfig, MCPClientWrapper, MCPTool, ToolCallResult } from "./types.js";
import type { OpenAI } from "openai";

export class MCPClient {
  private clients: Map<string, MCPClientWrapper> = new Map();

  // 连接到单个 MCP Server
  async connect(name: string, config: MCPServerConfig): Promise<MCPClientWrapper> {
    console.log(`[MCP] 正在连接到 server: ${name} (${config.transport})`);
    
    try {
      let transport: StdioClientTransport | SSEClientTransport;
      
      if (config.transport === "stdio") {
        // stdio 传输
        transport = new StdioClientTransport({
          command: config.command,
          args: config.args || [],
          env: config.env as Record<string, string> || {}
        });
      } else {
        // SSE 传输
        const url = new URL(config.url);
        const eventSourceInit: EventSourceInit & { headers?: Record<string, string> } = {
          headers: config.headers || {}
        };
        transport = new SSEClientTransport(url, {
          eventSourceInit: eventSourceInit as EventSourceInit
        });
      }

      const client = new Client(
        {
          name: "rosiwit-agent",
          version: "1.0.0"
        },
        {
          capabilities: {}
        }
      );

      // 连接
      await client.connect(transport);
      
      // 获取可用工具列表
      const toolsResponse = await client.listTools();
      const tools = toolsResponse.tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema as unknown
      }));

      console.log(`[MCP] Server '${name}' 连接成功，发现 ${tools.length} 个工具`);
      if (tools.length > 0) {
        console.log(`[MCP] 工具列表: ${tools.map(t => t.name).join(", ")}`);
      }

      const wrapper: MCPClientWrapper = {
        name,
        client,
        transport,
        tools,
        connected: true
      };

      this.clients.set(name, wrapper);
      return wrapper;

    } catch (error) {
      console.error(`[MCP] 连接 server '${name}' 失败:`, error);
      throw error;
    }
  }

  // 断开单个连接
  async disconnect(name: string): Promise<void> {
    const wrapper = this.clients.get(name);
    if (wrapper) {
      try {
        await wrapper.client.close();
        wrapper.connected = false;
        this.clients.delete(name);
        console.log(`[MCP] Server '${name}' 已断开`);
      } catch (error) {
        console.error(`[MCP] 断开 server '${name}' 失败:`, error);
      }
    }
  }

  // 断开所有连接
  async disconnectAll(): Promise<void> {
    console.log("[MCP] 正在断开所有连接...");
    for (const name of this.clients.keys()) {
      await this.disconnect(name);
    }
  }

  // 获取所有可用工具
  getAllTools(): MCPTool[] {
    const allTools: MCPTool[] = [];
    for (const wrapper of this.clients.values()) {
      if (wrapper.connected) {
        allTools.push(...wrapper.tools);
      }
    }
    return allTools;
  }

  // 获取所有工具转换为 OpenAI Function 格式
  getOpenAIFunctions(): OpenAI.Chat.Completions.ChatCompletionTool[] {
    const tools = this.getAllTools();
    
    return tools.map(tool => {
      const parameters = tool.inputSchema || { type: "object", properties: {} };
      return {
        type: "function" as const,
        function: {
          name: tool.name,
          description: tool.description || `Execute ${tool.name}`,
          parameters: parameters as OpenAI.FunctionParameters
        }
      };
    });
  }

  // 执行工具调用
  async executeTool(name: string, args: unknown): Promise<ToolCallResult> {
    // 找到拥有该工具的客户端
    let targetWrapper: MCPClientWrapper | undefined;
    
    for (const wrapper of this.clients.values()) {
      if (wrapper.connected && wrapper.tools.some(t => t.name === name)) {
        targetWrapper = wrapper;
        break;
      }
    }

    if (!targetWrapper) {
      return {
        toolCallId: "",
        name,
        arguments: args,
        result: null,
        error: `Tool '${name}' not found in any connected MCP server`
      };
    }

    try {
      console.log(`[MCP] 执行工具: ${name}`, JSON.stringify(args));
      const result = await targetWrapper.client.callTool({
        name,
        arguments: args as Record<string, unknown>
      });

      return {
        toolCallId: "",
        name,
        arguments: args,
        result: result.content
      };
    } catch (error) {
      console.error(`[MCP] 工具执行失败: ${name}`, error);
      return {
        toolCallId: "",
        name,
        arguments: args,
        result: null,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // 批量执行工具调用
  async executeToolCalls(toolCalls: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[]): Promise<ToolCallResult[]> {
    const results: ToolCallResult[] = [];
    
    for (const toolCall of toolCalls) {
      // 使用类型断言来处理 function 属性
      const functionCall = (toolCall as unknown as { function: { name: string; arguments: string }; id: string }).function;
      const args = JSON.parse(functionCall.arguments);
      const result = await this.executeTool(functionCall.name, args);
      result.toolCallId = toolCall.id;
      results.push(result);
    }
    
    return results;
  }

  // 获取连接状态
  getConnectionStatus(): Array<{ name: string; connected: boolean; tools: number }> {
    return Array.from(this.clients.values()).map(wrapper => ({
      name: wrapper.name,
      connected: wrapper.connected,
      tools: wrapper.tools.length
    }));
  }
}
