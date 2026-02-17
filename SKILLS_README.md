# Skill 管理功能

## 功能概述

Skill 管理模块提供了一个灵活的系统来创建、管理和执行 AI 技能。

## 数据结构

### Skill

```typescript
interface Skill {
  id: string;              // 唯一标识符
  name: string;            // 技能名称
  description: string;     // 技能描述
  version: string;         // 版本号
  tools: SkillTool[];     // 包含的工具列表
  config: SkillConfig;     // 配置
  createdAt: string;        // 创建时间
  updatedAt: string;       // 更新时间
}
```

### SkillTool

```typescript
interface SkillTool {
  name: string;                    // 工具名称
  description?: string;           // 工具描述
  parameters?: Record<string, any>; // 工具参数
}
```

### SkillConfig

```typescript
interface SkillConfig {
  enabled: boolean;               // 是否启用
  priority?: number;              // 优先级
  metadata?: Record<string, string>; // 元数据
}
```

## 使用示例

### 1. 创建技能管理器

```typescript
import { SkillManager } from './skills/index.js';

// 创建技能管理器（默认使用 skills.json 作为存储）
const skillManager = new SkillManager();

// 或者指定自定义存储路径
const skillManager = new SkillManager('./custom/skills.json');

// 初始化（从存储加载技能）
await skillManager.initialize();
```

### 2. 创建技能

```typescript
const newSkill = await skillManager.createSkill({
  name: "weather_helper",
  description: "帮助用户查询天气信息",
  version: "1.0.0",
  tools: [
    {
      name: "get_weather",
      description: "获取指定城市的天气",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string", description: "城市名称" },
        },
        required: ["city"],
      },
    },
  ],
  config: {
    enabled: true,
    priority: 1,
  },
});
```

### 3. 获取技能

```typescript
// 按 ID 获取
const skill = skillManager.getSkill("skill-id-here");

// 按 ID 或名称获取
const skill = skillManager.getSkillByIdOrName("weather_helper");
```

### 4. 列出技能

```typescript
// 列出所有技能
const allSkills = skillManager.listSkills();

// 筛选启用的技能
const enabledSkills = skillManager.listSkills({ enabled: true });

// 按名称搜索
const filteredSkills = skillManager.listSkills({ name: "weather" });
```

### 5. 更新技能

```typescript
const updatedSkill = await skillManager.updateSkill("skill-id-here", {
  description: "更新后的描述",
  version: "1.1.0",
});
```

### 6. 删除技能

```typescript
const deleted = await skillManager.deleteSkill("skill-id-here");
if (deleted) {
  console.log("技能已删除");
}
```

### 7. 启用/禁用技能

```typescript
// 启用技能
await skillManager.toggleSkill("skill-id-here", true);

// 禁用技能
await skillManager.toggleSkill("skill-id-here", false);
```

### 8. 导出/导入技能

```typescript
// 导出单个技能
const skill = skillManager.exportSkill("skill-id-here");

// 导出所有技能
const allSkills = skillManager.exportAllSkills();

// 导入技能
await skillManager.importSkill(skill);
```

### 9. 集成到 OpenAI

```typescript
// 获取所有启用的技能作为 OpenAI 工具
const openaiTools = skillManager.getOpenAITools();

// 在 OpenAI 聊天中使用
const response = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [{ role: "user", content: "今天北京天气怎么样？" }],
  tools: openaiTools,
});
```

## 存储格式

技能存储在 JSON 文件中（默认 `skills.json`），格式如下：

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "weather_helper",
    "description": "帮助用户查询天气信息",
    "version": "1.0.0",
    "tools": [
      {
        "name": "get_weather",
        "description": "获取指定城市的天气",
        "parameters": {
          "type": "object",
          "properties": {
            "city": { "type": "string", "description": "城市名称" }
          },
          "required": ["city"]
        }
      }
    ],
    "config": {
      "enabled": true,
      "priority": 1
    },
    "createdAt": "2024-02-18T00:00:00.000Z",
    "updatedAt": "2024-02-18T00:00:00.000Z"
  }
]
```

## CLI 工具（待实现）

计划添加以下 CLI 命令：

```bash
# 列出所有技能
rosiwit_agent skills list

# 查看技能详情
rosiwit_agent skills show <skill-id>

# 创建技能
rosiwit_agent skills create <skill.json>

# 更新技能
rosiwit_agent skills update <skill-id> <skill.json>

# 删除技能
rosiwit_agent skills delete <skill-id>

# 启用/禁用技能
rosiwit_agent skills enable <skill-id>
rosiwit_agent skills disable <skill-id>

# 导出技能
rosiwit_agent skills export <skill-id>

# 导入技能
rosiwit_agent skills import <skill.json>
```

## 后续改进

1. **技能模板系统**：提供常用技能的模板
2. **技能依赖管理**：支持技能之间的依赖关系
3. **技能版本控制**：支持技能的版本历史
4. **技能市场**：支持从远程仓库下载和分享技能
5. **技能测试框架**：提供技能的测试和验证工具
