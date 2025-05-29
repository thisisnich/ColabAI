import { SessionIdArg } from 'convex-helpers/server/sessions';
import { v } from 'convex/values';
import { ConvexError } from 'convex/values';
import { getAuthUser } from '../modules/auth/getAuthUser';
import { api, internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import { mutation, query } from './_generated/server';
import { internalMutation, internalQuery } from './_generated/server';

/**
 * Send a message in a chat
 */
// Updated sendMessage mutation with file attachment support

// File attachment schema that matches your FileProcessor output
const FileAttachmentSchema = v.object({
  id: v.string(),
  name: v.string(),
  language: v.string(),
  content: v.string(),
  metadata: v.object({
    size: v.number(),
    lines: v.number(),
    estimatedTokens: v.number(),
    fileType: v.string(),
  }),
});

export const sendMessage = mutation({
  args: {
    chatId: v.id('chats'),
    content: v.string(),
    files: v.optional(v.array(FileAttachmentSchema)),
    ...SessionIdArg,
  },
  handler: async (ctx, args) => {
    // Get authenticated user (assuming getAuthUser function exists)
    const user = await getAuthUser(ctx, args);
    if (!user) {
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    // Validate message content - require either content or files
    const hasContent = args.content && args.content.trim().length > 0;
    const hasFiles = args.files && args.files.length > 0;

    if (!hasContent && !hasFiles) {
      throw new ConvexError({
        code: 'INVALID_ARGUMENT',
        message: 'Message must have either content or file attachments',
      });
    }

    // Validate file attachments if provided
    if (args.files && args.files.length > 0) {
      const maxFiles = 10;
      const maxFileSize = 5 * 1024 * 1024; // 5MB per file
      const maxTotalSize = 25 * 1024 * 1024; // 25MB total

      if (args.files.length > maxFiles) {
        throw new ConvexError({
          code: 'INVALID_ARGUMENT',
          message: `Too many files. Maximum ${maxFiles} files allowed.`,
        });
      }

      let totalSize = 0;
      const fileNames = new Set();

      for (const file of args.files) {
        // Check individual file size
        if (file.metadata.size > maxFileSize) {
          throw new ConvexError({
            code: 'INVALID_ARGUMENT',
            message: `File "${file.name}" is too large. Maximum 5MB per file.`,
          });
        }

        // Check for duplicate file names
        if (fileNames.has(file.name)) {
          throw new ConvexError({
            code: 'INVALID_ARGUMENT',
            message: `Duplicate file name: "${file.name}". File names must be unique.`,
          });
        }
        fileNames.add(file.name);

        // Accumulate total size
        totalSize += file.metadata.size;

        // Validate file content isn't empty
        if (!file.content || file.content.trim().length === 0) {
          throw new ConvexError({
            code: 'INVALID_ARGUMENT',
            message: `File "${file.name}" appears to be empty.`,
          });
        }
      }

      // Check total size limit
      if (totalSize > maxTotalSize) {
        throw new ConvexError({
          code: 'INVALID_ARGUMENT',
          message: 'Total file size too large. Maximum 25MB total allowed.',
        });
      }
    }

    // Get and validate chat exists
    const chat = await ctx.db.get(args.chatId);
    if (!chat) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Chat not found',
      });
    }

    // Check user membership in chat
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

    // Update chat's last activity timestamp
    const now = Date.now();
    await ctx.db.patch(args.chatId, {
      updatedAt: now,
    });

    // Prepare file attachments for storage
    const processedFiles = args.files?.map((file) => ({
      id: file.id,
      name: file.name,
      language: file.language || 'text', // Default to 'text' if no language specified
      content: file.content,
      metadata: {
        size: file.metadata.size,
        lines: file.metadata.lines || 0,
        estimatedTokens: file.metadata.estimatedTokens || 0,
        fileType: file.metadata.fileType,
        uploadedAt: now, // Add upload timestamp
      },
    }));

    // Insert the message
    const messageId = await ctx.db.insert('messages', {
      chatId: args.chatId,
      userId: user._id,
      content: args.content || '', // Default to empty string if no content
      timestamp: now,
      files: processedFiles,
      // Add message type for better categorization
      type: hasFiles && !hasContent ? 'file-only' : 'message',
    });

    // Handle commands (only if there's text content)
    if (hasContent && args.content.startsWith('/')) {
      const fullCommand = args.content.slice(1).trim();
      const parts = fullCommand.split(' ');
      const command = parts[0].toLowerCase(); // Make command case-insensitive
      const commandArgs = parts.slice(1).join(' ');

      console.log('Processing command:', command, 'with args:', commandArgs);

      try {
        switch (command) {
          case 'wiki':
            if (!commandArgs) {
              await ctx.db.insert('messages', {
                chatId: args.chatId,
                userId: user._id,
                content: 'Please provide a topic. Usage: /wiki [topic]',
                timestamp: Date.now(),
                type: 'system',
              });
            } else {
              await ctx.scheduler.runAfter(0, internal.commands.getWikipediaSummary, {
                topic: commandArgs,
                chatId: args.chatId,
                userId: user._id,
              });
            }
            break;

          case 'deepseek':
            if (!commandArgs) {
              await ctx.db.insert('messages', {
                chatId: args.chatId,
                userId: user._id,
                content: 'Please provide a prompt. Usage: /deepseek [prompt]',
                timestamp: Date.now(),
                type: 'system',
              });
            } else {
              await ctx.scheduler.runAfter(0, internal.commands.getDeepSeekResponse, {
                prompt: commandArgs,
                chatId: args.chatId,
                userId: user._id,
              });
            }
            break;

          case 'deeptest':
            await ctx.scheduler.runAfter(0, internal.commands.getDeepSeekResponse, {
              prompt: 'Respond with just the word "success" if this works',
              chatId: args.chatId,
              userId: user._id,
            });
            break;

          default:
            // Unknown command - could optionally add a help message
            console.log('Unknown command:', command);
            break;
        }
      } catch (error) {
        console.error('Error processing command:', error);
        await ctx.db.insert('messages', {
          chatId: args.chatId,
          userId: user._id,
          content: 'Error processing command. Please try again.',
          timestamp: Date.now(),
          type: 'system',
        });
      }
    }

    // If files were attached, you might want to trigger additional processing
    if (hasFiles) {
      console.log(`Message ${messageId} created with ${args.files?.length || 0} file attachments`);

      // Optional: Schedule background processing for file indexing, search, etc.
      // await ctx.scheduler.runAfter(0, internal.files.processAttachments, {
      //   messageId,
      //   files: processedFiles,
      // });
    }

    return messageId;
  },
});
export const sendChatbotMessage = internalMutation({
  args: {
    chatId: v.id('chats'),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    // Get or create chatbot user (you might want to cache this ID)
    let chatbotUser = await ctx.db
      .query('users')
      .withIndex('by_username', (q) => q.eq('username', 'deepseek-bot'))
      .unique();

    // Create chatbot user if it doesn't exist
    if (!chatbotUser) {
      const chatbotUserId = await ctx.db.insert('users', {
        username: 'deepseek-bot',
        name: 'DeepSeek AI',
        type: 'chatbot', // Assuming you have a type field to distinguish user types
        // add other required user fields as needed
      });
      chatbotUser = await ctx.db.get(chatbotUserId);
    }

    if (!chatbotUser) {
      throw new Error('Could not create or find chatbot user');
    }

    await ctx.db.insert('messages', {
      chatId: args.chatId,
      userId: chatbotUser._id,
      content: args.content,
      timestamp: Date.now(),
      type: 'chatbot',
    });

    await ctx.db.patch(args.chatId, {
      updatedAt: Date.now(),
    });
  },
});
