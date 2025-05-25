import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

// DEPRECATION NOTICE: The fields `expiresAt` and `expiresAtLabel` in the sessions table are deprecated and no longer used for session expiry. They are only kept for migration compatibility and will be removed in a future migration.

export default defineSchema({
  appInfo: defineTable({
    latestVersion: v.string(),
  }),

  // Token tracking tables
  userTokens: defineTable({
    userId: v.id('users'),
    totalTokensUsed: v.number(), // Total tokens consumed by this user
    monthlyTokensUsed: v.number(), // Tokens used this month (resets monthly)
    monthlyLimit: v.number(), // Monthly token limit for this user
    purchasedTokens: v.number(), // Additional tokens purchased
    lastResetDate: v.string(), // YYYY-MM format for monthly reset tracking
    createdAt: v.number(),
    updatedAt: v.number(),
    contextTokensUsed: v.optional(v.number()), // Tokens used for context processing
    summaryTokensUsed: v.optional(v.number()), // Tokens used for summary generation
  }).index('by_user', ['userId']),

  tokenUsageHistory: defineTable({
    userId: v.id('users'),
    chatId: v.id('chats'),
    command: v.string(), // e.g., "deepseek", "wikipedia", etc.
    tokensUsed: v.number(), // Tokens consumed in this operation
    inputTokens: v.optional(v.number()), // Tokens from user input
    outputTokens: v.optional(v.number()), // Tokens from AI response
    timestamp: v.number(),
    cost: v.optional(v.number()), // Optional: cost in USD cents
  })
    .index('by_user_time', ['userId', 'timestamp'])
    .index('by_chat_time', ['chatId', 'timestamp'])
    .index('by_user_month', ['userId']) // For monthly aggregations
    .index('by_command', ['command']), // For analytics

  tokenPurchases: defineTable({
    userId: v.id('users'),
    tokensAdded: v.number(),
    amountPaid: v.number(), // In USD cents
    paymentProvider: v.string(), // e.g., "stripe", "paypal"
    paymentId: v.string(), // External payment reference
    timestamp: v.number(),
  }).index('by_user_time', ['userId', 'timestamp']),

  presentationState: defineTable({
    key: v.string(), // The presentation key that identifies this presentation
    currentSlide: v.number(), // The current slide number
    lastUpdated: v.number(), // Timestamp of last update
    activePresentation: v.optional(
      v.object({
        presenterId: v.string(), // Session ID of the current presenter
      })
    ), // Optional object containing presenter information
  }).index('by_key', ['key']),

  // Discussion-related tables
  discussionState: defineTable({
    key: v.string(), // Unique identifier for the discussion
    title: v.string(), // Title of the discussion
    isActive: v.boolean(), // Whether the discussion is active or concluded
    createdAt: v.number(), // When the discussion was created
    conclusions: v.optional(
      v.array(
        v.object({
          text: v.string(), // The conclusion text
          tags: v.array(v.string()), // Optional tags for categorizing the conclusion (e.g., "task", "decision", "action", etc.)
        })
      )
    ), // Conclusions for this discussion
    concludedAt: v.optional(v.number()), // When the discussion was concluded
    concludedBy: v.optional(v.string()), // Session ID of who concluded the discussion
  }).index('by_key', ['key']),

  discussionMessages: defineTable({
    discussionKey: v.string(), // The discussion this message belongs to
    name: v.string(), // Name of the person who wrote the message
    message: v.string(), // The content of the message
    timestamp: v.number(), // When the message was sent
    sessionId: v.optional(v.string()), // Session ID of the sender (optional)
  }).index('by_discussion', ['discussionKey']),

  // auth
  users: defineTable(
    v.union(
      v.object({
        type: v.literal('full'),
        name: v.string(),
        username: v.string(),
        email: v.string(),
        recoveryCode: v.optional(v.string()),
      }),
      v.object({
        type: v.literal('anonymous'),
        name: v.string(), //system generated name
        recoveryCode: v.optional(v.string()),
      }),
      v.object({
        type: v.literal('chatbot'),
        name: v.string(),
        username: v.string(), //system generated name
      })
    )
  )
    .index('by_username', ['username'])
    .index('by_email', ['email'])
    .index('by_name', ['name']),

  //sessions
  sessions: defineTable({
    sessionId: v.string(), //this is provided by the client
    userId: v.id('users'), // null means session exists but not authenticated
    createdAt: v.number(),
    expiresAt: v.optional(v.number()), // DEPRECATED: No longer used for session expiry. Kept for migration compatibility.
    expiresAtLabel: v.optional(v.string()), // DEPRECATED: No longer used for session expiry. Kept for migration compatibility.
  }).index('by_sessionId', ['sessionId']),

  //login codes for cross-device authentication
  loginCodes: defineTable({
    code: v.string(), // The 8-letter login code
    userId: v.id('users'), // The user who generated this code
    createdAt: v.number(), // When the code was created
    expiresAt: v.number(), // When the code expires (1 minute after creation)
  }).index('by_code', ['code']),

  // Chats tables
  chats: defineTable({
    name: v.string(), // The name of the chat
    createdAt: v.number(), // When the chat was created
    createdBy: v.id('users'), // User who created the chat
    updatedAt: v.number(), // Time of last activity in the chat
  }).index('by_updated', ['updatedAt']), // Index to sort chats by recent activity

  chatMemberships: defineTable({
    chatId: v.id('chats'), // Reference to the chat
    userId: v.id('users'), // Reference to the user
    joinedAt: v.number(), // When the user joined the chat
    role: v.optional(v.string()), // Optional role of the user in the chat (e.g., "admin", "contributor", etc.)
  })
    .index('by_chat_user', ['chatId', 'userId']) // For checking if a user is in a chat
    .index('by_user_chat', ['userId', 'chatId']) // For finding all chats a user is in
    .index('by_chat', ['chatId']), // For finding all members of a chat

  messages: defineTable({
    chatId: v.id('chats'), // Reference to the chat this message belongs to
    userId: v.id('users'), // User who sent the message
    content: v.string(), // The message content
    timestamp: v.number(), // When the message was sent
    type: v.optional(v.string()), // Optional type of message (e.g., "system" for system messages)
    includedInContext: v.optional(v.boolean()), // Whether message is included in context
    isDeepSeekCommand: v.optional(v.boolean()), // Whether message starts with /deepseek
    contextRelevance: v.optional(v.number()), // AI-scored relevance (0-1) for smart filtering
  })
    .index('by_chat_time', ['chatId', 'timestamp']) // For querying messages in a chat ordered by time
    .index('by_chat', ['chatId']) // For simple membership queries
    .index('by_chat_context', ['chatId', 'includedInContext'])
    .index('by_chat_deepseek', ['chatId', 'isDeepSeekCommand']),

  // Chat join codes table (Added for invite functionality)
  chatJoinCodes: defineTable({
    code: v.string(), // The join code
    chatId: v.id('chats'), // The chat this code is for
    createdByUserId: v.id('users'), // User who created this code
    createdAt: v.number(), // When the code was created
    expiresAt: v.number(), // When the code expires
  }).index('by_code', ['code']), // For looking up codes
  chatContextSettings: defineTable({
    chatId: v.id('chats'),
    contextMode: v.union(
      v.literal('none'), // No context retention
      v.literal('deepseek_only'), // Only /deepseek messages
      v.literal('all_messages') // All messages in chat
    ),
    useSummaryContext: v.boolean(), // Whether to use AI summarization
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_chat', ['chatId']),

  // New table for storing context summaries
  contextSummaries: defineTable({
    chatId: v.id('chats'),
    summary: v.string(), // AI-generated summary of context
    messageCount: v.number(), // Number of messages summarized
    lastMessageId: v.id('messages'), // Last message included in summary
    tokensUsed: v.number(), // Tokens used to generate summary
    createdAt: v.number(),
    version: v.number(), // For tracking summary versions
  })
    .index('by_chat', ['chatId'])
    .index('by_chat_version', ['chatId', 'version']),
});
