import { SessionIdArg } from 'convex-helpers/server/sessions';
import { v } from 'convex/values';
import { ConvexError } from 'convex/values';
import { getAuthUser } from '../modules/auth/getAuthUser';
import { api, internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import { mutation, query } from './_generated/server';
import { internalMutation, internalQuery } from './_generated/server';

export const getContextSettings = query({
  args: {
    chatId: v.id('chats'),
    ...SessionIdArg,
  },
  handler: async (ctx, args) => {
    // Get user from session
    const session = await ctx.db
      .query('sessions')
      .withIndex('by_sessionId', (q) => q.eq('sessionId', args.sessionId))
      .first();

    if (!session?.userId) {
      throw new Error('Invalid session');
    }

    // Verify user has access to this chat
    const membership = await ctx.db
      .query('chatMemberships')
      .withIndex('by_chat_user', (q) => q.eq('chatId', args.chatId).eq('userId', session.userId))
      .unique();

    if (!membership) {
      throw new Error('You do not have access to this chat');
    }

    // Get context settings, with defaults if not found
    const settings = await ctx.db
      .query('chatContextSettings')
      .withIndex('by_chat', (q) => q.eq('chatId', args.chatId))
      .unique();

    if (!settings) {
      // Return default settings
      return {
        contextMode: 'deepseek_only' as const,
        useSummaryContext: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    }

    return settings;
  },
});

// Update context settings for a chat
export const updateContextSettings = mutation({
  args: {
    chatId: v.id('chats'),
    contextMode: v.union(v.literal('none'), v.literal('deepseek_only'), v.literal('all_messages')),
    useSummaryContext: v.boolean(),
    ...SessionIdArg,
  },
  handler: async (ctx, args) => {
    // Get user from session
    const session = await ctx.db
      .query('sessions')
      .withIndex('by_sessionId', (q) => q.eq('sessionId', args.sessionId))
      .first();

    if (!session?.userId) {
      throw new Error('Invalid session');
    }

    // Verify user has access to this chat
    const membership = await ctx.db
      .query('chatMemberships')
      .withIndex('by_chat_user', (q) => q.eq('chatId', args.chatId).eq('userId', session.userId))
      .unique();

    if (!membership) {
      throw new Error('You do not have access to this chat');
    }

    // For now, allow any member to change settings. You can restrict this to admins/creators if needed
    // const userRole = await getCurrentUserRole(ctx, args.chatId, args.sessionId);
    // if (!userRole?.canManageSettings) {
    //   throw new Error('You do not have permission to change chat settings');
    // }

    const now = Date.now();

    // Check if settings already exist
    const existing = await ctx.db
      .query('chatContextSettings')
      .withIndex('by_chat', (q) => q.eq('chatId', args.chatId))
      .unique();

    if (existing) {
      // Update existing settings
      await ctx.db.patch(existing._id, {
        contextMode: args.contextMode,
        useSummaryContext: args.useSummaryContext,
        updatedAt: now,
      });
      return existing._id;
      // biome-ignore lint/style/noUselessElse: <explanation>
    } else {
      // Create new settings
      return await ctx.db.insert('chatContextSettings', {
        chatId: args.chatId,
        contextMode: args.contextMode,
        useSummaryContext: args.useSummaryContext,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

// Get context messages for AI commands (internal function)
export const getContextMessages = query({
  args: {
    chatId: v.id('chats'),
    maxMessages: v.optional(v.number()), // Limit number of messages to prevent token overuse
  },
  handler: async (ctx, args) => {
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
      };
    }

    const maxMessages = args.maxMessages || 50; // Default limit to prevent excessive token usage

    // biome-ignore lint/suspicious/noImplicitAnyLet: <explanation>
    let messages;

    if (contextMode === 'deepseek_only') {
      // Get only messages that start with /deepseek or are chatbot responses
      messages = await ctx.db
        .query('messages')
        .withIndex('by_chat_time', (q) => q.eq('chatId', args.chatId))
        .order('desc')
        .filter((q) =>
          q.or(q.eq(q.field('isDeepSeekCommand'), true), q.eq(q.field('type'), 'chatbot'))
        )
        .take(maxMessages);
    } else {
      // Get all messages
      messages = await ctx.db
        .query('messages')
        .withIndex('by_chat_time', (q) => q.eq('chatId', args.chatId))
        .order('desc')
        .take(maxMessages);
    }

    // Reverse to get chronological order
    messages.reverse();

    // Get user information for messages
    const messagesWithUsers = await Promise.all(
      messages.map(async (msg) => {
        const user = await ctx.db.get(msg.userId);
        return {
          ...msg,
          sender: user ? { name: user.name, id: user._id } : { name: 'Unknown', id: msg.userId },
        };
      })
    );

    let summary = null;
    let effectiveMessages = messagesWithUsers;

    // If using summary context and we have many messages, summarize older ones
    if (useSummaryContext && messages.length > 20) {
      // Get existing summary
      const existingSummary = await ctx.db
        .query('contextSummaries')
        .withIndex('by_chat_version', (q) => q.eq('chatId', args.chatId))
        .order('desc')
        .first();

      // For now, just use the existing summary if available
      // In a full implementation, you'd check if new messages need to be summarized
      if (existingSummary) {
        summary = existingSummary.summary;
        // Return only recent messages + summary
        effectiveMessages = messagesWithUsers.slice(-10); // Last 10 messages
      }
    }

    // Estimate token usage (rough calculation)
    const tokenEstimate =
      effectiveMessages.reduce((total, msg) => {
        return total + Math.ceil(msg.content.length / 4);
      }, 0) + (summary ? Math.ceil(summary.length / 4) : 0);

    return {
      messages: effectiveMessages,
      summary,
      tokenEstimate,
      needsSummarization: messages.length > 20, // Example condition
      totalMessageCount: messages.length,
    };
  },
});

// Generate context summary (internal function for future use)
export const generateContextSummary = internalMutation({
  args: {
    chatId: v.id('chats'),
    messagesToSummarize: v.array(v.id('messages')),
    summaryPrompt: v.string(),
  },
  handler: async (ctx, args) => {
    // This would use the DeepSeek API to generate a summary
    // For now, just store the request - implementation would be similar to getDeepSeekResponse

    // Store the summary request for processing
    const now = Date.now();

    return await ctx.db.insert('contextSummaries', {
      chatId: args.chatId,
      summary: 'Summary generation in progress...', // Placeholder
      messageCount: args.messagesToSummarize.length,
      lastMessageId: args.messagesToSummarize[args.messagesToSummarize.length - 1],
      tokensUsed: 0, // Will be updated when summary is generated
      createdAt: now,
      version: 1,
    });
  },
});
