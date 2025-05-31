// ============================================================================
// STANDARDIZED COMPONENT PATTERNS
// ============================================================================

// 1. Import order: external libraries → internal APIs → components → UI → types
// 2. Consistent interface naming: ComponentNameProps
// 3. Standardized state management patterns
// 4. Consistent error handling and loading states
// 5. Unified dialog/modal patterns
// 6. Consistent button and action patterns

// ============================================================================
// ChatView.tsx - STANDARDIZED WITH MessageInput
// ============================================================================

import { useSessionMutation, useSessionQuery } from 'convex-helpers/react/sessions';
import { useEffect, useRef } from 'react';

import { api } from '@workspace/backend/convex/_generated/api';
import type { Id } from '@workspace/backend/convex/_generated/dataModel';

import { ChatInvite } from './ChatInvite';
import { ChatSettings } from './ChatSettings';
import { ContextSettings } from './ContextSettings';
import { ContextViewer } from './ContextViewer';
import { FormattedMessageDisplay } from './MessageDisplay';
import { MessageInput } from './MessageInput';

import { useUserType } from '../lib/useUserTypes'; // Assuming this is the correct path
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Skeleton } from './ui/skeleton';

interface ChatViewProps {
  chatId: Id<'chats'>;
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
  isMobile: boolean;
}

interface ProcessedFileAttachment {
  id: string;
  name: string;
  language: string;
  content: string;
  metadata: {
    size: number;
    lines: number;
    estimatedTokens: number;
    fileType: string;
  };
}

export function ChatView({ chatId, onToggleSidebar, sidebarOpen, isMobile }: ChatViewProps) {
  // ========================================
  // Refs
  // ========================================
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ========================================
  // Queries
  // ========================================
  const { isFullUser } = useUserType();

  const chatResult = useSessionQuery(api.chat.getChatDetails, { chatId });
  const messagesResult = useSessionQuery(api.chat.listMessages, { chatId });
  const currentUserRole = useSessionQuery(api.settings.getCurrentUserRole, { chatId });
  const memberRoles = useSessionQuery(api.settings.getChatMemberRoles, { chatId });

  // ========================================
  // Mutations
  // ========================================
  const sendMessage = useSessionMutation(api.messages.sendMessage);

  // ========================================
  // Computed Values
  // ========================================
  const isLoading = !chatResult || !messagesResult || !currentUserRole;
  const isForbidden = chatResult === null || messagesResult === null || currentUserRole === null;
  const chatDetails = chatResult;
  const messages = messagesResult?.messages || [];
  const currentUserId = messagesResult?.currentUserId;
  const canSendMessages = currentUserRole?.canSendMessages ?? false;

  // ========================================
  // Event Handlers
  // ========================================
  const handleSendMessage = async (content: string, files?: ProcessedFileAttachment[]) => {
    if ((!content.trim() && !files?.length) || !canSendMessages) return;

    try {
      await sendMessage({
        chatId,
        content,
        files, // ✅ Now passing files to the backend!
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error; // Re-throw to let MessageInput handle the error state
    }
  };

  // ========================================
  // Effects
  // ========================================
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  });

  // ========================================
  // Early Returns
  // ========================================
  if (isForbidden) {
    return (
      <div className="flex flex-col h-full">
        <div className="border-b p-3 flex justify-between items-center">
          <div className="flex items-center flex-1">
            <div>
              <h2 className="font-semibold text-lg">Chat Access Denied</h2>
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-4 max-w-md">
            <div className="text-6xl">🚫</div>
            <h3 className="text-xl font-semibold text-muted-foreground">No Access to This Chat</h3>
            <p className="text-muted-foreground">
              You no longer have access to this chat. You may have left the chat or been removed by
              an administrator.
            </p>
            <div className="pt-4 space-x-2">
              <Button variant="outline" onClick={() => window.history.back()}>
                Go Back
              </Button>
              {/* biome-ignore lint/suspicious/noAssignInExpressions: ?? */}
              <Button onClick={() => (window.location.href = '/')}>Go to Home</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // ========================================
  // Main Render
  // ========================================
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-3 flex justify-between items-center relative flex-wrap gap-2 sm:flex-nowrap">
        <div className={`${isMobile ? 'invisible' : 'visible'} flex items-center flex-1 min-w-0`}>
          <div className="truncate">
            <h2 className="font-semibold text-lg truncate">{chatDetails?.name}</h2>
            <p className="text-sm text-muted-foreground">{chatDetails?.memberCount} members</p>
          </div>
        </div>

        {isMobile && (
          <div className="absolute left-0 right-0 mx-auto w-fit text-center pointer-events-none z-0">
            <h2 className="font-semibold text-lg">{chatDetails?.name}</h2>
            <p className="text-sm text-muted-foreground">{chatDetails?.memberCount} members</p>
          </div>
        )}

        <div className="flex items-center gap-2 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="text-sm font-medium">
                Options
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Chat Options</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(currentUserRole?.role === 'admin' || currentUserRole?.role === 'creator') && (
                <ChatInvite chatId={chatId} />
              )}
              <ChatSettings chatId={chatId} />
              {isFullUser && (
                <>
                  <DropdownMenuSeparator />
                  <ContextSettings chatId={chatId} />
                  <ContextViewer chatId={chatId} />
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              No messages yet. Send a message to start the conversation.
            </p>
          </div>
        ) : (
          <FormattedMessageDisplay
            messages={messages}
            currentUserId={currentUserId || ''}
            memberRoles={memberRoles}
            messagesEndRef={messagesEndRef}
          />
        )}
      </div>

      {/* Message Input */}
      {canSendMessages ? (
        <MessageInput
          onSendMessage={handleSendMessage}
          placeholder="Type a message... (Shift+Enter for new line)"
        />
      ) : (
        <div className="border-t p-3 bg-muted/50">
          <div className="text-center text-sm text-muted-foreground py-2">
            You have view-only access to this chat
          </div>
        </div>
      )}
    </div>
  );
}
