import { v } from 'convex/values';
import { api, internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { internalAction } from './_generated/server';
import type { ActionCtx } from './_generated/server';

export const getDeepSeekResponse = internalAction({
  args: {
    prompt: v.string(),
    chatId: v.id('chats'),
    userId: v.id('users'),
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
      const contextData = await ctx.runQuery(api.chat.getContextMessages, {
        chatId: args.chatId,
        maxMessages: 50, // Reasonable limit to prevent excessive token usage
      });

      // Estimate tokens including context
      const promptTokens = estimateTokenCount(args.prompt);
      const contextTokens = contextData.tokenEstimate;
      const totalEstimatedTokens = promptTokens + contextTokens + 1000; // Add buffer for response

      // Check token limits with context included
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

      // Add context messages
      for (const msg of contextData.messages) {
        const role = msg.type === 'chatbot' ? 'assistant' : 'user';
        let content = msg.content;

        // For user messages, include the sender's name for multi-user context
        if (role === 'user' && msg.sender.name) {
          content = `${msg.sender.name}: ${content}`;
        }

        messages.push({ role, content });
      }

      // Add the current prompt
      messages.push({ role: 'user', content: args.prompt });

      // Make the DeepSeek API request with context
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

      // Send context and token usage info
      await sendContextUsageInfo(ctx, args.chatId, {
        totalTokens,
        contextTokens,
        promptTokens,
        contextMessages: contextData.messages.length,
        hasSummary: !!contextData.summary,
        remainingTokens: usageResult.remainingTokens,
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

// Helper function to send detailed usage information
async function sendContextUsageInfo(
  ctx: ActionCtx, // Use Convex's ActionCtx type
  chatId: Id<'chats'>,
  usage: {
    totalTokens: number;
    contextTokens: number;
    promptTokens: number;
    contextMessages: number;
    hasSummary: boolean;
    remainingTokens: number;
  }
) {
  const contextInfo =
    usage.contextMessages > 0
      ? ` (${usage.contextMessages} context messages${usage.hasSummary ? ' + summary' : ''})`
      : '';

  const usageMessage = `📊 Token Usage: ${usage.totalTokens} total tokens (${usage.contextTokens} context + ${usage.promptTokens} prompt)${contextInfo}. ${usage.remainingTokens} remaining this month.`;

  await ctx.runMutation(internal.chat.sendSystemMessage, {
    chatId,
    content: usageMessage,
  });
}
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
