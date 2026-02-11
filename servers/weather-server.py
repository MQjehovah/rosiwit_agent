#!/usr/bin/env python3
"""
示例 MCP Server - 天气查询

这是一个简单的示例 MCP Server，演示如何实现一个 stdio 传输的 MCP Server。
要运行此示例，需要安装 mcp Python SDK:
    pip install mcp

然后在 mcp.json 中配置:
{
  "servers": {
    "weather": {
      "transport": "stdio",
      "command": "python",
      "args": ["./servers/weather-server.py"]
    }
  }
}
"""

import json
import sys
from typing import Any

# 简单的 MCP Server 实现（实际使用请安装 mcp SDK）
class SimpleMCPServer:
    def __init__(self, name: str):
        self.name = name
        self.tools = {}
    
    def tool(self, name: str = None, description: str = None):
        def decorator(func):
            tool_name = name or func.__name__
            tool_desc = description or func.__doc__ or f"Execute {tool_name}"
            self.tools[tool_name] = {
                "name": tool_name,
                "description": tool_desc,
                "handler": func
            }
            return func
        return decorator
    
    def handle_initialize(self, params: dict) -> dict:
        return {
            "protocolVersion": "2024-11-05",
            "capabilities": {
                "tools": {}
            },
            "serverInfo": {
                "name": self.name,
                "version": "1.0.0"
            }
        }
    
    def handle_tools_list(self, params: dict) -> dict:
        tools = []
        for tool in self.tools.values():
            tools.append({
                "name": tool["name"],
                "description": tool["description"],
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "location": {
                            "type": "string",
                            "description": "城市名称"
                        }
                    },
                    "required": ["location"]
                }
            })
        return {"tools": tools}
    
    def handle_tools_call(self, params: dict) -> dict:
        tool_name = params.get("name")
        arguments = params.get("arguments", {})
        
        if tool_name not in self.tools:
            return {
                "content": [{"type": "text", "text": json.dumps({"error": f"Tool '{tool_name}' not found"})}],
                "isError": True
            }
        
        try:
            result = self.tools[tool_name]["handler"](**arguments)
            return {
                "content": [{"type": "text", "text": json.dumps(result)}],
                "isError": False
            }
        except Exception as e:
            return {
                "content": [{"type": "text", "text": json.dumps({"error": str(e)})}],
                "isError": True
            }
    
    def run(self):
        while True:
            try:
                line = sys.stdin.readline()
                if not line:
                    break
                
                message = json.loads(line)
                method = message.get("method")
                params = message.get("params", {})
                request_id = message.get("id")
                
                if method == "initialize":
                    result = self.handle_initialize(params)
                elif method == "tools/list":
                    result = self.handle_tools_list(params)
                elif method == "tools/call":
                    result = self.handle_tools_call(params)
                else:
                    result = {"error": f"Unknown method: {method}"}
                
                if request_id is not None:
                    response = {
                        "jsonrpc": "2.0",
                        "id": request_id,
                        "result": result
                    }
                    print(json.dumps(response), flush=True)
                    
            except json.JSONDecodeError:
                continue
            except Exception as e:
                print(json.dumps({"error": str(e)}), flush=True)

# 创建 Server 实例
server = SimpleMCPServer("weather-server")

@server.tool(name="get_weather", description="Get current weather for a location")
def get_weather(location: str) -> dict:
    """
    模拟天气查询
    """
    # 这里应该是真实的天气 API 调用
    weather_data = {
        "北京": {"temperature": 25, "condition": "晴朗", "humidity": 45},
        "上海": {"temperature": 28, "condition": "多云", "humidity": 60},
        "广州": {"temperature": 32, "condition": "小雨", "humidity": 75},
    }
    
    data = weather_data.get(location, {"temperature": 22, "condition": "晴朗", "humidity": 50})
    return {
        "location": location,
        **data,
        "unit": "celsius"
    }

@server.tool(name="get_forecast", description="Get weather forecast for a location")
def get_forecast(location: str, days: int = 3) -> dict:
    """
    模拟天气预报
    """
    return {
        "location": location,
        "forecast": [
            {"day": i+1, "temperature": 20 + i*2, "condition": "晴朗" if i % 2 == 0 else "多云"}
            for i in range(days)
        ]
    }

if __name__ == "__main__":
    server.run()
