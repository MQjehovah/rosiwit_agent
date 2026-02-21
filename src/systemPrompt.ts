import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 加载系统提示词文件
 * @param soulPath SOUL.md 文件路径
 * @param rulePath RULE.md 文件路径
 * @param context 额外上下文信息
 * @returns 组合后的系统提示词
 */
export function loadSystemPrompt(
  soulPath: string = path.join(__dirname, "../../SOUL.md"),
  rulePath: string = path.join(__dirname, "../../RULE.md"),
  context?: string
): string {
  const parts: string[] = [];

  // 加载 SOUL.md（灵魂定义）
  if (fs.existsSync(soulPath)) {
    const soulContent = fs.readFileSync(soulPath, "utf-8");
    parts.push("## 🦋 智能体灵魂 (SOUL)\n\n" + soulContent);
  }

  // 加载 RULE.md（规则定义）
  if (fs.existsSync(rulePath)) {
    const ruleContent = fs.readFileSync(rulePath, "utf-8");
    parts.push("## 📋 智能体规则 (RULES)\n\n" + ruleContent);
  }

  // 添加额外上下文
  if (context) {
    parts.push("## 📌 当前任务\n\n" + context);
  }

  // 组合系统提示词
  return parts.join("\n\n---\n\n");
}

/**
 * 快速构建系统提示词
 * @param taskDescription 当前任务描述
 * @returns 系统提示词
 */
export function buildSystemPrompt(taskDescription?: string): string {
  return loadSystemPrompt(undefined, undefined, taskDescription);
}

export default { loadSystemPrompt, buildSystemPrompt };
