import { readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import type { MCPConfig } from "./types.js";
import { MCP_CONFIG_DIR, MCP_CONFIG_PATH } from "./types.js";

// 默认配置
const DEFAULT_CONFIG: MCPConfig = {
  version: "1.0",
  servers: {}
};

// 获取配置目录
export function getConfigDir(): string {
  return MCP_CONFIG_DIR;
}

// 获取配置文件路径
export function getConfigPath(): string {
  return MCP_CONFIG_PATH;
}

// 确保配置目录存在
export function ensureConfigDir(): void {
  if (!existsSync(MCP_CONFIG_DIR)) {
    mkdirSync(MCP_CONFIG_DIR, { recursive: true });
  }
}

// 初始化默认配置文件
export function initDefaultConfig(): MCPConfig {
  ensureConfigDir();
  if (!existsSync(MCP_CONFIG_PATH)) {
    writeFileSync(MCP_CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2), "utf-8");
    console.log(`[MCP] 已创建默认配置文件: ${MCP_CONFIG_PATH}`);
  }
  return DEFAULT_CONFIG;
}

// 加载配置
export function loadConfig(): MCPConfig {
  ensureConfigDir();
  
  if (!existsSync(MCP_CONFIG_PATH)) {
    console.log(`[MCP] 配置文件不存在，创建默认配置: ${MCP_CONFIG_PATH}`);
    return initDefaultConfig();
  }

  try {
    const content = readFileSync(MCP_CONFIG_PATH, "utf-8");
    const config = JSON.parse(content) as MCPConfig;
    
    // 验证配置结构
    if (!config.servers || typeof config.servers !== "object") {
      console.warn("[MCP] 配置文件中 servers 字段无效，使用空对象");
      config.servers = {};
    }
    
    return config;
  } catch (error) {
    console.error(`[MCP] 配置文件解析错误: ${error}`);
    console.log("[MCP] 使用默认配置");
    return DEFAULT_CONFIG;
  }
}

// 获取启用的服务器配置
export function getEnabledServers(config: MCPConfig): Record<string, MCPConfig["servers"][string]> {
  const enabled: Record<string, MCPConfig["servers"][string]> = {};
  
  for (const [name, serverConfig] of Object.entries(config.servers)) {
    if (!serverConfig.disabled) {
      enabled[name] = serverConfig;
    }
  }
  
  return enabled;
}
