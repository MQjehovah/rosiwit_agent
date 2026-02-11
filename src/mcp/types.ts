// MCP 类型定义
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { OpenAI } from "openai";

// MCP Server 传输类型
export type TransportType = "stdio" | "sse";

// stdio 传输配置
export interface StdioTransportConfig {
  transport: "stdio";
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

// SSE 传输配置
export interface SSETransportConfig {
  transport: "sse";
  url: string;
  headers?: Record<string, string>;
}

// MCP Server 配置
export type MCPServerConfig = StdioTransportConfig | SSETransportConfig;

// MCP 全局配置
export interface MCPConfig {
  version: string;
  servers: Record<string, MCPServerConfig & { disabled?: boolean }>;
}

// MCP 工具定义
export interface MCPTool {
  name: string;
  description: string | undefined;
  inputSchema: unknown;
}

// MCP 客户端包装器
export interface MCPClientWrapper {
  name: string;
  client: Client;
  transport: StdioClientTransport | SSEClientTransport;
  tools: MCPTool[];
  connected: boolean;
}

// 工具调用结果
export interface ToolCallResult {
  toolCallId: string;
  name: string;
  arguments: unknown;
  result: unknown;
  error?: string;
}

// OpenAI Function 定义（来自 MCP Tool）
export type OpenAIFunction = OpenAI.Chat.Completions.ChatCompletionTool;

// 配置路径
export const MCP_CONFIG_DIR = process.platform === "win32" 
  ? `${process.env.USERPROFILE}\\.rosiwit` 
  : `${process.env.HOME}/.rosiwit`;
export const MCP_CONFIG_PATH = `${MCP_CONFIG_DIR}/mcp.json`;
