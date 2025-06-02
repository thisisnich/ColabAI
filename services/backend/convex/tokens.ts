import { SessionIdArg } from 'convex-helpers/server/sessions';
import { v } from 'convex/values';
import { getAuthUser } from '../modules/auth/getAuthUser';
import type { Id } from './_generated/dataModel';
import { internalMutation, internalQuery, mutation, query } from './_generated/server';
import type { MutationCtx, QueryCtx } from './_generated/server';

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

// Initialize token tracking for authenticated user (session-based)
export const initializeUserTokensFromSession = mutation({
  args: {
    monthlyLimit: v.optional(v.number()),
    ...SessionIdArg,
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, { sessionId: args.sessionId });
    if (!user) {
      throw new Error('You must be logged in to initialize token tracking');
    }

    const existing = await ctx.db
      .query('userTokens')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .unique();

    if (existing) {
      return existing._id;
    }

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    return await ctx.db.insert('userTokens', {
      userId: user._id,
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

// Reset monthly tokens if needed (internal mutation)
export const resetMonthlyTokensIfNeeded = internalMutation({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const userTokens = await ctx.db
      .query('userTokens')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
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
  },
});

// Check if user has enough tokens for a request
export const checkTokenLimit = internalQuery({
  args: {
    userId: v.id('users'),
    estimatedTokens: v.optional(v.number()), // Estimated tokens for the upcoming request
  },
  handler: async (ctx, args) => {
    const userTokens = await ctx.db
      .query('userTokens')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .unique();

    if (!userTokens) {
      return {
        hasTokens: false,
        availableTokens: 0,
        monthlyLimit: DEFAULT_MONTHLY_LIMIT,
        monthlyUsed: 0,
        totalUsed: 0,
        purchasedTokens: 0,
        reason: 'Token tracking not initialized',
        needsReset: false,
      };
    }

    const currentMonth = getCurrentMonth();
    const needsReset = userTokens.lastResetDate !== currentMonth;
    const monthlyUsed = needsReset ? 0 : userTokens.monthlyTokensUsed;

    const availableTokens = userTokens.monthlyLimit + userTokens.purchasedTokens - monthlyUsed;
    const hasTokens = availableTokens > (args.estimatedTokens ?? 0);

    return {
      hasTokens,
      availableTokens,
      monthlyLimit: userTokens.monthlyLimit,
      monthlyUsed,
      totalUsed: userTokens.totalTokensUsed,
      purchasedTokens: userTokens.purchasedTokens,
      reason: hasTokens ? null : 'Monthly token limit exceeded',
      needsReset,
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
    // Reset monthly tokens if needed first
    let userTokens = await ctx.db
      .query('userTokens')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .unique();

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

    // Check if we need to reset monthly usage
    const currentMonth = getCurrentMonth();
    if (userTokens.lastResetDate !== currentMonth) {
      await ctx.db.patch(userTokens._id, {
        monthlyTokensUsed: 0,
        lastResetDate: currentMonth,
        updatedAt: Date.now(),
      });
      userTokens = {
        ...userTokens,
        monthlyTokensUsed: 0,
        lastResetDate: currentMonth,
      };
    }

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
    const user = await getAuthUser(ctx, { sessionId: args.sessionId });
    if (!user) {
      throw new Error('You must be logged in to purchase tokens');
    }

    let userTokens = await ctx.db
      .query('userTokens')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .unique();

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

    // Check if we need to reset monthly usage
    const currentMonth = getCurrentMonth();
    if (userTokens.lastResetDate !== currentMonth) {
      await ctx.db.patch(userTokens._id, {
        monthlyTokensUsed: 0,
        lastResetDate: currentMonth,
        updatedAt: Date.now(),
      });
      userTokens = {
        ...userTokens,
        monthlyTokensUsed: 0,
        lastResetDate: currentMonth,
      };
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
export const getUserTokenStats = query({
  args: {
    limit: v.optional(v.number()),
    ...SessionIdArg,
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, { sessionId: args.sessionId });
    if (!user) throw new Error('You must be logged in');

    const userTokens = await ctx.db
      .query('userTokens')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .unique();

    // If user tokens don't exist, return null to indicate initialization is needed
    if (!userTokens) {
      return null;
    }

    // Check if reset is needed (read-only, won't actually reset)
    const currentMonth = getCurrentMonth();
    const needsReset = userTokens.lastResetDate !== currentMonth;
    const monthlyUsed = needsReset ? 0 : userTokens.monthlyTokensUsed;

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
      monthlyTokensUsed: monthlyUsed,
      monthlyLimit: userTokens.monthlyLimit,
      purchasedTokens: userTokens.purchasedTokens,
      availableTokens: userTokens.monthlyLimit + userTokens.purchasedTokens - monthlyUsed,
      lastResetDate: userTokens.lastResetDate,
      recentUsage,
      monthlyPurchases,
      needsInitialization: false,
      needsReset,
    };
  },
});

// Helper functions
function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthStartTimestamp(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
}
