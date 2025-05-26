import { v } from 'convex/values';
import { api, internal } from './_generated/api';
import { internalAction } from './_generated/server';

export const getWikipediaSummary = internalAction({
  args: {
    topic: v.string(),
    chatId: v.id('chats'),
    userId: v.id('users'), // Track who initiated the command
  },
  handler: async (ctx, args) => {
    try {
      // First verify the user is still a member of the chat
      const membership = await ctx.runQuery(internal.chat.verifyMembership, {
        chatId: args.chatId,
        userId: args.userId,
      });

      if (!membership) {
        await ctx.runMutation(internal.chat.sendSystemMessage, {
          chatId: args.chatId,
          content: 'Could not fetch Wikipedia summary: User no longer has access to this chat.',
        });
        return;
      }

      // Fetch Wikipedia summary
      const response = await fetch(
        `https://en.wikipedia.org/w/api.php?${new URLSearchParams({
          format: 'json',
          action: 'query',
          prop: 'extracts',
          exintro: '1',
          explaintext: '1',
          redirects: '1',
          titles: args.topic,
        })}`
      );

      if (!response.ok) {
        throw new Error(`Wikipedia API request failed: ${response.status}`);
      }

      const data = await response.json();
      const summary = getSummaryFromJSON(data);

      // Post the summary back to the chat
      await ctx.runMutation(internal.chat.sendSystemMessage, {
        chatId: args.chatId,
        content: `Wikipedia summary for "${args.topic}":\n\n${summary || 'No summary found'}`,
      });
    } catch (error) {
      console.error('Failed to get Wikipedia summary:', error);
      await ctx.runMutation(internal.chat.sendSystemMessage, {
        chatId: args.chatId,
        content: `Failed to get Wikipedia summary for "${args.topic}"`,
      });
    }
  },
});

interface WikipediaResponse {
  query: {
    pages: {
      [key: string]: {
        extract?: string;
      };
    };
  };
}

function getSummaryFromJSON(data: WikipediaResponse): string {
  try {
    const pages = data.query.pages;
    const firstPageId = Object.keys(pages)[0];

    // Handle missing page (pageId -1 means not found)
    if (firstPageId === '-1') {
      return 'No information found on this topic.';
    }

    const extract = pages[firstPageId].extract;
    if (!extract) return 'No summary available.';

    // Truncate very long summaries to avoid hitting message length limits
    return extract.length > 2000 ? `${extract.substring(0, 2000)}... [truncated]` : extract;
  } catch (error) {
    console.error('Failed to parse Wikipedia response:', error);
    return 'Could not parse Wikipedia response.';
  }
}
