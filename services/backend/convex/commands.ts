import { v } from 'convex/values';
import { api, internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { internalAction } from './_generated/server';
import type { ActionCtx } from './_generated/server';

// Enhanced getDeepSeekResponse with direct file support
export const getDeepSeekResponse = internalAction({
  args: {
    prompt: v.string(),
    chatId: v.id('chats'),
    userId: v.id('users'),
    // Add direct file support
    attachedFiles: v.optional(
      v.array(
        v.object({
          id: v.string(),
          name: v.string(),
          language: v.string(),
          content: v.string(),
          metadata: v.object({
            size: v.number(),
            lines: v.number(),
            estimatedTokens: v.number(),
            fileType: v.string(),
            uploadedAt: v.optional(v.number()),
          }),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    try {
      // First verify the user is still a member of the chat
      const membership = await ctx.runQuery(internal.chat.verifyMembership, {
        chatId: args.chatId,
        userId: args.userId,
      });

      if (!membership) {
        await ctx.runMutation(internal.chat.sendSystemMessage, {
          chatId: args.chatId,
          content: 'Could not process DeepSeek request: User no longer has access to this chat.',
        });
        return;
      }

      // Get context messages based on chat settings
      const contextData = await ctx.runQuery(api.context.getContextMessages, {
        chatId: args.chatId,
        maxMessages: 50,
        includeFiles: true,
        maxFileSize: 15000,
      });

      // Calculate tokens for attached files
      let attachedFilesTokens = 0;
      if (args.attachedFiles && args.attachedFiles.length > 0) {
        for (const file of args.attachedFiles) {
          attachedFilesTokens += estimateTokenCount(file.content);
          // Add some overhead for file formatting
          attachedFilesTokens += estimateTokenCount(
            `--- File: ${file.name} ---\n--- End of ${file.name} ---`
          );
        }
      }

      // Estimate tokens including context and attached files
      const promptTokens = estimateTokenCount(args.prompt);
      const contextTokens = contextData.tokenEstimate;
      const totalEstimatedTokens = promptTokens + contextTokens + attachedFilesTokens + 1000; // Add buffer for response

      // Check token limits
      let tokenCheck = await ctx.runQuery(internal.tokens.checkTokenLimit, {
        userId: args.userId,
        estimatedTokens: totalEstimatedTokens,
      });

      // If token tracking not initialized, initialize it
      if (tokenCheck.reason === 'Token tracking not initialized') {
        await ctx.runMutation(api.tokens.initializeUserTokens, {
          userId: args.userId,
        });

        tokenCheck = await ctx.runQuery(internal.tokens.checkTokenLimit, {
          userId: args.userId,
          estimatedTokens: totalEstimatedTokens,
        });
      }

      if (!tokenCheck.hasTokens) {
        const message = `You've reached your monthly token limit (${tokenCheck.monthlyUsed}/${tokenCheck.monthlyLimit} tokens used). This request would use approximately ${totalEstimatedTokens} tokens. Please purchase additional tokens to continue using AI features.`;

        await ctx.runMutation(internal.chat.sendSystemMessage, {
          chatId: args.chatId,
          content: message,
        });
        return;
      }

      // Build the messages array for the API
      const messages = [];

      // Add summary context if available
      if (contextData.summary) {
        messages.push({
          role: 'system',
          content: `Previous conversation summary: ${contextData.summary}`,
        });
      }

      // Add context messages with file handling
      for (const msg of contextData.messages) {
        const role = msg.type === 'chatbot' ? 'assistant' : 'user';
        let content = msg.content;

        // For user messages, include the sender's name for multi-user context
        // FIX: Use userInfo.name instead of sender.name
        if (role === 'user' && msg.userInfo?.name) {
          content = `${msg.userInfo.name}: ${content}`;
        }

        // Process files if they exist in this message
        if (msg.files && msg.files.length > 0) {
          const fileContents = msg.files
            .map((file) => {
              let fileDescription = `\n\n--- File: ${file.name}`;
              if (file.language && file.language !== 'text') {
                fileDescription += ` (${file.language})`;
              }
              fileDescription += ' ---\n';

              // FIX: Use metadata.size instead of originalSize and truncated
              // Check if file was truncated by comparing content length to metadata size
              const wasTruncated = file.content.length < file.metadata.size;
              if (wasTruncated) {
                fileDescription += `Note: This file was truncated from ${file.metadata.size} to ${file.content.length} characters to fit within context limits.\n\n`;
              }

              fileDescription += file.content;
              fileDescription += `\n--- End of ${file.name} ---`;

              return fileDescription;
            })
            .join('\n\n');

          content += fileContents;
        }

        messages.push({ role, content });
      }

      // Prepare the current prompt with attached files
      let currentPromptContent = args.prompt;

      // Add attached files directly to the current prompt
      if (args.attachedFiles && args.attachedFiles.length > 0) {
        const attachedFileContents = args.attachedFiles
          .map((file) => {
            let fileDescription = `\n\n--- Attached File: ${file.name}`;
            if (file.language && file.language !== 'text') {
              fileDescription += ` (${file.language})`;
            }
            fileDescription += ' ---\n';

            fileDescription += file.content;
            fileDescription += `\n--- End of ${file.name} ---`;

            return fileDescription;
          })
          .join('\n\n');

        currentPromptContent += attachedFileContents;
      }

      // Add the current prompt (with attached files)
      messages.push({ role: 'user', content: currentPromptContent });

      // Make the DeepSeek API request
      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: messages,
          max_tokens: 4000,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`DeepSeek API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Extract token usage from response
      const usage = data.usage;
      const inputTokens = usage?.prompt_tokens || 0;
      const outputTokens = usage?.completion_tokens || 0;
      const totalTokens = usage?.total_tokens || inputTokens + outputTokens;

      // Record token usage
      const usageResult = await ctx.runMutation(internal.tokens.recordTokenUsage, {
        userId: args.userId,
        chatId: args.chatId,
        command: 'deepseek',
        tokensUsed: totalTokens,
        inputTokens,
        outputTokens,
      });

      // Extract the AI response
      const aiResponse = data.choices?.[0]?.message?.content || 'No response generated';

      // Send the response to chat
      await ctx.runMutation(internal.messages.sendChatbotMessage, {
        chatId: args.chatId,
        content: aiResponse,
      });

      // Send enhanced context and token usage info
      await sendContextUsageInfo(ctx, args.chatId, {
        totalTokens,
        contextTokens,
        promptTokens,
        contextMessages: contextData.messages.length,
        hasSummary: !!contextData.summary,
        remainingTokens: usageResult.remainingTokens,
        fileCount: contextData.fileCount + (args.attachedFiles?.length || 0),
        filesTokens: contextData.filesTokenEstimate + attachedFilesTokens,
        attachedFileCount: args.attachedFiles?.length || 0,
      });

      // Warning for low tokens
      if (usageResult.remainingTokens < 1000 && usageResult.remainingTokens > 0) {
        await ctx.runMutation(internal.chat.sendSystemMessage, {
          chatId: args.chatId,
          content: `⚠️ Token Warning: You have ${usageResult.remainingTokens} tokens remaining this month. Consider purchasing additional tokens to avoid service interruption.`,
        });
      }
    } catch (error) {
      console.error('Failed to get DeepSeek response:', error);

      await ctx.runMutation(internal.chat.sendSystemMessage, {
        chatId: args.chatId,
        content: `Failed to get DeepSeek AI response: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  },
});
function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

// Enhanced helper function with attached file info
async function sendContextUsageInfo(
  ctx: ActionCtx,
  chatId: Id<'chats'>,
  usage: {
    totalTokens: number;
    contextTokens: number;
    promptTokens: number;
    contextMessages: number;
    hasSummary: boolean;
    remainingTokens: number;
    fileCount?: number;
    filesTokens?: number;
    attachedFileCount?: number;
  }
) {
  const contextInfo =
    usage.contextMessages > 0
      ? ` (${usage.contextMessages} context messages${usage.hasSummary ? ' + summary' : ''})`
      : '';

  const fileInfo =
    usage.fileCount && usage.fileCount > 0
      ? ` including ${usage.fileCount} files (${usage.filesTokens || 0} tokens)`
      : '';

  const attachedInfo =
    usage.attachedFileCount && usage.attachedFileCount > 0
      ? ` with ${usage.attachedFileCount} attached files`
      : '';

  const usageMessage = `📊 Token Usage: ${usage.totalTokens} total tokens (${usage.contextTokens} context + ${usage.promptTokens} prompt)${contextInfo}${fileInfo}${attachedInfo}. ${usage.remainingTokens} remaining this month.`;

  await ctx.runMutation(internal.chat.sendSystemMessage, {
    chatId,
    content: usageMessage,
  });
}
// Enhanced helper function to send detailed usage information
export const getWikipediaSummary = internalAction({
  args: {
    topic: v.string(),
    chatId: v.id('chats'),
    userId: v.id('users'), // Track who initiated the command
  },
  handler: async (ctx, args) => {
    try {
      // First verify the user is still a member of the chat
      const membership = await ctx.runQuery(internal.chat.verifyMembership, {
        chatId: args.chatId,
        userId: args.userId,
      });

      if (!membership) {
        await ctx.runMutation(internal.chat.sendSystemMessage, {
          chatId: args.chatId,
          content: 'Could not fetch Wikipedia summary: User no longer has access to this chat.',
        });
        return;
      }

      // Fetch Wikipedia summary
      const response = await fetch(
        `https://en.wikipedia.org/w/api.php?${new URLSearchParams({
          format: 'json',
          action: 'query',
          prop: 'extracts',
          exintro: '1',
          explaintext: '1',
          redirects: '1',
          titles: args.topic,
        })}`
      );

      if (!response.ok) {
        throw new Error(`Wikipedia API request failed: ${response.status}`);
      }

      const data = await response.json();
      const summary = getSummaryFromJSON(data);

      // Post the summary back to the chat
      await ctx.runMutation(internal.chat.sendSystemMessage, {
        chatId: args.chatId,
        content: `Wikipedia summary for "${args.topic}":\n\n${summary || 'No summary found'}`,
      });
    } catch (error) {
      console.error('Failed to get Wikipedia summary:', error);
      await ctx.runMutation(internal.chat.sendSystemMessage, {
        chatId: args.chatId,
        content: `Failed to get Wikipedia summary for "${args.topic}"`,
      });
    }
  },
});

interface WikipediaResponse {
  query: {
    pages: {
      [key: string]: {
        extract?: string;
      };
    };
  };
}

function getSummaryFromJSON(data: WikipediaResponse): string {
  try {
    const pages = data.query.pages;
    const firstPageId = Object.keys(pages)[0];

    // Handle missing page (pageId -1 means not found)
    if (firstPageId === '-1') {
      return 'No information found on this topic.';
    }

    const extract = pages[firstPageId].extract;
    if (!extract) return 'No summary available.';

    // Truncate very long summaries to avoid hitting message length limits
    return extract.length > 2000 ? `${extract.substring(0, 2000)}... [truncated]` : extract;
  } catch (error) {
    console.error('Failed to parse Wikipedia response:', error);
    return 'Could not parse Wikipedia response.';
  }
}
