import { SessionIdArg } from 'convex-helpers/server/sessions';
import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { internalMutation, internalQuery, mutation, query } from './_generated/server';

// Constants
const DEFAULT_MONTHLY_LIMIT = 100000; // Default monthly token limit
const DEEPSEEK_COST_PER_1K_INPUT = 0.14; // USD cents per 1K input tokens
const DEEPSEEK_COST_PER_1K_OUTPUT = 0.28; // USD cents per 1K output tokens

// Initialize token tracking for a user
export const initializeUserTokens = mutation({
  args: {
    userId: v.id('users'),
    monthlyLimit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('userTokens')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .unique();

    if (existing) {
      return existing._id;
    }

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    return await ctx.db.insert('userTokens', {
      userId: args.userId,
      totalTokensUsed: 0,
      monthlyTokensUsed: 0,
      monthlyLimit: args.monthlyLimit ?? DEFAULT_MONTHLY_LIMIT,
      purchasedTokens: 0,
      lastResetDate: currentMonth,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Check if user has enough tokens for a request
export const checkTokenLimit = internalQuery({
  args: {
    userId: v.id('users'),
    estimatedTokens: v.optional(v.number()), // Estimated tokens for the upcoming request
  },
  handler: async (ctx, args) => {
    const userTokens = await getUserTokensWithReset(ctx, args.userId);

    if (!userTokens) {
      return {
        hasTokens: false,
        availableTokens: 0,
        monthlyLimit: DEFAULT_MONTHLY_LIMIT,
        monthlyUsed: 0,
        totalUsed: 0,
        purchasedTokens: 0,
        reason: 'Token tracking not initialized',
      };
    }

    const availableTokens =
      userTokens.monthlyLimit + userTokens.purchasedTokens - userTokens.monthlyTokensUsed;
    const hasTokens = availableTokens > (args.estimatedTokens ?? 0);

    return {
      hasTokens,
      availableTokens,
      monthlyLimit: userTokens.monthlyLimit,
      monthlyUsed: userTokens.monthlyTokensUsed,
      totalUsed: userTokens.totalTokensUsed,
      purchasedTokens: userTokens.purchasedTokens,
      reason: hasTokens ? null : 'Monthly token limit exceeded',
    };
  },
});

// Record token usage (internal function)
export const recordTokenUsage = internalMutation({
  args: {
    userId: v.id('users'),
    chatId: v.id('chats'),
    command: v.string(),
    tokensUsed: v.number(),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get user tokens and reset if needed
    let userTokens = await getUserTokensWithReset(ctx, args.userId);

    if (!userTokens) {
      // Initialize if doesn't exist
      const tokenId = await ctx.db.insert('userTokens', {
        userId: args.userId,
        totalTokensUsed: 0,
        monthlyTokensUsed: 0,
        monthlyLimit: DEFAULT_MONTHLY_LIMIT,
        purchasedTokens: 0,
        lastResetDate: getCurrentMonth(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      userTokens = await ctx.db.get(tokenId);
    }

    if (!userTokens) throw new Error('Failed to initialize user tokens');

    // Calculate cost (optional)
    let cost: number | undefined;
    if (args.inputTokens && args.outputTokens) {
      cost = Math.round(
        (args.inputTokens / 1000) * DEEPSEEK_COST_PER_1K_INPUT +
          (args.outputTokens / 1000) * DEEPSEEK_COST_PER_1K_OUTPUT
      );
    }

    // Record usage history
    await ctx.db.insert('tokenUsageHistory', {
      userId: args.userId,
      chatId: args.chatId,
      command: args.command,
      tokensUsed: args.tokensUsed,
      inputTokens: args.inputTokens,
      outputTokens: args.outputTokens,
      timestamp: Date.now(),
      cost,
    });

    // Update user token counts
    await ctx.db.patch(userTokens._id, {
      totalTokensUsed: userTokens.totalTokensUsed + args.tokensUsed,
      monthlyTokensUsed: userTokens.monthlyTokensUsed + args.tokensUsed,
      updatedAt: Date.now(),
    });

    return {
      totalUsed: userTokens.totalTokensUsed + args.tokensUsed,
      monthlyUsed: userTokens.monthlyTokensUsed + args.tokensUsed,
      remainingTokens:
        userTokens.monthlyLimit +
        userTokens.purchasedTokens -
        (userTokens.monthlyTokensUsed + args.tokensUsed),
    };
  },
});

// Helper function to get authenticated user (matching invite.ts pattern)
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

  const user = await ctx.db.get(existingSession.userId);
  return user;
}

// Add purchased tokens
export const addPurchasedTokens = mutation({
  args: {
    tokensAdded: v.number(),
    amountPaid: v.number(), // in USD cents
    paymentProvider: v.string(),
    paymentId: v.string(),
    ...SessionIdArg,
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.sessionId);
    if (!user) {
      throw new Error('You must be logged in to purchase tokens');
    }

    let userTokens = await getUserTokensWithReset(ctx, user._id);

    if (!userTokens) {
      // Initialize token tracking if it doesn't exist
      const tokenId = await ctx.db.insert('userTokens', {
        userId: user._id,
        totalTokensUsed: 0,
        monthlyTokensUsed: 0,
        monthlyLimit: DEFAULT_MONTHLY_LIMIT,
        purchasedTokens: 0,
        lastResetDate: getCurrentMonth(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      userTokens = await ctx.db.get(tokenId);
    }

    if (!userTokens) {
      throw new Error('Failed to initialize user token tracking');
    }

    // Record the purchase
    await ctx.db.insert('tokenPurchases', {
      userId: user._id,
      tokensAdded: args.tokensAdded,
      amountPaid: args.amountPaid,
      paymentProvider: args.paymentProvider,
      paymentId: args.paymentId,
      timestamp: Date.now(),
    });

    // Update user's purchased tokens
    await ctx.db.patch(userTokens._id, {
      purchasedTokens: userTokens.purchasedTokens + args.tokensAdded,
      updatedAt: Date.now(),
    });

    return {
      newBalance: userTokens.purchasedTokens + args.tokensAdded,
      totalAvailable:
        userTokens.monthlyLimit +
        userTokens.purchasedTokens +
        args.tokensAdded -
        userTokens.monthlyTokensUsed,
    };
  },
});

// Get user's token usage statistics
// Mutation to initialize tokens

// Updated query (read-only)
export const getUserTokenStats = query({
  args: {
    limit: v.optional(v.number()),
    ...SessionIdArg,
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.sessionId);
    if (!user) throw new Error('You must be logged in');

    const isUserTokens = await getUserTokensWithReset(ctx, user._id);

    if (!isUserTokens) {
      // Instead of inserting here, return null or throw
      const init = await initializeUserTokens;

      // throw new Error('Token tracking not initialized - please call initializeUserTokens first');
      // Or return null and handle it in your UI
    }
    const userTokens = await getUserTokensWithReset(ctx, user._id);
    const recentUsage = await ctx.db
      .query('tokenUsageHistory')
      .withIndex('by_user_time', (q) => q.eq('userId', user._id))
      .order('desc')
      .take(args.limit ?? 10);

    // Get monthly purchases
    const monthlyPurchases = await ctx.db
      .query('tokenPurchases')
      .withIndex('by_user_time', (q) => q.eq('userId', user._id))
      .filter((q) => q.gte(q.field('timestamp'), getMonthStartTimestamp()))
      .collect();

    return {
      totalTokensUsed: userTokens.totalTokensUsed,
      monthlyTokensUsed: userTokens.monthlyTokensUsed,
      monthlyLimit: userTokens.monthlyLimit,
      purchasedTokens: userTokens.purchasedTokens,
      availableTokens:
        userTokens.monthlyLimit + userTokens.purchasedTokens - userTokens.monthlyTokensUsed,
      lastResetDate: userTokens.lastResetDate,
      recentUsage,
      monthlyPurchases,
    };
  },
});
// Helper functions
async function getUserTokensWithReset(ctx: any, userId: Id<'users'>) {
  const userTokens = await ctx.db
    .query('userTokens')
    .withIndex('by_user', (q: { eq: (arg0: string, arg1: Id<'users'>) => any }) =>
      q.eq('userId', userId)
    )
    .unique();

  if (!userTokens) {
    return null;
  }

  const currentMonth = getCurrentMonth();

  // Check if we need to reset monthly usage
  if (userTokens.lastResetDate !== currentMonth) {
    await ctx.db.patch(userTokens._id, {
      monthlyTokensUsed: 0,
      lastResetDate: currentMonth,
      updatedAt: Date.now(),
    });

    return {
      ...userTokens,
      monthlyTokensUsed: 0,
      lastResetDate: currentMonth,
    };
  }

  return userTokens;
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthStartTimestamp(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
}
