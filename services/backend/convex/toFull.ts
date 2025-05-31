import { v } from 'convex/values';
// convex/updateUserToFull.ts
import { internalMutation } from './_generated/server';

export const updateUserToFull = internalMutation({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db.get(args.userId);

    if (!existingUser) {
      throw new Error('User not found');
    }

    // Generate default values for required fields
    const defaultUsername = `user_${args.userId.slice(-8)}`; // Use last 8 chars of userId
    const defaultEmail = `${defaultUsername}@temp.local`; // Temporary email format

    // Update the user to full type
    await ctx.db.patch(args.userId, {
      type: 'full',
      username: defaultUsername,
      email: defaultEmail,
      name: existingUser.name, // Keep existing name
      // Keep recoveryCode if it exists
      ...(existingUser.recoveryCode && { recoveryCode: existingUser.recoveryCode }),
    });

    return {
      success: true,
      username: defaultUsername,
      email: defaultEmail,
    };
  },
});
