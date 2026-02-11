# MCP Client 集成

本项目的 MCP Client 功能允许你连接到外部 MCP (Model Context Protocol) Servers，并将它们的工具集成到 OpenAI 工具调用中。

## 功能特性

- ✅ 支持 stdio 传输（本地命令/脚本）
- ✅ 支持 SSE 传输（HTTP Server-Sent Events）
- ✅ 自动发现 MCP Servers 提供的工具
- ✅ 自动转换工具定义到 OpenAI Function 格式
- ✅ 全局配置文件管理

## 配置文件

配置文件位于用户主目录下的 `~/.rosiwit/mcp.json`：

- **Windows**: `%USERPROFILE%\.rosiwit\mcp.json`
- **macOS/Linux**: `~/.rosiwit/mcp.json`

### 配置示例

```json
{
  "version": "1.0",
  "servers": {
    "weather-server": {
      "transport": "stdio",
      "command": "python",
      "args": ["/path/to/weather-server.py"],
      "env": {
        "API_KEY": "your-api-key"
      }
    },
    "github-server": {
      "transport": "sse",
      "url": "http://localhost:3000/sse",
      "headers": {
        "Authorization": "Bearer token"
      }
    }
  }
}
```

### 配置字段说明

#### 通用字段
- `version`: 配置文件版本（保留字段）
- `servers`: MCP Server 配置对象

#### Server 配置

**stdio 传输：**
```json
{
  "transport": "stdio",
  "command": "可执行命令",
  "args": ["参数1", "参数2"],
  "env": { "环境变量": "值" },
  "disabled": false
}
```

**SSE 传输：**
```json
{
  "transport": "sse",
  "url": "http://localhost:3000/sse",
  "headers": { "Header-Name": "value" },
  "disabled": false
}
```

## 使用方式

### 1. 配置 MCP Server

编辑 `~/.rosiwit/mcp.json` 添加你的 MCP Servers。

### 2. 运行程序

```bash
npm start
```

程序会自动：
1. 加载配置文件
2. 连接所有启用的 MCP Servers
3. 获取并注册所有可用的工具
4. 将这些工具传递给 OpenAI API

### 3. 处理工具调用

当 LLM 决定使用工具时，程序会自动：
1. 识别是哪个 MCP Server 提供该工具
2. 向对应的 Server 发送工具调用请求
3. 将结果返回给 LLM

## 示例 MCP Server

### stdio 示例

创建一个简单的 Python MCP Server：`weather-server.py`

```python
#!/usr/bin/env python3
from mcp.server import Server
from mcp.types import TextContent
import json

app = Server("weather-server")

@app.tool()
async def get_weather(location: str) -> list:
    """Get current weather for a location"""
    return [
        TextContent(
            type="text",
            text=json.dumps({
                "location": location,
                "temperature": 25,
                "condition": "sunny"
            })
        )
    ]

if __name__ == "__main__":
    app.run()
```

### SSE 示例

SSE 传输适用于远程部署的 MCP Servers，通常是 HTTP 服务。

## API 使用

在你的代码中使用 MCP Manager：

```typescript
import { MCPManager } from "./mcp/manager.js";

// 创建 Manager
const mcpManager = new MCPManager();

// 初始化（连接所有配置的 servers）
await mcpManager.initialize();

// 获取所有可用工具
const tools = mcpManager.getOpenAIFunctions();

// 使用 OpenAI API
const response = await openai.chat.completions.create({
  model: "your-model",
  messages: [{ role: "user", content: "..." }],
  tools: tools,
});

// 处理工具调用
if (response.choices[0].message.tool_calls) {
  const results = await mcpManager.executeToolCalls(
    response.choices[0].message.tool_calls
  );
  // 处理结果...
}

// 关闭连接
await mcpManager.shutdown();
```

## 现有 MCP Servers

以下是一些社区维护的 MCP Servers：

- `@modelcontextprotocol/server-filesystem` - 文件系统操作
- `@modelcontextprotocol/server-github` - GitHub API
- `@modelcontextprotocol/server-puppeteer` - 浏览器自动化
- `@modelcontextprotocol/server-fetch` - HTTP 请求

### 使用 npx 运行

```json
{
  "servers": {
    "fetch": {
      "transport": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-fetch"]
    }
  }
}
```

## 调试

程序启动时会输出 MCP 相关的日志信息：

```
[MCP Manager] 正在初始化...
[MCP] 正在连接到 server: weather-server (stdio)
[MCP] Server 'weather-server' 连接成功，发现 2 个工具
n[MCP] 已加载 2 个 MCP 工具
可用的 MCP 工具:
  - get_weather: Get current weather for a location
  - get_forecast: Get weather forecast
```

## 故障排除

### Server 连接失败

1. 检查配置文件路径是否正确
2. 确认 server 命令可执行
3. 查看环境变量是否正确设置

### 工具不生效

1. 确认 MCP Server 正确提供了工具列表
2. 检查 LLM 是否支持工具调用
3. 查看日志确认工具是否被正确加载

## 参考

- [MCP 官方文档](https://modelcontextprotocol.io)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP Servers 列表](https://github.com/modelcontextprotocol/servers)
