/**
 * Skill 数据结构定义
 */

export interface SkillTool {
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
}

export interface SkillConfig {
  enabled: boolean;
  priority?: number;
  metadata?: Record<string, string>;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  version: string;
  tools: SkillTool[];
  config: SkillConfig;
  createdAt: string;
  updatedAt: string;
}

export interface SkillCreateInput {
  name: string;
  description: string;
  version?: string;
  tools: SkillTool[];
  config?: Partial<SkillConfig>;
}

export interface SkillUpdateInput {
  name?: string;
  description?: string;
  version?: string;
  tools?: SkillTool[];
  config?: Partial<SkillConfig>;
}

export interface SkillFilter {
  enabled?: boolean;
  name?: string;
}
