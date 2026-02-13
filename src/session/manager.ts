import { OpenAI } from "openai";

export interface SessionMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string | undefined;
  tool_calls?: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[] | undefined;
  name?: string | undefined;
}

export interface SessionStats {
  messageCount: number;
  totalTokens: number;
  userMessageCount: number;
  assistantMessageCount: number;
  toolMessageCount: number;
  estimatedSize: number; // in bytes
}

export interface SessionManagerOptions {
  maxMessages?: number;
  maxTokens?: number;
  systemMessage?: string;
}

export class SessionManager {
  private messages: SessionMessage[] = [];
  private maxMessages: number;
  private maxTokens: number;
  private messageListeners: ((messages: SessionMessage[]) => void)[] = [];
  private statsListeners: ((stats: SessionStats) => void)[] = [];

  constructor(options: SessionManagerOptions = {}) {
    this.maxMessages = options.maxMessages || 100;
    this.maxTokens = options.maxTokens || 8192;

    // Add system message if provided
    if (options.systemMessage) {
      this.messages.push({
        role: "system",
        content: options.systemMessage,
      });
    }
  }

  /**
   * Add a message to the session
   */
  addMessage(message: SessionMessage): void {
    this.messages.push(message);
    this.checkAndManageContext();
    this.notifyMessageListeners();
    this.notifyStatsListeners();
  }

  /**
   * Add a user message
   */
  addUserMessage(content: string): void {
    this.addMessage({
      role: "user",
      content,
    });
  }

  /**
   * Add an assistant message
   */
  addAssistantMessage(content: string, toolCalls?: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[]): void {
    this.addMessage({
      role: "assistant",
      content,
      tool_calls: toolCalls,
    });
  }

  /**
   * Add a tool response message
   */
  addToolMessage(toolCallId: string, content: string): void {
    this.addMessage({
      role: "tool",
      content,
      tool_call_id: toolCallId,
    });
  }

  /**
   * Get all messages in the session
   */
  getMessages(): SessionMessage[] {
    return [...this.messages];
  }

  /**
   * Get messages formatted for OpenAI API
   */
  getOpenAIMessages(): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    return this.messages.map((msg) => {
      if (msg.role === "tool") {
        return {
          role: msg.role,
          content: msg.content,
          tool_call_id: msg.tool_call_id!,
        } as OpenAI.Chat.Completions.ChatCompletionToolMessageParam;
      }

      if (msg.role === "assistant" && msg.tool_calls) {
        return {
          role: msg.role,
          content: msg.content,
          tool_calls: msg.tool_calls,
        } as OpenAI.Chat.Completions.ChatCompletionAssistantMessageParam;
      }

      return {
        role: msg.role,
        content: msg.content,
      } as OpenAI.Chat.Completions.ChatCompletionMessageParam;
    });
  }

  /**
   * Clear all messages except system message
   */
  clear(): void {
    const systemMessage = this.messages.find((m) => m.role === "system");
    this.messages = systemMessage ? [systemMessage] : [];
    this.notifyMessageListeners();
    this.notifyStatsListeners();
  }

  /**
   * Clear everything including system message
   */
  clearAll(): void {
    this.messages = [];
    this.notifyMessageListeners();
    this.notifyStatsListeners();
  }

  /**
   * Get session statistics
   */
  getStats(): SessionStats {
    const messageCount = this.messages.length;
    const userMessageCount = this.messages.filter((m) => m.role === "user").length;
    const assistantMessageCount = this.messages.filter((m) => m.role === "assistant").length;
    const toolMessageCount = this.messages.filter((m) => m.role === "tool").length;

    // Rough token estimation (4 characters per token on average)
    const totalChars = this.messages.reduce((acc, msg) => acc + msg.content.length, 0);
    const totalTokens = Math.ceil(totalChars / 4);

    // Calculate memory size
    const estimatedSize = JSON.stringify(this.messages).length;

    return {
      messageCount,
      totalTokens,
      userMessageCount,
      assistantMessageCount,
      toolMessageCount,
      estimatedSize,
    };
  }

  /**
   * Check if context limits are exceeded and manage accordingly
   */
  private checkAndManageContext(): void {
    const stats = this.getStats();

    // Check message count limit
    if (stats.messageCount > this.maxMessages) {
      console.log(`[SessionManager] Message count (${stats.messageCount}) exceeds limit (${this.maxMessages}), removing oldest messages...`);
      this.removeOldestMessages(stats.messageCount - this.maxMessages);
    }

    // Check token limit
    if (stats.totalTokens > this.maxTokens) {
      console.log(`[SessionManager] Token count (${stats.totalTokens}) exceeds limit (${this.maxTokens}), compressing context...`);
      this.compressContext();
    }
  }

  /**
   * Remove oldest non-system messages
   */
  private removeOldestMessages(count: number): void {
    // Find indices of non-system messages
    const nonSystemIndices: number[] = [];
    for (let i = 0; i < this.messages.length; i++) {
      const message = this.messages[i];
      if (message && message.role !== "system") {
        nonSystemIndices.push(i);
      }
    }

    // Remove oldest messages (keep at least the last message)
    const toRemove = Math.min(count, nonSystemIndices.length - 1);
    for (let i = 0; i < toRemove; i++) {
      const index = nonSystemIndices[i];
      if (index !== undefined) {
        this.messages.splice(index, 1);
      }
    }
  }

  /**
   * Compress context by summarizing older messages
   */
  private compressContext(): void {
    // For now, just remove oldest messages
    // In a more advanced implementation, this could summarize the conversation
    const stats = this.getStats();
    const targetTokens = Math.floor(this.maxTokens * 0.8); // Target 80% of max
    const tokensToRemove = stats.totalTokens - targetTokens;
    const messagesToRemove = Math.ceil(tokensToRemove / 50); // Rough estimate: 50 tokens per message

    this.removeOldestMessages(messagesToRemove);
    console.log(`[SessionManager] Removed ${messagesToRemove} old messages to reduce token usage`);
  }

  /**
   * Subscribe to message updates
   */
  onMessagesChanged(callback: (messages: SessionMessage[]) => void): () => void {
    this.messageListeners.push(callback);
    return () => {
      const index = this.messageListeners.indexOf(callback);
      if (index > -1) {
        this.messageListeners.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to stats updates
   */
  onStatsChanged(callback: (stats: SessionStats) => void): () => void {
    this.statsListeners.push(callback);
    return () => {
      const index = this.statsListeners.indexOf(callback);
      if (index > -1) {
        this.statsListeners.splice(index, 1);
      }
    };
  }

  private notifyMessageListeners(): void {
    const messages = this.getMessages();
    for (const listener of this.messageListeners) {
      listener(messages);
    }
  }

  private notifyStatsListeners(): void {
    const stats = this.getStats();
    for (const listener of this.statsListeners) {
      listener(stats);
    }
  }

  /**
   * Print current session statistics
   */
  printStats(): void {
    const stats = this.getStats();
    console.log("\n[SessionManager] Current Session Stats:");
    console.log(`  Total Messages: ${stats.messageCount}`);
    console.log(`  User Messages: ${stats.userMessageCount}`);
    console.log(`  Assistant Messages: ${stats.assistantMessageCount}`);
    console.log(`  Tool Messages: ${stats.toolMessageCount}`);
    console.log(`  Estimated Tokens: ${stats.totalTokens}`);
    console.log(`  Memory Size: ${(stats.estimatedSize / 1024).toFixed(2)} KB`);
    console.log();
  }
}
