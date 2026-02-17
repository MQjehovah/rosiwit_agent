import { promises as fs } from "fs";
import path from "path";
import type {
  Skill,
  SkillCreateInput,
  SkillUpdateInput,
  SkillFilter,
} from "./types.js";

/**
 * 简单的 UUID v4 生成器
 */
function uuidv4(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Skill 管理器
 * 负责技能的 CRUD 操作和持久化存储
 */
export class SkillManager {
  private skills: Map<string, Skill> = new Map();
  private storagePath: string;

  constructor(storagePath?: string) {
    this.storagePath =
      storagePath || path.join(process.cwd(), "skills.json");
  }

  /**
   * 初始化：从存储加载技能
   */
  async initialize(): Promise<void> {
    try {
      const data = await fs.readFile(this.storagePath, "utf-8");
      const skills: Skill[] = JSON.parse(data);
      skills.forEach((skill) => {
        this.skills.set(skill.id, skill);
      });
      console.log(`[SkillManager] 加载了 ${skills.length} 个技能`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        console.log("[SkillManager] 技能存储文件不存在，将创建新文件");
        await this.save();
      } else {
        console.error("[SkillManager] 加载技能失败:", error);
        throw error;
      }
    }
  }

  /**
   * 创建新技能
   */
  async createSkill(input: SkillCreateInput): Promise<Skill> {
    const id = uuidv4();
    const now = new Date().toISOString();

    const skill: Skill = {
      id,
      name: input.name,
      description: input.description,
      version: input.version || "1.0.0",
      tools: input.tools,
      config: {
        enabled: true,
        priority: 0,
        ...input.config,
      },
      createdAt: now,
      updatedAt: now,
    };

    this.skills.set(id, skill);
    await this.save();

    console.log(`[SkillManager] 创建技能: ${skill.name} (${id})`);
    return skill;
  }

  /**
   * 获取技能
   */
  getSkill(id: string): Skill | undefined {
    return this.skills.get(id);
  }

  /**
   * 根据 ID 或名称获取技能
   */
  getSkillByIdOrName(identifier: string): Skill | undefined {
    const skill = this.skills.get(identifier);
    if (skill) {
      return skill;
    }

    // 尝试按名称查找
    for (const s of this.skills.values()) {
      if (s.name === identifier) {
        return s;
      }
    }

    return undefined;
  }

  /**
   * 列出所有技能
   */
  listSkills(filter?: SkillFilter): Skill[] {
    let skills = Array.from(this.skills.values());

    if (filter) {
      if (filter.enabled !== undefined) {
        skills = skills.filter((s) => s.config.enabled === filter.enabled);
      }
      if (filter.name) {
        skills = skills.filter((s) =>
          s.name.toLowerCase().includes(filter.name!.toLowerCase()),
        );
      }
    }

    return skills;
  }

  /**
   * 更新技能
   */
  async updateSkill(id: string, input: SkillUpdateInput): Promise<Skill> {
    const skill = this.skills.get(id);
    if (!skill) {
      throw new Error(`技能不存在: ${id}`);
    }

    const updatedSkill: Skill = {
      ...skill,
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.version !== undefined && { version: input.version }),
      ...(input.tools !== undefined && { tools: input.tools }),
      ...(input.config !== undefined && {
        config: { ...skill.config, ...input.config },
      }),
      updatedAt: new Date().toISOString(),
    };

    this.skills.set(id, updatedSkill);
    await this.save();

    console.log(`[SkillManager] 更新技能: ${skill.name} (${id})`);
    return updatedSkill;
  }

  /**
   * 删除技能
   */
  async deleteSkill(id: string): Promise<boolean> {
    const skill = this.skills.get(id);
    if (!skill) {
      return false;
    }

    this.skills.delete(id);
    await this.save();

    console.log(`[SkillManager] 删除技能: ${skill.name} (${id})`);
    return true;
  }

  /**
   * 启用/禁用技能
   */
  async toggleSkill(id: string, enabled: boolean): Promise<Skill> {
    const skill = this.skills.get(id);
    if (!skill) {
      throw new Error(`技能不存在: ${id}`);
    }

    skill.config.enabled = enabled;
    skill.updatedAt = new Date().toISOString();

    this.skills.set(id, skill);
    await this.save();

    console.log(
      `[SkillManager] ${enabled ? "启用" : "禁用"}技能: ${skill.name} (${id})`,
    );
    return skill;
  }

  /**
   * 导出技能
   */
  exportSkill(id: string): Skill | undefined {
    return this.skills.get(id);
  }

  /**
   * 导出所有技能
   */
  exportAllSkills(): Skill[] {
    return Array.from(this.skills.values());
  }

  /**
   * 导入技能
   */
  async importSkill(skill: Skill): Promise<Skill> {
    const existing = this.skills.get(skill.id);
    if (existing) {
      throw new Error(`技能已存在: ${skill.id}`);
    }

    this.skills.set(skill.id, skill);
    await this.save();

    console.log(`[SkillManager] 导入技能: ${skill.name} (${skill.id})`);
    return skill;
  }

  /**
   * 保存技能到存储
   */
  private async save(): Promise<void> {
    const skills = Array.from(this.skills.values());
    await fs.writeFile(
      this.storagePath,
      JSON.stringify(skills, null, 2),
      "utf-8",
    );
  }

  /**
   * 获取启用的技能
   */
  getEnabledSkills(): Skill[] {
    return this.listSkills({ enabled: true });
  }

  /**
   * 将技能转换为 OpenAI 工具格式
   */
  skillToOpenAITool(skill: Skill): {
    type: "function";
    function: {
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    };
  } {
    return {
      type: "function",
      function: {
        name: skill.name,
        description: skill.description,
        parameters: {
          type: "object",
          properties: skill.tools.reduce((acc, tool) => {
            acc[tool.name] = tool.parameters || { type: "string" };
            return acc;
          }, {} as Record<string, unknown>),
        },
      },
    };
  }

  /**
   * 获取所有启用的技能作为 OpenAI 工具列表
   */
  getOpenAITools(): {
    type: "function";
    function: {
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    };
  }[] {
    return this.getEnabledSkills().map((skill) =>
      this.skillToOpenAITool(skill),
    );
  }
}
