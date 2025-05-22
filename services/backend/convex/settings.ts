import { SessionIdArg } from 'convex-helpers/server/sessions';
import { v } from 'convex/values';
import { ConvexError } from 'convex/values';
import { getAuthUser } from '../modules/auth/getAuthUser';
import type { Id } from './_generated/dataModel';
import { mutation, query } from './_generated/server';

/**
 * Get all member roles for a chat
 * Returns a simple array of user roles for displaying in messages
 */
export const getChatMemberRoles = query({
  args: {
    chatId: v.id('chats'),
    ...SessionIdArg,
  },
  handler: async (ctx, args) => {
    // Get the current user from the session
    const session = await ctx.db
      .query('sessions')
      .withIndex('by_sessionId', (q) => q.eq('sessionId', args.sessionId))
      .first();

    if (!session || !session.userId) {
      return null;
    }

    // Get the chat details
    const chat = await ctx.db.get(args.chatId);
    if (!chat) {
      return null;
    }

    // Check if the user is a member of this chat
    const membership = await ctx.db
      .query('chatMemberships')
      .withIndex('by_chat_user', (q) => q.eq('chatId', args.chatId).eq('userId', session.userId))
      .first();

    if (!membership) {
      return null;
    }

    // Get all chat members with their roles
    const chatMemberships = await ctx.db
      .query('chatMemberships')
      .withIndex('by_chat', (q) => q.eq('chatId', args.chatId))
      .collect();

    // Return role information for each member
    const memberRoles = chatMemberships.map((membership) => ({
      userId: membership.userId,
      role: membership.role || 'member',
      isCreator: chat.createdBy === membership.userId,
    }));

    return memberRoles;
  },
});

/**
 * Get the current user's role in a specific chat
 * Returns the user's role, permissions, and membership status
 */
export const getCurrentUserRole = query({
  args: {
    chatId: v.id('chats'),
    ...SessionIdArg,
  },
  handler: async (ctx, args) => {
    // Get the current user from the session
    const session = await ctx.db
      .query('sessions')
      .withIndex('by_sessionId', (q) => q.eq('sessionId', args.sessionId))
      .first();

    if (!session || !session.userId) {
      return {
        userId: null,
        role: null,
        isCreator: false,
        isAdmin: false,
        isMember: false,
        canSendMessages: false,
        canManageMembers: false,
      };
    }

    // Get the chat details
    const chat = await ctx.db.get(args.chatId);
    if (!chat) {
      return {
        userId: session.userId,
        role: null,
        isCreator: false,
        isAdmin: false,
        isMember: false,
        canSendMessages: false,
        canManageMembers: false,
      };
    }

    // Check if the user is a member of this chat
    const membership = await ctx.db
      .query('chatMemberships')
      .withIndex('by_chat_user', (q) => q.eq('chatId', args.chatId).eq('userId', session.userId))
      .first();

    if (!membership) {
      return {
        userId: session.userId,
        role: null,
        isCreator: false,
        isAdmin: false,
        isMember: false,
        canSendMessages: false,
        canManageMembers: false,
      };
    }

    // Determine the user's role and permissions
    const isCreator = chat.createdBy === session.userId;
    const role = membership.role || 'member';
    const isAdmin = isCreator || role === 'admin';
    const canSendMessages = role !== 'viewer' || isCreator;
    const canManageMembers = isAdmin;

    return {
      userId: session.userId,
      role: isCreator ? 'creator' : role,
      isCreator,
      isAdmin,
      isMember: true,
      canSendMessages,
      canManageMembers,
    };
  },
});

// Get chat details with user permission check
export const getChatSettingsData = query({
  args: {
    chatId: v.id('chats'),
    ...SessionIdArg,
  },
  handler: async (ctx, args) => {
    // First, get the current user from the session
    const session = await ctx.db
      .query('sessions')
      .withIndex('by_sessionId', (q) => q.eq('sessionId', args.sessionId))
      .first();

    if (!session || !session.userId) {
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to view chat settings',
      });
    }

    const currentUser = await ctx.db.get(session.userId);
    if (!currentUser) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Current user not found',
      });
    }

    // Get the chat details
    const chat = await ctx.db.get(args.chatId);
    if (!chat) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Chat not found',
      });
    }

    // Check if the user is a member of this chat
    const membership = await ctx.db
      .query('chatMemberships')
      .withIndex('by_chat_user', (q) => q.eq('chatId', args.chatId).eq('userId', session.userId))
      .first();

    if (!membership) {
      throw new ConvexError({
        code: 'FORBIDDEN',
        message: 'You are not a member of this chat',
      });
    }

    // Get all chat members with their details
    const chatMemberships = await ctx.db
      .query('chatMemberships')
      .withIndex('by_chat', (q) => q.eq('chatId', args.chatId))
      .collect();

    // Get user details for all members
    const membersWithDetails = await Promise.all(
      chatMemberships.map(async (membership) => {
        const user = await ctx.db.get(membership.userId);
        if (!user) return null;

        return {
          id: user._id,
          name: user.name,
          isCreator: chat.createdBy === user._id,
          role: membership.role || 'member',
          joinedAt: membership.joinedAt,
        };
      })
    );

    // Filter out null members (users that no longer exist)
    const validMembers = membersWithDetails.filter((member) => member !== null);

    // Check if current user is admin (creator or has admin role)
    const currentUserMembership = chatMemberships.find((m) => m.userId === session.userId);
    const isCurrentUserAdmin =
      chat.createdBy === session.userId || currentUserMembership?.role === 'admin';

    return {
      chatId: args.chatId,
      chatName: chat.name,
      members: validMembers,
      currentUserId: session.userId,
      isCurrentUserAdmin,
      memberCount: validMembers.length,
    };
  },
});

// Check if current user has admin permissions for a chat
export const checkChatAdminPermissions = query({
  args: {
    chatId: v.id('chats'),
    ...SessionIdArg,
  },
  handler: async (ctx, args) => {
    // Get the current user from the session
    const session = await ctx.db
      .query('sessions')
      .withIndex('by_sessionId', (q) => q.eq('sessionId', args.sessionId))
      .first();

    if (!session || !session.userId) {
      return {
        isAdmin: false,
        isMember: false,
        currentUserId: null,
      };
    }

    // Get the chat details
    const chat = await ctx.db.get(args.chatId);
    if (!chat) {
      return {
        isAdmin: false,
        isMember: false,
        currentUserId: session.userId,
      };
    }

    // Check if the user is a member of this chat
    const membership = await ctx.db
      .query('chatMemberships')
      .withIndex('by_chat_user', (q) => q.eq('chatId', args.chatId).eq('userId', session.userId))
      .first();

    const isMember = !!membership;
    const isAdmin = chat.createdBy === session.userId || membership?.role === 'admin';

    return {
      isAdmin,
      isMember,
      currentUserId: session.userId,
    };
  },
});

/**
 * Update a user's role in a chat
 */
export const updateMemberRole = mutation({
  args: {
    chatId: v.id('chats'),
    userId: v.id('users'),
    newRole: v.union(
      v.literal('admin'),
      v.literal('contributor'),
      v.literal('viewer'),
      v.literal('member')
    ),
    ...SessionIdArg,
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args);
    if (!user) {
      throw new Error('Unauthorized');
    }

    // Get the chat
    const chat = await ctx.db.get(args.chatId);
    if (!chat) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Chat not found',
      });
    }

    // Check if current user is admin
    const currentUserMembership = await ctx.db
      .query('chatMemberships')
      .withIndex('by_chat_user', (q) => q.eq('chatId', args.chatId).eq('userId', user._id))
      .first();

    if (!currentUserMembership) {
      throw new ConvexError({
        code: 'FORBIDDEN',
        message: 'You are not a member of this chat',
      });
    }

    const isCurrentUserAdmin =
      chat.createdBy === user._id || currentUserMembership.role === 'admin';
    if (!isCurrentUserAdmin) {
      throw new ConvexError({
        code: 'FORBIDDEN',
        message: 'Only admins can change member roles',
      });
    }

    // Get the target user's membership
    const targetMembership = await ctx.db
      .query('chatMemberships')
      .withIndex('by_chat_user', (q) => q.eq('chatId', args.chatId).eq('userId', args.userId))
      .first();

    if (!targetMembership) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'User is not a member of this chat',
      });
    }

    // Cannot change the creator's role
    if (args.userId === chat.createdBy) {
      throw new ConvexError({
        code: 'FORBIDDEN',
        message: "Cannot change the creator's role",
      });
    }

    // Update the role
    await ctx.db.patch(targetMembership._id, {
      role: args.newRole === 'member' ? undefined : args.newRole,
    });

    // Get target user name for system message
    const targetUser = await ctx.db.get(args.userId);
    const targetUserName = targetUser?.name || 'Unknown User';

    // Add system message
    await ctx.db.insert('messages', {
      chatId: args.chatId,
      userId: user._id,
      content: `${user.name} changed ${targetUserName}'s role to ${args.newRole}`,
      timestamp: Date.now(),
      type: 'system',
    });

    // Update chat's updatedAt
    await ctx.db.patch(args.chatId, {
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Remove a user from a chat
 */
export const removeMemberFromChat = mutation({
  args: {
    chatId: v.id('chats'),
    userId: v.id('users'),
    ...SessionIdArg,
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args);
    if (!user) {
      throw new Error('Unauthorized');
    }

    // Get the chat
    const chat = await ctx.db.get(args.chatId);
    if (!chat) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Chat not found',
      });
    }

    // Check if current user is a member of the chat
    const currentUserMembership = await ctx.db
      .query('chatMemberships')
      .withIndex('by_user_chat', (q) => q.eq('userId', user._id).eq('chatId', args.chatId))
      .unique();

    if (!currentUserMembership) {
      throw new ConvexError({
        code: 'FORBIDDEN',
        message: 'You do not have access to this chat',
      });
    }

    // Check if removing self
    const isSelf = args.userId === user._id;

    // Only admins can remove others, but anyone can remove themself
    const isCurrentUserAdmin =
      chat.createdBy === user._id || currentUserMembership.role === 'admin';
    if (!isSelf && !isCurrentUserAdmin) {
      throw new ConvexError({
        code: 'FORBIDDEN',
        message: 'Only admins can remove members',
      });
    }

    // Get the user to remove
    const userToRemove = await ctx.db.get(args.userId);
    if (!userToRemove) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'User to remove not found',
      });
    }

    // Check if user is a member
    const userMembership = await ctx.db
      .query('chatMemberships')
      .withIndex('by_user_chat', (q) => q.eq('userId', args.userId).eq('chatId', args.chatId))
      .unique();

    if (!userMembership) {
      return { success: true, notMember: true };
    }

    // Cannot remove the creator
    if (args.userId === chat.createdBy && !isSelf) {
      throw new ConvexError({
        code: 'FORBIDDEN',
        message: 'Cannot remove the creator of the chat',
      });
    }

    // If user is leaving (self-removal), check if they're the last admin
    if (isSelf) {
      const allMemberships = await ctx.db
        .query('chatMemberships')
        .withIndex('by_chat', (q) => q.eq('chatId', args.chatId))
        .collect();

      const adminCount = allMemberships.filter(
        (m) => m.userId === chat.createdBy || m.role === 'admin'
      ).length;

      // If this user is an admin and is the last admin, prevent leaving
      if (
        (user._id === chat.createdBy || currentUserMembership.role === 'admin') &&
        adminCount === 1
      ) {
        throw new ConvexError({
          code: 'FORBIDDEN',
          message: 'Cannot leave chat as the last admin. Promote another member to admin first.',
        });
      }
    }

    // Remove the membership
    const now = Date.now();
    await ctx.db.delete(userMembership._id);

    // Check if there are any members left
    const remainingMembers = await ctx.db
      .query('chatMemberships')
      .withIndex('by_chat', (q) => q.eq('chatId', args.chatId))
      .collect();

    // If no members left, delete the chat
    if (remainingMembers.length === 0) {
      // Delete all messages first
      const messages = await ctx.db
        .query('messages')
        .withIndex('by_chat', (q) => q.eq('chatId', args.chatId))
        .collect();

      for (const message of messages) {
        await ctx.db.delete(message._id);
      }

      // Delete the chat
      await ctx.db.delete(args.chatId);
      return { success: true, chatDeleted: true };
    }

    // Update the chat's updatedAt
    await ctx.db.patch(args.chatId, {
      updatedAt: now,
    });

    // Add a system message
    const message = isSelf
      ? `${user.name} left the chat`
      : `${user.name} removed ${userToRemove.name} from the chat`;

    await ctx.db.insert('messages', {
      chatId: args.chatId,
      userId: user._id,
      content: message,
      timestamp: now,
      type: 'system',
    });

    return { success: true };
  },
});

/**
 * Leave a chat (self-removal with admin check)
 */
export const leaveChat = mutation({
  args: {
    chatId: v.id('chats'),
    ...SessionIdArg,
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args);
    if (!user) {
      throw new Error('Unauthorized');
    }

    // Get the chat
    const chat = await ctx.db.get(args.chatId);
    if (!chat) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Chat not found',
      });
    }

    // Check if current user is a member of the chat
    const currentUserMembership = await ctx.db
      .query('chatMemberships')
      .withIndex('by_user_chat', (q) => q.eq('userId', user._id).eq('chatId', args.chatId))
      .unique();

    if (!currentUserMembership) {
      throw new ConvexError({
        code: 'FORBIDDEN',
        message: 'You are not a member of this chat',
      });
    }

    // Check if user is the last admin
    const allMemberships = await ctx.db
      .query('chatMemberships')
      .withIndex('by_chat', (q) => q.eq('chatId', args.chatId))
      .collect();

    const adminCount = allMemberships.filter(
      (m) => m.userId === chat.createdBy || m.role === 'admin'
    ).length;

    // If this user is an admin and is the last admin, prevent leaving
    if (
      (user._id === chat.createdBy || currentUserMembership.role === 'admin') &&
      adminCount === 1
    ) {
      throw new ConvexError({
        code: 'FORBIDDEN',
        message: 'Cannot leave chat as the last admin. Promote another member to admin first.',
      });
    }

    // Remove the membership
    const now = Date.now();
    await ctx.db.delete(currentUserMembership._id);

    // Check if there are any members left
    const remainingMembers = await ctx.db
      .query('chatMemberships')
      .withIndex('by_chat', (q) => q.eq('chatId', args.chatId))
      .collect();

    // If no members left, delete the chat
    if (remainingMembers.length === 0) {
      // Delete all messages first
      const messages = await ctx.db
        .query('messages')
        .withIndex('by_chat', (q) => q.eq('chatId', args.chatId))
        .collect();

      for (const message of messages) {
        await ctx.db.delete(message._id);
      }

      // Delete the chat
      await ctx.db.delete(args.chatId);
      return { success: true, chatDeleted: true };
    }

    // Update the chat's updatedAt
    await ctx.db.patch(args.chatId, {
      updatedAt: now,
    });

    // Add a system message
    await ctx.db.insert('messages', {
      chatId: args.chatId,
      userId: user._id,
      content: `${user.name} left the chat`,
      timestamp: now,
      type: 'system',
    });

    return { success: true };
  },
});
