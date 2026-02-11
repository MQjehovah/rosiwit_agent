import { MCPClient } from "./client.js";
import type { MCPServerConfig, MCPTool, ToolCallResult } from "./types.js";
import { loadConfig, getEnabledServers } from "./config.js";
import type { OpenAI } from "openai";

// MCP 管理器 - 管理所有 MCP Server 连接
export class MCPManager {
  private client: MCPClient;
  private connected: boolean = false;

  constructor() {
    this.client = new MCPClient();
  }

  // 初始化并连接所有启用的 MCP Servers
  async initialize(): Promise<void> {
    console.log("[MCP Manager] 正在初始化...");
    
    const config = loadConfig();
    const enabledServers = getEnabledServers(config);
    const serverNames = Object.keys(enabledServers);

    if (serverNames.length === 0) {
      console.log("[MCP Manager] 没有启用的 MCP server");
      return;
    }

    console.log(`[MCP Manager] 发现 ${serverNames.length} 个启用的 server: ${serverNames.join(", ")}`);

    // 并行连接所有 server
    const connectPromises = serverNames.map(async (name) => {
      const serverConfig = enabledServers[name]!;
      try {
        await this.client.connect(name, serverConfig as MCPServerConfig);
      } catch (error) {
        console.error(`[MCP Manager] 连接 '${name}' 失败，将继续尝试其他 server`);
      }
    });

    await Promise.all(connectPromises);

    const status = this.client.getConnectionStatus();
    const connectedCount = status.filter(s => s.connected).length;
    console.log(`[MCP Manager] 初始化完成: ${connectedCount}/${serverNames.length} 个 server 连接成功`);
    
    this.connected = connectedCount > 0;
  }

  // 获取所有可用工具
  getAllTools(): MCPTool[] {
    return this.client.getAllTools();
  }

  // 获取 OpenAI Function 格式的工具
  getOpenAIFunctions(): OpenAI.Chat.Completions.ChatCompletionTool[] {
    return this.client.getOpenAIFunctions();
  }

  // 执行单个工具
  async executeTool(name: string, args: unknown): Promise<ToolCallResult> {
    return this.client.executeTool(name, args);
  }

  // 批量执行工具调用
  async executeToolCalls(toolCalls: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[]): Promise<ToolCallResult[]> {
    return this.client.executeToolCalls(toolCalls);
  }

  // 获取连接状态
  getStatus(): Array<{ name: string; connected: boolean; tools: number }> {
    return this.client.getConnectionStatus();
  }

  // 检查是否有活跃连接
  isConnected(): boolean {
    return this.connected;
  }

  // 断开所有连接
  async shutdown(): Promise<void> {
    console.log("[MCP Manager] 正在关闭...");
    await this.client.disconnectAll();
    this.connected = false;
    console.log("[MCP Manager] 已关闭");
  }
}

// 单例实例
let managerInstance: MCPManager | null = null;

export function getMCPManager(): MCPManager {
  if (!managerInstance) {
    managerInstance = new MCPManager();
  }
  return managerInstance;
}
