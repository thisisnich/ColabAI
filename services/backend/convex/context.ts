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
// Simplified type definitions based on your schema
type MessageDoc = {
  _id: Id<'messages'>;
  _creationTime: number;
  chatId: Id<'chats'>;
  userId: Id<'users'>;
  content: string;
  timestamp: number;
  type?: string;
  includedInContext?: boolean;
  isDeepSeekCommand?: boolean;
  contextRelevance?: number;
  updatedAt?: number;
  files?: Array<{
    id: string;
    name: string;
    language: string;
    content: string;
    metadata: {
      size: number;
      lines: number;
      estimatedTokens: number;
      fileType: string;
      uploadedAt?: number;
    };
  }>;
};

export const getContextMessages = query({
  args: {
    chatId: v.id('chats'),
    maxMessages: v.optional(v.number()), // Limit number of messages to prevent token overuse
    includeFiles: v.optional(v.boolean()), // Whether to include file attachments in context
    maxFileSize: v.optional(v.number()), // Max file size to include (in chars)
  },
  handler: async (ctx, args) => {
    // Get context settings
    const settings = await ctx.db
      .query('chatContextSettings')
      .withIndex('by_chat', (q) => q.eq('chatId', args.chatId))
      .unique();
    const contextMode = settings?.contextMode || 'deepseek_only';
    const useSummaryContext = settings?.useSummaryContext || false;
    const includeFiles = args.includeFiles !== false; // Default to true
    const maxFileSize = args.maxFileSize || 10000; // Default 10k chars per file

    if (contextMode === 'none') {
      return {
        messages: [],
        summary: null,
        tokenEstimate: 0,
        fileCount: 0,
        filesTokenEstimate: 0,
      };
    }

    const maxMessages = args.maxMessages || 50; // Default limit to prevent excessive token usage

    // Properly typed messages variable
    let messages: MessageDoc[];

    if (contextMode === 'deepseek_only') {
      // Get all messages first, then filter in memory for better reliability
      const allMessages = await ctx.db
        .query('messages')
        .withIndex('by_chat_time', (q) => q.eq('chatId', args.chatId))
        .order('desc')
        .take(maxMessages * 2); // Get more messages to account for filtering

      // Filter messages in memory for more reliable string matching
      messages = allMessages
        .filter((msg) => {
          // Include messages marked as DeepSeek commands
          if (msg.isDeepSeekCommand === true) {
            return true;
          }

          // Include chatbot responses (DeepSeek AI responses)
          if (msg.type === 'chatbot') {
            return true;
          }

          // Include user messages that start with /deepseek (case insensitive)
          if (
            msg.type === 'user' &&
            msg.content &&
            msg.content.trim().toLowerCase().startsWith('/deepseek')
          ) {
            return true;
          }

          // Include messages with file attachments (they might be relevant for AI context)
          if (msg.files && msg.files.length > 0) {
            return true;
          }

          return false;
        })
        .slice(0, maxMessages); // Limit to maxMessages after filtering
    } else if (contextMode === 'all_messages') {
      // Get all messages
      messages = await ctx.db
        .query('messages')
        .withIndex('by_chat_time', (q) => q.eq('chatId', args.chatId))
        .order('desc')
        .take(maxMessages);
    } else {
      // Default fallback to deepseek_only behavior
      const allMessages = await ctx.db
        .query('messages')
        .withIndex('by_chat_time', (q) => q.eq('chatId', args.chatId))
        .order('desc')
        .take(maxMessages * 2);

      messages = allMessages
        .filter((msg) => {
          return (
            msg.isDeepSeekCommand === true ||
            msg.type === 'chatbot' ||
            (msg.type === 'user' &&
              msg.content &&
              msg.content.trim().toLowerCase().startsWith('/deepseek')) ||
            (msg.files && msg.files.length > 0) // Include file messages
          );
        })
        .slice(0, maxMessages);
    }

    // Reverse to get chronological order
    messages.reverse();

    // Process messages and add user info inline - much simpler approach
    const processedMessages = await Promise.all(
      messages.map(async (msg) => {
        const user = await ctx.db.get(msg.userId);

        // Process files if they exist and should be included
        if (includeFiles && msg.files && msg.files.length > 0) {
          // Truncate large files in place
          msg.files = msg.files.map((file) => {
            if (file.content.length > maxFileSize) {
              return {
                ...file,
                content: file.content.substring(0, maxFileSize),
                metadata: {
                  ...file.metadata,
                  originalSize: file.content.length,
                  truncated: true,
                  contextTokens: Math.ceil(maxFileSize / 4),
                },
              };
            }
            return {
              ...file,
              metadata: {
                ...file.metadata,
                contextTokens: Math.ceil(file.content.length / 4),
              },
            };
          });
        }

        // Add user info as a computed property, don't modify the message structure
        return {
          ...msg,
          // Add user info without changing the core message type
          userInfo: user ? { name: user.name, id: user._id } : { name: 'Unknown', id: msg.userId },
        };
      })
    );

    let summary: string | null = null;
    let effectiveMessages = processedMessages;

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
        effectiveMessages = processedMessages.slice(-10); // Last 10 messages
      }
    }

    // Calculate token estimates
    let messageTokens = 0;
    let filesTokens = 0;
    let fileCount = 0;

    for (const message of effectiveMessages) {
      // Message content tokens
      messageTokens += Math.ceil(message.content.length / 4);

      // File tokens and count
      if (message.files?.length) {
        fileCount += message.files.length;
        for (const file of message.files) {
          filesTokens += Math.ceil(file.content.length / 4);
        }
      }
    }

    const summaryTokens = summary ? Math.ceil(summary.length / 4) : 0;
    const totalTokenEstimate = messageTokens + filesTokens + summaryTokens;

    return {
      messages: effectiveMessages,
      summary,
      tokenEstimate: totalTokenEstimate,
      messageTokens: messageTokens,
      filesTokenEstimate: filesTokens,
      summaryTokens: summaryTokens,
      fileCount: fileCount,
      needsSummarization: messages.length > 20,
      totalMessageCount: messages.length,
      contextMode,
      fileProcessingSettings: {
        includeFiles: includeFiles,
        maxFileSize: maxFileSize,
        filesIncluded: fileCount > 0,
      },
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
