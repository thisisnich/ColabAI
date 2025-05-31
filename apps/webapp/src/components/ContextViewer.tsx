// ============================================================================
// ContextViewer.tsx - STANDARDIZED WITH FIXES
// ============================================================================

import { useSessionMutation } from 'convex-helpers/react/sessions';
import { useQuery } from 'convex/react';
import { Brain, Eye, FileText, Info, Loader2, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { api } from '@workspace/backend/convex/_generated/api';
import type { Id } from '@workspace/backend/convex/_generated/dataModel';

import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { DropdownMenuItem } from './ui/dropdown-menu';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/seperator';

interface ContextViewerProps {
  chatId: Id<'chats'>;
}

// ========================================
// Helper Functions
// ========================================
function getContextStatus(contextData: any) {
  if (!contextData) return { status: 'loading', color: 'gray' };

  if (contextData.needsSummarization) {
    return {
      status: 'needs-summarization',
      color: 'orange',
      message: 'Context could be optimized with summarization',
    };
  }

  if (contextData.summary) {
    return {
      status: 'optimized',
      color: 'green',
      message: 'Context is optimized with AI summarization',
    };
  }

  return {
    status: 'normal',
    color: 'blue',
    message: 'Context includes full message history',
  };
}

function getStatusBadgeVariant(color: string) {
  switch (color) {
    case 'green':
      return 'default';
    case 'orange':
      return 'destructive';
    default:
      return 'secondary';
  }
}

// ========================================
// Main Component
// ========================================
export function ContextViewer({ chatId }: ContextViewerProps) {
  // ========================================
  // State Management
  // ========================================
  const [isOpen, setIsOpen] = useState(false);
  const [isCreatingSummary, setIsCreatingSummary] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

  // ========================================
  // Queries
  // ========================================
  const contextData = useQuery(
    api.context.getContextMessages,
    isOpen ? { chatId, maxMessages: 50 } : 'skip'
  );
  const latestSummary = useQuery(
    api.chatSummarization.getLatestSummary,
    isOpen ? { chatId } : 'skip'
  );

  // ========================================
  // Mutations
  // ========================================
  const requestSummarization = useSessionMutation(api.chatSummarization.requestSummarization);

  // ========================================
  // Computed Values
  // ========================================
  const contextStatus = getContextStatus(contextData);

  // ========================================
  // Effect for focus management
  // ========================================
  useEffect(() => {
    if (!isOpen && triggerRef.current) {
      // Small delay to ensure dialog is fully closed
      const timeoutId = setTimeout(() => {
        triggerRef.current?.focus();
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen]);

  // ========================================
  // Event Handlers
  // ========================================
  const handleCreateSummary = useCallback(async () => {
    setIsCreatingSummary(true);
    const toastId = toast.loading('Creating summary...');

    try {
      const result = await requestSummarization({ chatId });
      toast.success(`Summary created for ${result.messageCount} messages`, {
        id: toastId,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create summary', {
        id: toastId,
      });
    } finally {
      setIsCreatingSummary(false);
    }
  }, [chatId, requestSummarization]);

  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);

    // Reset state when closing
    if (!open) {
      setIsCreatingSummary(false);

      // Ensure proper cleanup when closing via Escape key
      setTimeout(() => {
        // Reset any potential focus traps or pointer event blocks
        document.body.style.pointerEvents = '';
        document.body.style.overflow = '';

        // Return focus to trigger element
        if (triggerRef.current) {
          triggerRef.current.focus();
        }
      }, 50);
    }
  }, []);

  const handleTriggerClick = useCallback((e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(true);
  }, []);

  // ========================================
  // Helper Render Functions
  // ========================================
  const formatContextForDisplay = useCallback(() => {
    if (!contextData) return 'Loading context...';

    let content = '';

    if (contextData.summary) {
      content += '=== CONVERSATION SUMMARY ===\n';
      content += `${contextData.summary}\n\n`;
      content += `[This summary covers ${latestSummary?.messageCount || 'unknown'} older messages]\n\n`;
    }

    if (contextData.messages.length > 0) {
      content += `=== RECENT MESSAGES (${contextData.messages.length}) ===\n`;
      for (let i = 0; i < contextData.messages.length; i++) {
        const msg = contextData.messages[i];
        const timestamp = new Date(msg.timestamp).toLocaleString();
        const sender = msg.type === 'chatbot' ? 'AI Assistant' : msg.userInfo?.name || 'User';
        content += `[${timestamp}] ${sender}:\n${msg.content}\n\n`;
      }
    }
    content += '=== CONTEXT STATISTICS ===\n';
    content += `Total messages in chat: ${contextData.totalMessageCount || 'Unknown'}\n`;
    content += `Messages in current context: ${contextData.messages.length}\n`;
    content += `Has summary: ${contextData.summary ? 'Yes' : 'No'}\n`;
    content += `Estimated tokens: ${contextData.tokenEstimate || 'Unknown'}\n`;
    content += `Needs summarization: ${contextData.needsSummarization ? 'Yes' : 'No'}\n`;

    return content || 'No context available';
  }, [contextData, latestSummary]);

  const renderContextStatusCard = () => {
    if (!contextData) return null;

    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Brain className="w-4 h-4" />
            Context Status
            <Badge variant={getStatusBadgeVariant(contextStatus.color)} className="ml-auto">
              {contextStatus.status === 'optimized' && <Sparkles className="w-3 h-3 mr-1" />}
              {contextStatus.status === 'needs-summarization' && <Info className="w-3 h-3 mr-1" />}
              {contextStatus.message}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-medium text-muted-foreground">Total Messages</div>
              <div className="text-lg font-semibold">{contextData.totalMessageCount || 0}</div>
            </div>
            <div>
              <div className="font-medium text-muted-foreground">In Context</div>
              <div className="text-lg font-semibold">{contextData.messages.length}</div>
            </div>
            <div>
              <div className="font-medium text-muted-foreground">Estimated Tokens</div>
              <div className="text-lg font-semibold">{contextData.tokenEstimate || 0}</div>
            </div>
            <div>
              <div className="font-medium text-muted-foreground">Has Summary</div>
              <div className="text-lg font-semibold flex items-center gap-1">
                {contextData.summary ? (
                  <>
                    <Sparkles className="w-4 h-4 text-green-600" />
                    Yes
                  </>
                ) : (
                  'No'
                )}
              </div>
            </div>
          </div>

          {latestSummary && (
            <>
              <Separator className="my-3" />
              <div className="text-xs text-muted-foreground space-y-1">
                <div>Summary created: {new Date(latestSummary.createdAt).toLocaleString()}</div>
                <div>
                  Covers {latestSummary.messageCount} messages • Used {latestSummary.tokensUsed}{' '}
                  tokens
                </div>
              </div>
            </>
          )}

          {contextData.needsSummarization && (
            <>
              <Separator className="my-3" />
              <div className="flex flex-col gap-3">
                <div className="text-xs bg-orange-50 border border-orange-200 rounded p-2">
                  <div className="font-medium text-orange-800 mb-1">💡 Optimization Tip</div>
                  <div className="text-orange-700">
                    Your context contains many messages. Enable Smart Context Summarization in
                    settings to reduce token usage while maintaining conversation context.
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={handleCreateSummary}
                  disabled={isCreatingSummary}
                  className="w-fit"
                >
                  {isCreatingSummary ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating Summary...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Create New Summary Now
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderRawContextData = () => (
    <div className="space-y-2">
      <h3 className="font-medium text-sm">Raw Context Data</h3>
      <ScrollArea className="h-[60vh] w-full">
        <div className="p-4 bg-secondary/50 rounded-lg">
          <pre className="text-sm whitespace-pre-wrap font-mono">{formatContextForDisplay()}</pre>
        </div>
      </ScrollArea>
    </div>
  );

  // ========================================
  // Main Render
  // ========================================
  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange} modal={true}>
      <DialogTrigger asChild>
        <div ref={triggerRef}>
          <DropdownMenuItem onSelect={handleTriggerClick}>
            <Eye className="w-4 h-4 mr-2" />
            View Context
          </DropdownMenuItem>
        </div>
      </DialogTrigger>

      <DialogContent
        className="sm:max-w-[90vw] lg:max-w-[1200px] max-h-[90vh]"
        onInteractOutside={(e) => {
          // Prevent closing on interaction with other elements
          if (isCreatingSummary) {
            e.preventDefault();
          }
        }}
        onEscapeKeyDown={(e) => {
          // Handle escape key properly
          if (!isCreatingSummary) {
            setIsOpen(false);
          } else {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Current Context Data
          </DialogTitle>
          <DialogDescription>
            This is the context data that would be sent to the AI with your next /deepseek command.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="grid grid-cols-1 xl:grid-cols-[400px_1fr] gap-6">
            <div className="space-y-4">{renderContextStatusCard()}</div>
            {renderRawContextData()}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={() => setIsOpen(false)} autoFocus={false}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
