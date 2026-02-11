#!/usr/bin/env node

import {readFileSync} from "fs";
import {dirname, join} from "path";
import {fileURLToPath} from "url";

// 尝试解决 Windows 中文乱码问题
if (process.platform === "win32") {
  try {
    const {execSync} = await import("child_process");
    // 设置活动代码页为 UTF-8 (65001)
    execSync("chcp 65001", {stdio: "ignore"});
  } catch {
    // 忽略错误，某些环境可能没有权限
  }
}

// ==================== ANSI 颜色代码 ====================
const colors = {
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
} as const;

// 颜色辅助函数
const green = (text: string) => `${colors.green}${text}${colors.reset}`;
const yellow = (text: string) => `${colors.yellow}${text}${colors.reset}`;
const red = (text: string) => `${colors.red}${text}${colors.reset}`;
const cyan = (text: string) => `${colors.cyan}${text}${colors.reset}`;
const bold = (text: string) => `${colors.bold}${text}${colors.reset}`;
const dim = (text: string) => `${colors.dim}${text}${colors.reset}`;

const VERSION = (() => {
  try {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const pkgPath = join(__dirname, "..", "package.json");
    const raw = readFileSync(pkgPath, "utf-8");
    const pkg = JSON.parse(raw) as {version?: string};
    return pkg.version ?? "unknown";
  } catch {
    return "unknown";
  }
})();

// ==================== 帮助信息 ====================
function showHelp(): void {
  console.log(`
${bold("FlashClaw")} ${dim(`v${VERSION}`)} - ⚡ 闪电龙虾 AI 助手

${bold("用法:")}
  flashclaw [命令] [选项]

${bold("命令:")}
  ${cyan("start")}                       启动服务
  ${cyan("plugins list")}                列出已安装插件
  ${cyan("plugins list --available")}    列出可用插件
  ${cyan("plugins install <name>")}      安装插件
  ${cyan("plugins uninstall <name>")}    卸载插件
  ${cyan("plugins update <name>")}       更新插件
  ${cyan("plugins update --all")}        更新所有插件
  ${cyan("init")}                         交互式初始化配置
  ${cyan("init --non-interactive")}      非交互式初始化（需 --api-key）
  ${cyan("doctor")}                      检查运行环境
  ${cyan("security")}                    安全审计
  ${cyan("daemon <action>")}             后台服务管理 (install|uninstall|status|start|stop)
  ${cyan("config list-backups")}         列出配置备份
  ${cyan("config restore [n]")}          恢复配置备份（n=1-5，默认1）
  ${cyan("version")}                     显示版本
  ${cyan("help")}                        显示帮助

${bold("示例:")}
  flashclaw                     启动服务（默认）
  flashclaw init                首次配置
  flashclaw doctor              环境诊断
  flashclaw security            安全审计
  flashclaw daemon install      安装为后台服务（开机自启）
  flashclaw daemon status       查看后台服务状态
  flashclaw start               启动服务
  flashclaw plugins list        查看已安装插件
  flashclaw plugins install feishu  安装飞书插件

${bold("更多信息:")}
  文档: https://github.com/GuLu9527/flashclaw
`);
}

// ==================== 版本信息 ====================
function showVersion(): void {
  console.log(`${bold("FlashClaw")} ${cyan(`v${VERSION}`)}`);
}

function parseArgs(): {command: string; subcommand: string; args: string[]; flags: Record<string, boolean>} {
  const args = process.argv.slice(2);
  const flags: Record<string, boolean> = {};
  const positional: string[] = [];

  for (const arg of args) {
    if (arg.startsWith("--")) {
      flags[arg.slice(2)] = true;
    } else if (arg.startsWith("-")) {
      flags[arg.slice(1)] = true;
    } else {
      positional.push(arg);
    }
  }

  const command = positional[0] || "";
  const subcommand = positional[1] || "";
  const restArgs = positional.slice(2);

  return {command, subcommand, args: restArgs, flags};
}

// ==================== 主入口 ====================
async function main(): Promise<void> {
  const {command, subcommand, args, flags} = parseArgs();

  // 处理 -v / --version
  if (flags["v"] || flags["version"]) {
    showVersion();
    return;
  }

  // 处理 -h / --help
  if (flags["h"] || flags["help"]) {
    showHelp();
    return;
  }

  switch (command) {
    case "start":
      // 默认启动服务
      //   await startService();
      break;

    case "init": {
      //   // 交互式初始化向导
      //   const {initCommand} = await import("./commands/init.js");
      //   // 将 flags 转换为支持字符串值（处理 --api-key=xxx 形式的参数）
      //   const initFlags: Record<string, string | boolean> = {...flags};
      //   // 从原始 argv 中提取 --api-key, --base-url, --model, --bot-name 的值
      //   const rawArgs = process.argv.slice(2);
      //   for (let i = 0; i < rawArgs.length; i++) {
      //     const arg = rawArgs[i];
      //     if (arg.includes("=")) {
      //       const [key, ...rest] = arg.replace(/^--/, "").split("=");
      //       initFlags[key] = rest.join("=");
      //     } else if (arg.startsWith("--") && i + 1 < rawArgs.length && !rawArgs[i + 1].startsWith("-")) {
      //       const key = arg.slice(2);
      //       if (["api-key", "base-url", "model", "bot-name"].includes(key)) {
      //         initFlags[key] = rawArgs[i + 1];
      //       }
      //     }
      //   }
      //   await initCommand(initFlags);
      break;
    }

    case "version":
      showVersion();
      break;

    case "help":
      showHelp();
      break;

    default:
      console.log(red("✗") + ` 未知命令: ${command}`);
      console.log(`\n使用 ${cyan("flashclaw help")} 查看可用命令`);
      process.exit(1);
  }
}

// 运行主函数
main().catch((error) => {
  console.log(red("✗") + ` 发生错误: ${error}`);
  process.exit(1);
});
