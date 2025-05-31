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
// ChatView.tsx - STANDARDIZED WITH MessageInput - MOBILE OPTIMIZED
// ============================================================================

import { useSessionMutation, useSessionQuery } from 'convex-helpers/react/sessions';
import { useEffect, useRef, useState } from 'react';

import { api } from '@workspace/backend/convex/_generated/api';
import type { Id } from '@workspace/backend/convex/_generated/dataModel';

import { ChatInvite } from './ChatInvite';
import { ChatSettings } from './ChatSettings';
import { ContextSettings } from './ContextSettings';
import { ContextViewer } from './ContextViewer';
import { FormattedMessageDisplay } from './MessageDisplay';
import { MessageInput } from './MessageInput';

import { Menu } from 'lucide-react';
import { useUserType } from '../lib/useUserTypes';
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
  // State & Refs
  // ========================================
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

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
  // Mobile Keyboard Handling - Enhanced
  // ========================================
  useEffect(() => {
    if (!isMobile) return;

    let initialViewportHeight = 0;
    let lastHeight = 0;

    const handleResize = () => {
      const currentHeight = window.visualViewport?.height || window.innerHeight;
      const windowHeight = window.screen.height || window.innerHeight;

      if (initialViewportHeight === 0) {
        initialViewportHeight = currentHeight;
      }

      const heightDifference = initialViewportHeight - currentHeight;
      const keyboardThreshold = 150; // Minimum height difference to consider keyboard open

      const keyboardOpen = heightDifference > keyboardThreshold;
      const newKeyboardHeight = keyboardOpen ? heightDifference : 0;

      // Only update if there's a significant change
      if (Math.abs(lastHeight - newKeyboardHeight) > 10) {
        setKeyboardHeight(newKeyboardHeight);
        setIsKeyboardVisible(keyboardOpen);
        lastHeight = newKeyboardHeight;
      }
    };

    const handleViewportChange = () => {
      // Use a small delay to ensure viewport has stabilized
      setTimeout(handleResize, 50);
    };

    // Set initial height
    if (window.visualViewport) {
      initialViewportHeight = window.visualViewport.height;
      window.visualViewport.addEventListener('resize', handleViewportChange);
    } else {
      initialViewportHeight = window.innerHeight;
      window.addEventListener('resize', handleResize);
    }

    // Initial check
    handleResize();

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportChange);
      } else {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, [isMobile]);

  // ========================================
  // Event Handlers
  // ========================================
  const handleSendMessage = async (content: string, files?: ProcessedFileAttachment[]) => {
    if ((!content.trim() && !files?.length) || !canSendMessages) return;

    try {
      await sendMessage({
        chatId,
        content,
        files,
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  };

  // ========================================
  // Auto-scroll Effects - Enhanced
  // ========================================
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  });

  // Enhanced keyboard scroll handling
  useEffect(() => {
    if (isMobile && messagesEndRef.current && isKeyboardVisible) {
      const timer = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'end',
          inline: 'nearest',
        });
      }, 150);
      return () => clearTimeout(timer);
    }
  });

  // ========================================
  // Early Returns
  // ========================================
  if (isForbidden) {
    return (
      <div className="flex flex-col h-full min-h-0">
        <div className="border-b p-3 sm:p-4 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center flex-1 min-w-0">
            <div className="min-w-0">
              <h2 className="font-semibold text-lg truncate">Chat Access Denied</h2>
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-4 sm:p-8 min-h-0">
          <div className="text-center space-y-4 max-w-md px-4">
            <div className="text-4xl sm:text-6xl">🚫</div>
            <h3 className="text-lg sm:text-xl font-semibold text-muted-foreground">
              No Access to This Chat
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground">
              You no longer have access to this chat. You may have left the chat or been removed by
              an administrator.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row gap-2 sm:space-x-2 sm:justify-center">
              <Button
                variant="outline"
                onClick={() => window.history.back()}
                className="w-full sm:w-auto"
              >
                Go Back
              </Button>
              <Button
                onClick={() => {
                  window.location.href = '/';
                }}
                className="w-full sm:w-auto"
              >
                Go to Home
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-6 sm:h-8 w-48 sm:w-64" />
        <Skeleton className="h-48 sm:h-64 w-full" />
      </div>
    );
  }

  // ========================================
  // Main Render - Enhanced Mobile Support
  // ========================================
  return (
    <div
      className="flex flex-col h-full min-h-0 overflow-hidden relative"
      style={{
        // Enhanced viewport handling for mobile keyboards
        height: isMobile && keyboardHeight > 0 ? `calc(100vh - ${keyboardHeight}px)` : '100vh',
        maxHeight: isMobile && keyboardHeight > 0 ? `calc(100vh - ${keyboardHeight}px)` : '100vh',
      }}
    >
      {/* Header - Enhanced Mobile Layout */}
      <div className="border-b p-2 sm:p-4 flex items-center justify-between flex-shrink-0 bg-background sticky top-0 z-10 mt-16">
        {/* Mobile: Show sidebar toggle button with better touch target */}
        {isMobile && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleSidebar}
            className="p-2 mr-2 flex-shrink-0 h-10 w-10 touch-manipulation "
            aria-label="Toggle sidebar"
          >
            <Menu className="w-5 h-5" />
          </Button>
        )}

        {/* Chat Title - Enhanced Mobile Typography */}
        <div className="flex-1 min-w-0 text-center sm:text-left px-2">
          <h2 className="font-semibold text-sm sm:text-lg truncate leading-tight">
            {chatDetails?.name}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground truncate leading-tight">
            {chatDetails?.memberCount} member{chatDetails?.memberCount !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Options Menu - Better Mobile Touch Target */}
        <div className="flex-shrink-0 ml-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs sm:text-sm font-medium px-2 sm:px-3 h-10 sm:h-8 min-w-[44px] touch-manipulation"
              >
                <span className="hidden sm:inline">Options</span>
                <svg
                  className="sm:hidden w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <title>More options</title>
                  <circle cx="12" cy="12" r="1" />
                  <circle cx="19" cy="12" r="1" />
                  <circle cx="5" cy="12" r="1" />
                </svg>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 sm:w-56">
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

      {/* Messages Container - Enhanced Mobile Scrolling */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 relative"
        style={{
          // Enhanced scroll behavior for mobile
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
          scrollbarWidth: 'thin',
          // Adjust for keyboard on mobile
          paddingBottom: isMobile && isKeyboardVisible ? '20px' : '0px',
        }}
      >
        <div className="p-2 sm:p-4 space-y-2 sm:space-y-4 pb-4">
          {messages.length === 0 ? (
            <div className="text-center py-8 px-4 flex items-center justify-center min-h-[200px]">
              <p className="text-muted-foreground text-sm sm:text-base max-w-sm leading-relaxed">
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
      </div>

      {/* Message Input - Enhanced Mobile Support */}
      {canSendMessages ? (
        <div
          className="border-t bg-background flex-shrink-0 sticky bottom-0 z-20"
          style={{
            // Ensure input stays above keyboard on mobile
            transform:
              isMobile && keyboardHeight > 0
                ? `translateY(-${Math.min(keyboardHeight * 0.1, 20)}px)`
                : 'none',
          }}
        >
          <MessageInput
            onSendMessage={handleSendMessage}
            placeholder={
              isMobile ? 'Type a message...' : 'Type a message... (Shift+Enter for new line)'
            }
            isMobile={isMobile}
          />
        </div>
      ) : (
        <div className="border-t p-3 bg-muted/50 flex-shrink-0 sticky bottom-0">
          <div className="text-center text-xs sm:text-sm text-muted-foreground py-2">
            You have view-only access to this chat
          </div>
        </div>
      )}
    </div>
  );
}
