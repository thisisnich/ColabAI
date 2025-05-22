import { SessionIdArg } from 'convex-helpers/server/sessions';
import { v } from 'convex/values';
import { ConvexError } from 'convex/values';
import { generateLoginCode, getCodeExpirationTime, isCodeExpired } from '../modules/auth/codeUtils';
import { mutation, query } from './_generated/server';

// Generate a join code for a chat
export const createJoinCode = mutation({
  args: {
    chatId: v.id('chats'),
    ...SessionIdArg,
  },
  handler: async (ctx, args) => {
    // Find the session by sessionId
    const existingSession = await ctx.db
      .query('sessions')
      .withIndex('by_sessionId', (q) => q.eq('sessionId', args.sessionId))
      .first();

    if (!existingSession || !existingSession.userId) {
      return {
        success: false,
        message: 'You must be logged in to generate a join code',
      };
    }

    // Check if user is a member of this chat
    const membership = await ctx.db
      .query('chatMemberships')
      .withIndex('by_chat_user', (q) =>
        q.eq('chatId', args.chatId).eq('userId', existingSession.userId)
      )
      .first();

    if (!membership) {
      return {
        success: false,
        message: 'You must be a member of this chat to generate a join code',
      };
    }

    const now = Date.now();

    // Delete any existing active codes for this chat
    const existingCodes = await ctx.db
      .query('chatJoinCodes')
      .filter((q) => q.eq(q.field('chatId'), args.chatId))
      .collect();

    // Delete all existing codes for this chat
    for (const code of existingCodes) {
      await ctx.db.delete(code._id);
    }

    // Generate a new join code
    const codeString = generateLoginCode();
    const expiresAt = getCodeExpirationTime();

    // Store the code in the database
    await ctx.db.insert('chatJoinCodes', {
      code: codeString,
      chatId: args.chatId,
      createdByUserId: existingSession.userId,
      createdAt: now,
      expiresAt,
    });

    return {
      success: true,
      code: codeString,
      expiresAt,
    };
  },
});

// Get active join code for a chat
export const getActiveChatJoinCode = query({
  args: {
    chatId: v.id('chats'),
    ...SessionIdArg,
  },
  handler: async (ctx, args) => {
    // Find the session by sessionId
    const existingSession = await ctx.db
      .query('sessions')
      .withIndex('by_sessionId', (q) => q.eq('sessionId', args.sessionId))
      .first();

    if (!existingSession || !existingSession.userId) {
      return { success: false, reason: 'not_authenticated' };
    }

    // Check if user is a member of this chat
    const membership = await ctx.db
      .query('chatMemberships')
      .withIndex('by_chat_user', (q) =>
        q.eq('chatId', args.chatId).eq('userId', existingSession.userId)
      )
      .first();

    if (!membership) {
      return { success: false, reason: 'not_a_member' };
    }

    const now = Date.now();

    // Find any active code for this chat
    const activeCode = await ctx.db
      .query('chatJoinCodes')
      .filter((q) => q.and(q.eq(q.field('chatId'), args.chatId), q.gt(q.field('expiresAt'), now)))
      .first();

    if (!activeCode) {
      return { success: false, reason: 'no_active_code' };
    }

    return {
      success: true,
      code: activeCode.code,
      expiresAt: activeCode.expiresAt,
    };
  },
});

// Join a chat using a join code
export const joinChatWithCode = mutation({
  args: {
    code: v.string(),
    ...SessionIdArg,
  },
  handler: async (ctx, args) => {
    // Find the session by sessionId
    const existingSession = await ctx.db
      .query('sessions')
      .withIndex('by_sessionId', (q) => q.eq('sessionId', args.sessionId))
      .first();

    if (!existingSession || !existingSession.userId) {
      return {
        success: false,
        message: 'You must be logged in to join a chat',
      };
    }

    // Clean up the code (removing dashes if any)
    const cleanCode = args.code.replace(/-/g, '').toUpperCase();

    // Find the join code
    const joinCode = await ctx.db
      .query('chatJoinCodes')
      .withIndex('by_code', (q) => q.eq('code', cleanCode))
      .first();

    if (!joinCode) {
      return {
        success: false,
        message: 'Invalid join code',
      };
    }

    // Check if the code is expired
    if (isCodeExpired(joinCode.expiresAt)) {
      // Delete the expired code
      await ctx.db.delete(joinCode._id);
      return {
        success: false,
        message: 'This join code has expired',
      };
    }

    // Get the chat details
    const chat = await ctx.db.get(joinCode.chatId);
    if (!chat) {
      return {
        success: false,
        message: 'Chat not found',
      };
    }

    // Check if user is already a member of this chat
    const existingMembership = await ctx.db
      .query('chatMemberships')
      .withIndex('by_chat_user', (q) =>
        q.eq('chatId', joinCode.chatId).eq('userId', existingSession.userId)
      )
      .first();

    if (existingMembership) {
      return {
        success: false,
        message: 'You are already a member of this chat',
      };
    }

    // Add user to the chat
    await ctx.db.insert('chatMemberships', {
      chatId: joinCode.chatId,
      userId: existingSession.userId,
      joinedAt: Date.now(),
      role: 'viewer', // Default role
    });

    // Notify chat about new member
    const user = await ctx.db.get(existingSession.userId);
    await ctx.db.insert('messages', {
      chatId: joinCode.chatId,
      userId: existingSession.userId,
      content: `${user?.name || 'Unknown User'} joined the chat`,
      timestamp: Date.now(),
      type: 'system',
    });

    return {
      success: true,
      message: 'Successfully joined chat',
      chatId: joinCode.chatId,
    };
  },
});
