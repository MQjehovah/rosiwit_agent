import OpenAI from "openai";
import { MCPManager } from "./mcp/manager.js";

let openai: OpenAI | null = null;
let mcpManager: MCPManager | null = null;

function getOpenAIInstance(): OpenAI {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY || "ollama";
    const baseURL = process.env.OPENAI_BASE_URL || "http://192.168.31.55:11434/v1";

    if (!apiKey) {
      throw new Error("错误：缺少 OPENAI_API_KEY 环境变量。请在 .env 文件中设置或导出该变量。");
    }

    openai = new OpenAI({
      apiKey,
      baseURL,
    });
  }
  return openai;
}

async function main() {
  try {
    // 初始化 MCP Manager
    mcpManager = new MCPManager();
    await mcpManager.initialize();

    // 获取 MCP 工具
    const mcpTools = mcpManager.getOpenAIFunctions();
    console.log(`\n[MCP] 已加载 ${mcpTools.length} 个 MCP 工具`);
    
    // 本地硬编码工具（作为示例）
    const localTools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
      {
        type: "function",
        function: {
          name: "get_current_weather",
          description: "Get the current weather in a given location",
          parameters: {
            type: "object",
            properties: {
              location: {
                type: "string",
                description: "The city and state, e.g. San Francisco, CA",
              },
            },
            required: ["location"]
          },
        },
      },
    ];

    // 合并所有工具
    const allTools = [...localTools, ...mcpTools];
    console.log(`[MCP] 总工具数: ${allTools.length}\n`);

    // 显示可用的 MCP 工具
    if (mcpTools.length > 0) {
      console.log("可用的 MCP 工具:");
      mcpTools.forEach(tool => {
        const funcTool = tool as unknown as { function: { name: string; description?: string } };
        console.log(`  - ${funcTool.function.name}: ${funcTool.function.description}`);
      });
      console.log();
    }

    // 创建聊天完成请求
    const requestParams: OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming = {
      model: "glm-4.7-flash",
      messages: [
        {role: "user", content: "今天北京天气怎么样"},
      ],
      stream: true,
    };
    
    if (allTools.length > 0) {
      requestParams.tools = allTools;
    }
    
    const response = await getOpenAIInstance().chat.completions.create(requestParams);

    const toolCallsBuffer: Map<number, OpenAI.Chat.Completions.ChatCompletionChunk.Choice.Delta.ToolCall> = new Map();

    for await (const chunk of response) {
      const content = chunk.choices[0]?.delta?.content || "";
      
      if (content) {
        process.stdout.write(content);
      }

      // 收集工具调用
      const toolCalls = chunk.choices[0]?.delta?.tool_calls;
      if (toolCalls) {
        for (const toolCall of toolCalls) {
          if (toolCall.index !== undefined) {
            const existing = toolCallsBuffer.get(toolCall.index);
            if (existing) {
              // 追加数据
              if (toolCall.id) existing.id = toolCall.id;
              if (toolCall.type) existing.type = toolCall.type;
              if (toolCall.function) {
                if (!existing.function) existing.function = { name: "", arguments: "" };
                if (toolCall.function.name) existing.function.name = toolCall.function.name;
                if (toolCall.function.arguments) existing.function.arguments += toolCall.function.arguments;
              }
            } else {
              toolCallsBuffer.set(toolCall.index, { ...toolCall });
            }
          }
        }
      }
    }

    console.log("\n");

    // 处理工具调用
    if (toolCallsBuffer.size > 0) {
      console.log("\n[工具调用] 检测到工具调用请求:\n");
      
      // 转换工具调用格式
      const toolCallsToExecute: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[] = [];
      for (const [index, toolCall] of toolCallsBuffer.entries()) {
        if (toolCall.function?.name) {
          console.log(`  [${index}] ${toolCall.function.name}`);
          console.log(`      参数: ${toolCall.function.arguments}`);
          
          toolCallsToExecute.push({
            id: toolCall.id || `call_${index}`,
            type: "function",
            function: {
              name: toolCall.function.name,
              arguments: toolCall.function.arguments
            }
          } as OpenAI.Chat.Completions.ChatCompletionMessageToolCall);
        }
      }

      // 执行工具调用
      if (mcpManager && toolCallsToExecute.length > 0) {
        console.log("\n[工具调用] 正在执行...\n");
        const results = await mcpManager.executeToolCalls(toolCallsToExecute);
        
        console.log("[工具调用结果]:\n");
        for (const result of results) {
          console.log(`  工具: ${result.name}`);
          console.log(`  结果:`, JSON.stringify(result.result, null, 2));
          if (result.error) {
            console.log(`  错误: ${result.error}`);
          }
          console.log();
        }
      }
    }

  } catch (error) {
    if (error instanceof Error) {
      console.error("运行出错：", error.message);
    } else {
      console.error("未知错误：", error);
    }
    process.exit(1);
  } finally {
    // 关闭 MCP Manager
    if (mcpManager) {
      await mcpManager.shutdown();
    }
  }
}

main().catch((err) => {
  console.error({err}, "启动失败");
  process.exit(1);
});
