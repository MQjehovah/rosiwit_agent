import { SkillManager } from "../skills/index.js";

export async function handleSkillsCommand(args: string[]): Promise<void> {
  const skillManager = new SkillManager();
  await skillManager.initialize();

  const command = args[0];

  switch (command) {
    case "list":
      handleList(skillManager, args.slice(1));
      break;
    case "show":
      handleShow(skillManager, args.slice(1));
      break;
    case "create":
      handleCreate(skillManager, args.slice(1));
      break;
    case "update":
      handleUpdate(skillManager, args.slice(1));
      break;
    case "delete":
      handleDelete(skillManager, args.slice(1));
      break;
    case "enable":
      handleToggle(skillManager, args.slice(1), true);
      break;
    case "disable":
      handleToggle(skillManager, args.slice(1), false);
      break;
    case "export":
      handleExport(skillManager, args.slice(1));
      break;
    case "import":
      handleImport(skillManager, args.slice(1));
      break;
    default:
      printHelp();
  }
}

function printHelp(): void {
  console.log(`
Skill 管理命令：

Usage:
  rosiwit_agent skills <command> [options]

Commands:
  list                    列出所有技能
  show <id>               显示技能详情
  create <file.json>      从文件创建技能
  update <id> <file.json> 更新技能
  delete <id>             删除技能
  enable <id>             启用技能
  disable <id>            禁用技能
  export <id> [file.json]  导出技能到文件
  import <file.json>      从文件导入技能

Options:
  --enabled               只显示启用的技能
  --name <pattern>        按名称筛选

Examples:
  rosiwit_agent skills list
  rosiwit_agent skills list --enabled
  rosiwit_agent skills show weather_helper
  rosiwit_agent skills enable weather_helper
  rosiwit_agent skills create new_skill.json
  rosiwit_agent skills export weather_helper my_skill.json
`);
}

function handleList(skillManager: SkillManager, args: string[]): void {
  const enabled = args.includes("--enabled");
  const nameIndex = args.indexOf("--name");
  const name = nameIndex !== -1 ? args[nameIndex + 1] : undefined;

  const filter: { enabled?: boolean; name?: string } = {};
  if (enabled !== undefined) filter.enabled = enabled;
  if (name !== undefined) filter.name = name;

  const skills = skillManager.listSkills(
    Object.keys(filter).length > 0 ? filter : undefined
  );

  console.log(`\n找到 ${skills.length} 个技能：\n`);

  skills.forEach((skill) => {
    console.log(`ID: ${skill.id}`);
    console.log(`名称: ${skill.name}`);
    console.log(`描述: ${skill.description}`);
    console.log(`版本: ${skill.version}`);
    console.log(`工具数: ${skill.tools.length}`);
    console.log(`状态: ${skill.config.enabled ? "✓ 启用" : "✗ 禁用"}`);
    console.log(`优先级: ${skill.config.priority || 0}`);
    console.log(`创建时间: ${skill.createdAt}`);
    console.log("");
  });
}

function handleShow(skillManager: SkillManager, args: string[]): void {
  if (args.length === 0) {
    console.error("错误：请指定技能 ID");
    return;
  }

  const identifier = args[0];
  const skill = skillManager.getSkillByIdOrName(identifier);

  if (!skill) {
    console.error(`错误：找不到技能 "${identifier}"`);
    return;
  }

  console.log(`\n技能详情：`);
  console.log(`ID: ${skill.id}`);
  console.log(`名称: ${skill.name}`);
  console.log(`描述: ${skill.description}`);
  console.log(`版本: ${skill.version}`);
  console.log(`状态: ${skill.config.enabled ? "✓ 启用" : "✗ 禁用"}`);
  console.log(`优先级: ${skill.config.priority || 0}`);
  console.log(`创建时间: ${skill.createdAt}`);
  console.log(`更新时间: ${skill.updatedAt}`);

  console.log(`\n工具列表：`);
  skill.tools.forEach((tool, index) => {
    console.log(`  [${index + 1}] ${tool.name}`);
    if (tool.description) {
      console.log(`      描述: ${tool.description}`);
    }
    if (tool.parameters) {
      console.log(`      参数: ${JSON.stringify(tool.parameters, null, 2)}`);
    }
  });

  if (skill.config.metadata) {
    console.log(`\n元数据：`);
    Object.entries(skill.config.metadata).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
  }

  console.log("");
}

async function handleCreate(skillManager: SkillManager, args: string[]): Promise<void> {
  if (args.length === 0) {
    console.error("错误：请指定 JSON 文件路径");
    return;
  }

  const filePath = args[0];
  // TODO: 读取文件并创建技能
  console.log(`从 ${filePath} 创建技能...`);
}

async function handleUpdate(skillManager: SkillManager, args: string[]): Promise<void> {
  if (args.length < 2) {
    console.error("错误：请指定技能 ID 和 JSON 文件路径");
    return;
  }

  const [id, filePath] = args;
  // TODO: 读取文件并更新技能
  console.log(`更新技能 ${id} 从 ${filePath}...`);
}

async function handleDelete(skillManager: SkillManager, args: string[]): Promise<void> {
  if (args.length === 0) {
    console.error("错误：请指定技能 ID");
    return;
  }

  const id = args[0];
  const deleted = await skillManager.deleteSkill(id);

  if (deleted) {
    console.log(`✓ 技能已删除: ${id}`);
  } else {
    console.error(`✗ 删除失败：找不到技能 ${id}`);
  }
}

async function handleToggle(
  skillManager: SkillManager,
  args: string[],
  enabled: boolean,
): Promise<void> {
  if (args.length === 0) {
    console.error("错误：请指定技能 ID");
    return;
  }

  const id = args[0];
  try {
    const skill = await skillManager.toggleSkill(id, enabled);
    console.log(
      `✓ 技能已${enabled ? "启用" : "禁用"}: ${skill.name} (${skill.id})`
    );
  } catch (error) {
    console.error(`✗ 操作失败: ${error}`);
  }
}

async function handleExport(skillManager: SkillManager, args: string[]): Promise<void> {
  if (args.length === 0) {
    console.error("错误：请指定技能 ID");
    return;
  }

  const id = args[0];
  const skill = skillManager.getSkillByIdOrName(id);

  if (!skill) {
    console.error(`✗ 找不到技能: ${id}`);
    return;
  }

  const filePath = args[1] || `${skill.name}.json`;

  // TODO: 导出到文件
  console.log(`导出技能 ${skill.name} 到 ${filePath}...`);
  console.log(JSON.stringify(skill, null, 2));
}

async function handleImport(skillManager: SkillManager, args: string[]): Promise<void> {
  if (args.length === 0) {
    console.error("错误：请指定 JSON 文件路径");
    return;
  }

  const filePath = args[0];
  // TODO: 从文件导入
  console.log(`从 ${filePath} 导入技能...`);
}
