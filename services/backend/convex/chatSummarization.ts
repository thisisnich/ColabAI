// convex/chatSummarization.ts
// Enhanced chat summarization functionality with automatic context management

import { SessionIdArg } from 'convex-helpers/server/sessions';
import { v } from 'convex/values';
import { internal } from './_generated/api';
import { api } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from './_generated/server';

// Type definitions for better type safety
type MessageWithSender = Doc<'messages'> & {
  sender: {
    name: string;
    id: Id<'users'>;
  };
};

type SummarizationResult = {
  summaryId: Id<'contextSummaries'>;
  summary: string;
  tokensUsed: number;
  messageCount: number;
};

type ContextResult = {
  messages: MessageWithSender[];
  summary: string | null;
  tokenEstimate: number;
  needsSummarization: boolean;
  totalMessageCount?: number;
};

type SummaryStats = {
  totalSummaries: number;
  totalTokensUsed: number;
  totalMessagesSummarized: number;
  latestSummaryDate: number | null;
};

// Helper function to estimate token count (rough approximation)
function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

// Helper function to get authenticated user
async function getAuthUser(ctx: any, sessionId: string) {
  const existingSession = await ctx.db
    .query('sessions')
    .withIndex('by_sessionId', (q: { eq: (arg0: string, arg1: string) => any }) =>
      q.eq('sessionId', sessionId)
    )
    .first();

  if (!existingSession || !existingSession.userId) {
    return null;
  }

  return await ctx.db.get(existingSession.userId);
}

// Helper function to get a single message (internal only)
export const getMessage = internalQuery({
  args: { messageId: v.id('messages') },
  handler: async (ctx, args): Promise<Doc<'messages'> | null> => {
    return await ctx.db.get(args.messageId);
  },
});

// Helper function to get latest summary (internal only)
export const getLatestSummary = query({
  args: { chatId: v.id('chats') },
  handler: async (ctx, args): Promise<Doc<'contextSummaries'> | null> => {
    return await ctx.db
      .query('contextSummaries')
      .withIndex('by_chat_version', (q) => q.eq('chatId', args.chatId))
      .order('desc')
      .first();
  },
});

// Helper function to store summary (internal only)
export const storeSummary = internalMutation({
  args: {
    chatId: v.id('chats'),
    summary: v.string(),
    messageCount: v.number(),
    lastMessageId: v.id('messages'),
    tokensUsed: v.number(),
    version: v.number(),
  },
  handler: async (ctx, args): Promise<Id<'contextSummaries'>> => {
    const now = Date.now();
    return await ctx.db.insert('contextSummaries', {
      chatId: args.chatId,
      summary: args.summary,
      messageCount: args.messageCount,
      lastMessageId: args.lastMessageId,
      tokensUsed: args.tokensUsed,
      createdAt: now,
      version: args.version,
    });
  },
});

// Enhanced generateContextSummary - now actually generates summaries
export const generateContextSummary = internalAction({
  args: {
    chatId: v.id('chats'),
    messagesToSummarize: v.array(v.id('messages')),
    userId: v.id('users'), // User who triggered the summarization
  },
  handler: async (ctx, args): Promise<SummarizationResult> => {
    try {
      // Get the messages to summarize
      const messages = await Promise.all(
        args.messagesToSummarize.map(async (msgId) => {
          const msg = await ctx.runQuery(internal.chatSummarization.getMessage, {
            messageId: msgId,
          });
          if (!msg) return null;

          const user = await ctx.runQuery(internal.auth.getUserById, { userId: msg.userId });
          return {
            ...msg,
            sender: user ? { name: user.name, id: user._id } : { name: 'Unknown', id: msg.userId },
          };
        })
      );

      const validMessages = messages.filter((msg): msg is NonNullable<typeof msg> => msg !== null);

      if (validMessages.length === 0) {
        throw new Error('No valid messages to summarize');
      }

      // Build conversation text for summarization
      const conversationText = validMessages
        .map((msg) => {
          const timestamp = new Date(msg.timestamp).toLocaleString();
          const sender = msg.type === 'chatbot' ? 'AI Assistant' : msg.sender.name;
          return `[${timestamp}] ${sender}: ${msg.content}`;
        })
        .join('\n\n');

      // Create summarization prompt
      const summaryPrompt = `Please create a concise but comprehensive summary of the following conversation. Focus on:
- Key topics discussed and decisions made
- Important information shared
- Context that would be helpful for future AI responses
- Main themes and outcomes

Keep the summary under 500 words but ensure it captures the essential context.

Conversation to summarize:
${conversationText}`;

      // Estimate tokens for the summarization request
      const promptTokens = estimateTokenCount(summaryPrompt);
      const estimatedResponseTokens = 300; // Summary should be ~500 words max
      const totalEstimatedTokens = promptTokens + estimatedResponseTokens;

      // Check token limits
      const tokenCheck = await ctx.runQuery(internal.tokens.checkTokenLimit, {
        userId: args.userId,
        estimatedTokens: totalEstimatedTokens,
      });

      if (!tokenCheck.hasTokens) {
        throw new Error('Insufficient tokens for summarization');
      }

      // Make the DeepSeek API request for summarization
      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content:
                'You are a helpful assistant that creates concise, informative summaries of conversations. Focus on preserving context and key information.',
            },
            {
              role: 'user',
              content: summaryPrompt,
            },
          ],
          max_tokens: 800,
          temperature: 0.3, // Lower temperature for more consistent summaries
        }),
      });

      if (!response.ok) {
        throw new Error(`DeepSeek API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const summary = data.choices?.[0]?.message?.content || 'Failed to generate summary';

      // Extract token usage
      const usage = data.usage;
      const inputTokens = usage?.prompt_tokens || 0;
      const outputTokens = usage?.completion_tokens || 0;
      const totalTokens = usage?.total_tokens || inputTokens + outputTokens;

      // Record token usage
      await ctx.runMutation(internal.tokens.recordTokenUsage, {
        userId: args.userId,
        chatId: args.chatId,
        command: 'summarization',
        tokensUsed: totalTokens,
        inputTokens,
        outputTokens,
      });

      // Get the latest version number for this chat
      const existingSummary = await ctx.runQuery(api.chatSummarization.getLatestSummary, {
        chatId: args.chatId,
      });
      const newVersion = (existingSummary?.version || 0) + 1;

      // Store the summary
      const summaryId = await ctx.runMutation(internal.chatSummarization.storeSummary, {
        chatId: args.chatId,
        summary,
        messageCount: validMessages.length,
        lastMessageId: args.messagesToSummarize[args.messagesToSummarize.length - 1],
        tokensUsed: totalTokens,
        version: newVersion,
      });

      return {
        summaryId,
        summary,
        tokensUsed: totalTokens,
        messageCount: validMessages.length,
      };
    } catch (error) {
      console.error('Failed to generate summary:', error);
      throw new Error(
        `Summarization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  },
});

// Enhanced getContextMessages with automatic summarization
export const getContextMessages = query({
  args: {
    chatId: v.id('chats'),
    maxMessages: v.optional(v.number()),
    ...SessionIdArg,
  },
  handler: async (ctx, args): Promise<ContextResult> => {
    const user = await getAuthUser(ctx, args.sessionId);
    if (!user) {
      throw new Error('Authentication required');
    }

    // Get context settings
    const settings = await ctx.db
      .query('chatContextSettings')
      .withIndex('by_chat', (q) => q.eq('chatId', args.chatId))
      .unique();

    const contextMode = settings?.contextMode || 'deepseek_only';
    const useSummaryContext = settings?.useSummaryContext || false;

    if (contextMode === 'none') {
      return {
        messages: [],
        summary: null,
        tokenEstimate: 0,
        needsSummarization: false,
      };
    }

    const maxMessages = args.maxMessages || 50;

    // Get messages based on context mode
    let messages: Doc<'messages'>[];
    if (contextMode === 'deepseek_only') {
      messages = await ctx.db
        .query('messages')
        .withIndex('by_chat_time', (q) => q.eq('chatId', args.chatId))
        .order('desc')
        .filter((q) =>
          q.or(q.eq(q.field('isDeepSeekCommand'), true), q.eq(q.field('type'), 'chatbot'))
        )
        .take(maxMessages);
    } else {
      messages = await ctx.db
        .query('messages')
        .withIndex('by_chat_time', (q) => q.eq('chatId', args.chatId))
        .order('desc')
        .take(maxMessages);
    }

    messages.reverse(); // Chronological order
    // Get user information for messages
    const messagesWithUsers: MessageWithSender[] = await Promise.all(
      messages.map(async (msg) => {
        const user = await ctx.db.get(msg.userId);
        return {
          ...msg,
          sender: user ? { name: user.name, id: user._id } : { name: 'Unknown', id: msg.userId },
        };
      })
    );

    let summary: string | null = null;
    let effectiveMessages = messagesWithUsers;
    let needsSummarization = false;

    // Handle summarization logic
    if (useSummaryContext && messages.length > 20) {
      // Get the latest summary
      const existingSummary = await ctx.db
        .query('contextSummaries')
        .withIndex('by_chat_version', (q) => q.eq('chatId', args.chatId))
        .order('desc')
        .first();

      if (existingSummary) {
        // Check if we have new messages since the last summary
        const newMessagesCount = messagesWithUsers.filter(
          (msg) => msg._creationTime > existingSummary.createdAt
        ).length;

        if (newMessagesCount > 10) {
          // We have enough new messages to warrant a new summary
          needsSummarization = true;
        }

        summary = existingSummary.summary;
        // Return recent messages (after the summarized ones) + summary
        effectiveMessages = messagesWithUsers.filter(
          (msg) => msg._creationTime > existingSummary.createdAt
        );

        // Ensure we have at least some recent messages
        if (effectiveMessages.length < 5) {
          effectiveMessages = messagesWithUsers.slice(-10);
        }
      } else {
        // No existing summary, but we have enough messages to create one
        needsSummarization = true;
        // For now, return the most recent messages
        effectiveMessages = messagesWithUsers.slice(-15);
      }
    }

    // Estimate token usage
    const tokenEstimate =
      effectiveMessages.reduce((total, msg) => {
        return total + Math.ceil(msg.content.length / 4);
      }, 0) + (summary ? Math.ceil(summary.length / 4) : 0);

    return {
      messages: effectiveMessages,
      summary,
      tokenEstimate,
      needsSummarization,
      totalMessageCount: messagesWithUsers.length,
    };
  },
});

// Function to trigger summarization (call this from your UI or automatically)
export const triggerSummarization = internalMutation({
  args: {
    chatId: v.id('chats'),
    userId: v.id('users'),
  },
  handler: async (ctx, args): Promise<{ messageCount: number }> => {
    // Get messages that need to be summarized
    const settings = await ctx.db
      .query('chatContextSettings')
      .withIndex('by_chat', (q) => q.eq('chatId', args.chatId))
      .unique();

    if (!settings?.useSummaryContext) {
      throw new Error('Summary context is not enabled for this chat');
    }

    // Get the latest summary to know where to start
    const existingSummary = await ctx.db
      .query('contextSummaries')
      .withIndex('by_chat_version', (q) => q.eq('chatId', args.chatId))
      .order('desc')
      .first();

    // Get messages to summarize (older messages that aren't already summarized)
    let messagesToSummarize: Id<'messages'>[];
    if (existingSummary) {
      // Get messages between the last summary and recent messages
      const allMessages = await ctx.db
        .query('messages')
        .withIndex('by_chat_time', (q) => q.eq('chatId', args.chatId))
        .order('asc')
        .collect();

      const lastSummaryIndex = allMessages.findIndex(
        (msg) => msg._id === existingSummary.lastMessageId
      );

      if (lastSummaryIndex === -1) {
        throw new Error('Could not find last summarized message');
      }

      // Take messages after the last summary, but leave recent ones unsummarized
      messagesToSummarize = allMessages
        .slice(lastSummaryIndex + 1, -10) // Leave last 10 messages unsummarized
        .map((msg) => msg._id);
    } else {
      // No existing summary - summarize older messages, keep recent ones
      const allMessages = await ctx.db
        .query('messages')
        .withIndex('by_chat_time', (q) => q.eq('chatId', args.chatId))
        .order('asc')
        .collect();

      if (allMessages.length <= 20) {
        throw new Error('Not enough messages to warrant summarization');
      }

      // Summarize all but the last 15 messages
      messagesToSummarize = allMessages.slice(0, -15).map((msg) => msg._id);
    }

    if (messagesToSummarize.length === 0) {
      throw new Error('No messages to summarize');
    }

    // Schedule the summarization
    await ctx.scheduler.runAfter(0, internal.chatSummarization.generateContextSummary, {
      chatId: args.chatId,
      messagesToSummarize,
      userId: args.userId,
    });

    return { messageCount: messagesToSummarize.length };
  },
});

// Public function to manually trigger summarization
export const requestSummarization = mutation({
  args: {
    chatId: v.id('chats'),
    ...SessionIdArg,
  },
  handler: async (ctx, args): Promise<{ messageCount: number }> => {
    const user = await getAuthUser(ctx, args.sessionId);
    if (!user) {
      throw new Error('Authentication required');
    }

    // Verify user has access to the chat
    const membership = await ctx.db
      .query('chatMemberships')
      .withIndex('by_chat_user', (q) => q.eq('chatId', args.chatId).eq('userId', user._id))
      .unique();

    if (!membership) {
      throw new Error('Access denied');
    }

    return await ctx.runMutation(internal.chatSummarization.triggerSummarization, {
      chatId: args.chatId,
      userId: user._id,
    });
  },
});

// Function to get all summaries for a chat (useful for debugging or chat history)
export const getChatSummaries = query({
  args: {
    chatId: v.id('chats'),
    ...SessionIdArg,
  },
  handler: async (ctx, args): Promise<Doc<'contextSummaries'>[]> => {
    const user = await getAuthUser(ctx, args.sessionId);
    if (!user) {
      throw new Error('Authentication required');
    }

    // Verify user has access to the chat
    const membership = await ctx.db
      .query('chatMemberships')
      .withIndex('by_chat_user', (q) => q.eq('chatId', args.chatId).eq('userId', user._id))
      .unique();

    if (!membership) {
      throw new Error('Access denied');
    }

    return await ctx.db
      .query('contextSummaries')
      .withIndex('by_chat_version', (q) => q.eq('chatId', args.chatId))
      .order('desc')
      .collect();
  },
});

// Function to delete old summaries (keep only the latest N versions)
export const cleanupOldSummaries = mutation({
  args: {
    chatId: v.id('chats'),
    keepVersions: v.optional(v.number()), // Default to keep 5 versions
    ...SessionIdArg,
  },
  handler: async (ctx, args): Promise<{ deleted: number; kept: number }> => {
    const user = await getAuthUser(ctx, args.sessionId);
    if (!user) {
      throw new Error('Authentication required');
    }

    // Verify user has access to the chat
    const membership = await ctx.db
      .query('chatMemberships')
      .withIndex('by_chat_user', (q) => q.eq('chatId', args.chatId).eq('userId', user._id))
      .unique();

    if (!membership) {
      throw new Error('Access denied');
    }

    const keepVersions = args.keepVersions || 5;

    const summaries = await ctx.db
      .query('contextSummaries')
      .withIndex('by_chat_version', (q) => q.eq('chatId', args.chatId))
      .order('desc')
      .collect();

    if (summaries.length <= keepVersions) {
      return { deleted: 0, kept: summaries.length };
    }

    const summariesToDelete = summaries.slice(keepVersions);

    await Promise.all(summariesToDelete.map((summary) => ctx.db.delete(summary._id)));

    return {
      deleted: summariesToDelete.length,
      kept: keepVersions,
    };
  },
});

// Function to get summary statistics for a chat
export const getSummaryStats = query({
  args: {
    chatId: v.id('chats'),
    ...SessionIdArg,
  },
  handler: async (ctx, args): Promise<SummaryStats> => {
    const user = await getAuthUser(ctx, args.sessionId);
    if (!user) {
      throw new Error('Authentication required');
    }

    // Verify user has access to the chat
    const membership = await ctx.db
      .query('chatMemberships')
      .withIndex('by_chat_user', (q) => q.eq('chatId', args.chatId).eq('userId', user._id))
      .unique();

    if (!membership) {
      throw new Error('Access denied');
    }

    const summaries = await ctx.db
      .query('contextSummaries')
      .withIndex('by_chat_version', (q) => q.eq('chatId', args.chatId))
      .collect();

    if (summaries.length === 0) {
      return {
        totalSummaries: 0,
        totalTokensUsed: 0,
        totalMessagesSummarized: 0,
        latestSummaryDate: null,
      };
    }

    const totalTokensUsed = summaries.reduce((sum, s) => sum + s.tokensUsed, 0);
    const totalMessagesSummarized = summaries.reduce((sum, s) => sum + s.messageCount, 0);
    const latestSummary = summaries.sort((a, b) => b.createdAt - a.createdAt)[0];

    return {
      totalSummaries: summaries.length,
      totalTokensUsed,
      totalMessagesSummarized,
      latestSummaryDate: latestSummary.createdAt,
    };
  },
});
