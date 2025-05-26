import { SessionIdArg } from 'convex-helpers/server/sessions';
import { v } from 'convex/values';
import { ConvexError } from 'convex/values';
import { getAuthUser } from '../modules/auth/getAuthUser';
import { api, internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import { mutation, query } from './_generated/server';
import { internalMutation, internalQuery } from './_generated/server';
// MUTATIONS //

/**
 * Create a new chat with the given name and members
 */
export const createChat = mutation({
  args: {
    name: v.string(),
    ...SessionIdArg,
  },
  handler: async (ctx, args) => {
    console.log('Creating chat with args:', args);
    // Get the current user's ID from the session
    const user = await getAuthUser(ctx, args);
    if (!user) {
      throw new Error('Unauthorized');
    }
    const currentUserId = user._id;

    // Ensure the chat has a valid name
    if (!args.name.trim()) {
      throw new Error('Chat name cannot be empty');
    }

    // Create the chat
    const now = Date.now();
    const chatId = await ctx.db.insert('chats', {
      name: args.name,
      createdAt: now,
      createdBy: currentUserId,
      updatedAt: now,
    });

    // Add the creator as the first member
    await ctx.db.insert('chatMemberships', {
      chatId,
      userId: currentUserId,
      joinedAt: now,
      role: 'admin', // Optional: Set the role of the creator
    });

    return { chatId };
  },
}); /**
 * Remove a chat (must be the creator)
 */
export const removeChat = mutation({
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

    // Check if user is the creator of the chat
    if (chat.createdBy !== user._id) {
      throw new ConvexError({
        code: 'FORBIDDEN',
        message: 'Only the creator can remove this chat',
      });
    }

    // Delete all messages in the chat first
    const messages = await ctx.db
      .query('messages')
      .withIndex('by_chat', (q) => q.eq('chatId', args.chatId))
      .collect();

    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    // Delete the chat
    await ctx.db.delete(args.chatId);

    return { success: true };
  },
});

/**
 * Rename a chat
 */
export const renameChat = mutation({
  args: {
    chatId: v.id('chats'),
    newName: v.string(),
    ...SessionIdArg,
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args);
    if (!user) {
      throw new Error('Unauthorized');
    }

    // Validate new name
    if (args.newName.trim().length < 1) {
      throw new ConvexError({
        code: 'INVALID_ARGUMENT',
        message: 'Chat name cannot be empty',
      });
    }

    // Get the chat
    const chat = await ctx.db.get(args.chatId);
    if (!chat) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Chat not found',
      });
    }

    // Check if user is a member of the chat by querying chatMemberships
    const membership = await ctx.db
      .query('chatMemberships')
      .withIndex('by_user_chat', (q) => q.eq('userId', user._id).eq('chatId', args.chatId))
      .unique();

    if (!membership) {
      throw new ConvexError({
        code: 'FORBIDDEN',
        message: 'You do not have access to this chat',
      });
    }

    // Update the chat name
    await ctx.db.patch(args.chatId, {
      name: args.newName,
      updatedAt: Date.now(),
    });

    // Create a system message to indicate the rename
    await ctx.db.insert('messages', {
      chatId: args.chatId,
      userId: user._id,
      content: `${user.name} renamed the chat to "${args.newName}"`,
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Send a message in a chat
 */
export const sendMessage = mutation({
  args: {
    chatId: v.id('chats'),
    content: v.string(),
    ...SessionIdArg,
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args);
    if (!user) {
      throw new Error('Unauthorized');
    }

    // Validate message content
    if (args.content.trim().length === 0) {
      throw new ConvexError({
        code: 'INVALID_ARGUMENT',
        message: 'Message cannot be empty',
      });
    }

    // Get the chat
    const chat = await ctx.db.get(args.chatId);
    if (!chat) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Chat not found',
      });
    }

    // Check if user is a member of the chat by querying chatMemberships
    const membership = await ctx.db
      .query('chatMemberships')
      .withIndex('by_user_chat', (q) => q.eq('userId', user._id).eq('chatId', args.chatId))
      .unique();

    if (!membership) {
      throw new ConvexError({
        code: 'FORBIDDEN',
        message: 'You do not have access to this chat',
      });
    }

    // Update the chat's updatedAt field
    const now = Date.now();
    await ctx.db.patch(args.chatId, {
      updatedAt: now,
    });

    // Insert the message
    const messageId = await ctx.db.insert('messages', {
      chatId: args.chatId,
      userId: user._id,
      content: args.content,
      timestamp: now,
    });
    if (args.content.startsWith('/')) {
      // If the message starts with a slash, treat it as a command
      const fullCommand = args.content.slice(1).trim(); // "wiki beans"
      const parts = fullCommand.split(' ');
      const command = parts[0]; // "wiki"
      const commandArgs = parts.slice(1).join(' '); // "beans"

      console.log('Command:', command);
      console.log('Command args:', commandArgs);

      if (command === 'wiki') {
        if (!commandArgs) {
          // Handle case where no topic is provided
          await ctx.db.insert('messages', {
            chatId: args.chatId,
            userId: user._id,
            content: 'Please provide a topic. Usage: /wiki [topic]',
            timestamp: Date.now(),
            type: 'system',
          });
          return messageId;
        }

        await ctx.scheduler.runAfter(0, internal.commands.getWikipediaSummary, {
          topic: commandArgs,
          chatId: args.chatId,
          userId: user._id,
        });
      } else {
        // Handle other commands as needed
      }
    }
    return messageId;
  },
});
export const verifyMembership = internalQuery({
  args: {
    chatId: v.id('chats'),

    userId: v.id('users'),
  },

  handler: async (ctx, args) => {
    return await ctx.db

      .query('chatMemberships')

      .withIndex('by_chat_user', (q) =>
        q
          .eq('chatId', args.chatId)

          .eq('userId', args.userId)
      )

      .unique();
  },
});

export const sendSystemMessage = internalMutation({
  args: {
    chatId: v.id('chats'),

    content: v.string(),
  },

  handler: async (ctx, args) => {
    // Get or create system user (you might want to cache this ID)

    const systemUser = await ctx.db

      .query('users')

      .withIndex('by_username', (q) => q.eq('username', 'system'))

      .unique();

    if (!systemUser) {
      throw new Error('System user not configured');
    }

    await ctx.db.insert('messages', {
      chatId: args.chatId,

      userId: systemUser._id, // Now using proper Id<"users">

      content: args.content,

      timestamp: Date.now(),

      type: 'system',
    });

    await ctx.db.patch(args.chatId, {
      updatedAt: Date.now(),
    });
  },
}); /**

/**
 * Add a user to a chat
 */
export const addMemberToChat = mutation({
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

    // Check if the user to add exists
    const userToAdd = await ctx.db.get(args.userId);
    if (!userToAdd) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'User to add not found',
      });
    }

    // Check if user is already a member
    const existingMembership = await ctx.db
      .query('chatMemberships')
      .withIndex('by_user_chat', (q) => q.eq('userId', args.userId).eq('chatId', args.chatId))
      .unique();

    if (existingMembership) {
      return { success: true, alreadyMember: true };
    }

    // Add the user to the chat by creating a membership record
    const now = Date.now();
    await ctx.db.insert('chatMemberships', {
      chatId: args.chatId,
      userId: args.userId,
      joinedAt: now,
      role: 'viewer', // Default role for new members
    });

    // Update the chat's updatedAt field
    await ctx.db.patch(args.chatId, {
      updatedAt: now,
    });

    // Add a system message
    await ctx.db.insert('messages', {
      chatId: args.chatId,
      userId: user._id,
      content: `${user.name} added ${userToAdd.name} to the chat`,
      timestamp: now,
    });

    return { success: true };
  },
});
// QUERIES //

/**
 * List all chats the current user is a member of
 */
export const listChats = query({
  args: {
    ...SessionIdArg,
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args);
    if (!user) {
      throw new Error('Unauthorized');
    }

    // First get all chat memberships for the user
    const memberships = await ctx.db
      .query('chatMemberships')
      .withIndex('by_user_chat', (q) => q.eq('userId', user._id))
      .collect();

    // Then get all the chats for these memberships
    const chats = await Promise.all(
      memberships.map(async (membership) => {
        const chat = await ctx.db.get(membership.chatId);
        return chat;
      })
    );

    // Filter out any null chats (shouldn't happen if data is consistent)
    const validChats = chats.filter(Boolean) as (Doc<'chats'> & { _id: Id<'chats'> })[];

    // For each chat, get the latest message and member info
    const results = await Promise.all(
      validChats.map(async (chat) => {
        // Get the latest message
        const latestMessage = await ctx.db
          .query('messages')
          .withIndex('by_chat_time', (q) => q.eq('chatId', chat._id))
          .order('desc')
          .first();

        // Get all members of this chat
        const chatMemberships = await ctx.db
          .query('chatMemberships')
          .withIndex('by_chat', (q) => q.eq('chatId', chat._id))
          .collect();

        // Get member information
        const memberInfo = await Promise.all(
          chatMemberships.map(async (membership) => {
            const member = await ctx.db.get(membership.userId);
            return member ? { id: membership.userId, name: member.name } : null;
          })
        );

        // Filter out any null members
        const validMembers = memberInfo.filter(Boolean);

        return {
          id: chat._id,
          name: chat.name,
          createdAt: chat.createdAt,
          updatedAt: chat.updatedAt,
          members: validMembers,
          latestMessage: latestMessage
            ? {
                id: latestMessage._id,
                content: latestMessage.content,
                timestamp: latestMessage.timestamp,
                userId: latestMessage.userId,
              }
            : null,
        };
      })
    );

    // Sort by most recently updated
    return results.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});
/**
 * List messages for a specific chat
 */
export const listMessages = query({
  args: {
    chatId: v.id('chats'),
    limit: v.optional(v.number()),
    before: v.optional(v.number()), // Timestamp for pagination
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

    // Check if user is a member of the chat via chatMemberships
    const membership = await ctx.db
      .query('chatMemberships')
      .withIndex('by_user_chat', (q) => q.eq('userId', user._id).eq('chatId', args.chatId))
      .unique();

    if (!membership) {
      throw new ConvexError({
        code: 'FORBIDDEN',
        message: 'You do not have access to this chat',
      });
    }

    // Set default limit if not provided
    const limit = args.limit ?? 100;

    // Build the query
    // Build the query
    const messagesQuery = ctx.db
      .query('messages')
      .withIndex('by_chat_time', (q) =>
        q.eq('chatId', args.chatId).lt('timestamp', args.before ?? Number.MAX_SAFE_INTEGER)
      )
      .order('desc')
      .take(limit);

    // Execute the query
    const messages = await messagesQuery;

    // Get user information for each message
    const enhancedMessages = await Promise.all(
      messages.map(async (msg) => {
        const sender = await ctx.db.get(msg.userId);

        // Determine message type
        const type = msg.type || 'user'; // Default to user message if type not specified

        return {
          id: msg._id,
          chatId: msg.chatId,
          content: msg.content,
          timestamp: msg.timestamp,
          type,
          sender: sender
            ? {
                id: sender._id,
                name: sender.name,
              }
            : {
                id: msg.userId,
                name: 'Unknown User',
              },
        };
      })
    );

    // Include current user ID with the response for client-side comparison
    const result = {
      messages: enhancedMessages.reverse(), // Return in chronological order (oldest first)
      currentUserId: user._id,
    };

    return result;
  },
});
/** Get details about a specific chat
 */
export const getChatDetails = query({
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

    // Check if user is a member of the chat via chatMemberships
    const membership = await ctx.db
      .query('chatMemberships')
      .withIndex('by_user_chat', (q) => q.eq('userId', user._id).eq('chatId', args.chatId))
      .unique();

    if (!membership) {
      throw new ConvexError({
        code: 'FORBIDDEN',
        message: 'You do not have access to this chat',
      });
    }

    // Get all memberships for this chat
    const chatMemberships = await ctx.db
      .query('chatMemberships')
      .withIndex('by_chat', (q) => q.eq('chatId', args.chatId))
      .collect();

    // Get member information
    const members = await Promise.all(
      chatMemberships.map(async (membership) => {
        const member = await ctx.db.get(membership.userId);
        return member
          ? {
              id: membership.userId,
              name: member.name,
              isCreator: membership.userId === chat.createdBy,
              joinedAt: membership.joinedAt,
            }
          : null;
      })
    );

    // Get creator information
    const creator = await ctx.db.get(chat.createdBy);

    return {
      id: chat._id,
      name: chat.name,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      creator: creator ? { id: creator._id, name: creator.name } : null,
      members: members.filter(Boolean),
      memberCount: members.filter(Boolean).length,
    };
  },
}); /**
 * Remove a member from a chat
 * If no userId is provided, removes the current user
 * If the chat has only one member left after removal, the chat is deleted
 *
 * @param chatId - The ID of the chat
 * @param userId - Optional ID of user to remove (if not provided, removes current user)
 * @returns Object with success flag and whether the chat was deleted
 */
export const removeMember = mutation({
  args: {
    chatId: v.id('chats'),
    userId: v.optional(v.id('users')),
  },
  handler: async (ctx, args) => {
    // Get the current user's ID from the session
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }
    const currentUserId = identity.tokenIdentifier as Id<'users'>;

    // Determine which user to remove (default to current user)
    const userIdToRemove = args.userId || currentUserId;
    const isSelfRemoval = userIdToRemove === currentUserId;
    const now = Date.now();

    // Find the chat
    const chat = await ctx.db.get(args.chatId);
    if (!chat) {
      throw new Error('Chat not found');
    }

    // Check current user's membership
    const currentUserMembership = await ctx.db
      .query('chatMemberships')
      .withIndex('by_user_chat', (q) => q.eq('userId', currentUserId).eq('chatId', args.chatId))
      .unique();

    // If trying to remove another user, check that current user is a member
    if (!isSelfRemoval && !currentUserMembership) {
      throw new Error('You are not authorized to remove users from this chat');
    }

    // Check if user to remove is a member
    const userMembership = await ctx.db
      .query('chatMemberships')
      .withIndex('by_user_chat', (q) => q.eq('userId', userIdToRemove).eq('chatId', args.chatId))
      .unique();

    if (!userMembership) {
      throw new Error('User is not a member of this chat');
    }

    // Remove the membership record
    await ctx.db.delete(userMembership._id);

    // Check if there are any remaining members
    const remainingMembers = await ctx.db
      .query('chatMemberships')
      .withIndex('by_chat', (q) => q.eq('chatId', args.chatId))
      .collect();

    // If no members left, delete the chat and all messages
    if (remainingMembers.length === 0) {
      // Delete all messages first
      const messages = await ctx.db
        .query('messages')
        .withIndex('by_chat', (q) => q.eq('chatId', args.chatId))
        .collect();

      await Promise.all(messages.map((msg) => ctx.db.delete(msg._id)));

      // Delete the chat
      await ctx.db.delete(args.chatId);
      return {
        success: true,
        chatDeleted: true,
      };
    }

    // Update chat's updatedAt timestamp
    await ctx.db.patch(args.chatId, {
      updatedAt: now,
    });

    // Add system message about the removal
    const currentUser = await ctx.db.get(currentUserId);
    const removedUser = await ctx.db.get(userIdToRemove);
    const messageContent = isSelfRemoval
      ? `${removedUser?.name || 'A user'} left the chat`
      : `${currentUser?.name || 'A user'} removed ${removedUser?.name || 'a user'} from the chat`;

    await ctx.db.insert('messages', {
      chatId: args.chatId,
      userId: currentUserId,
      content: messageContent,
      timestamp: now,
    });

    return {
      success: true,
      chatDeleted: false,
    };
  },
});
