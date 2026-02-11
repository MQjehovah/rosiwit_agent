import OpenAI from "openai";

let openai: OpenAI | null = null;

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
    const response = await getOpenAIInstance().chat.completions.create({
      model: "glm-4.7-flash",
      messages: [
        // {role: "system", content: "你是一个有帮助的助手。"},
        {role: "user", content: "今天北京天气怎么样"},
      ],
      stream: true,
      tools: [
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
            },
          },
        },
      ],
    });
    for await (const chunk of response) {
      //   const reasoning = chunk.choices[0]?.delta?.reasoning_content || "";
      const content = chunk.choices[0]?.delta?.content || "";
      //   if (reasoning) console.log("[推理过程]:", reasoning);
      if (content) {
        // console.log(content); //此处改为不换行输出，保持流式输出的效果
        process.stdout.write(content);
      }

      // 工具调用
      if (chunk.choices[0]?.delta?.tool_calls) {
        for (const toolCall of chunk.choices[0].delta.tool_calls) {
          console.log("[工具调用]:", toolCall.id, toolCall.type);
          if (toolCall.function) {
            console.log("[工具调用参数]:", toolCall.function.name, toolCall.function.arguments);
          }
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
  }
}

main().catch((err) => {
  console.error({err}, "启动失败");
  process.exit(1);
});
