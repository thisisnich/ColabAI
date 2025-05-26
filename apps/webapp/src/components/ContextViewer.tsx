// Wider ContextViewer.tsx for desktop
import { api } from '@workspace/backend/convex/_generated/api';
import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import { useSessionMutation, useSessionQuery } from 'convex-helpers/react/sessions';
import { useMutation, useQuery } from 'convex/react';
import { Brain, FileText, Info, Sparkles } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/seperator';

interface ContextViewerProps {
  chatId: Id<'chats'>;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContextViewer({ chatId, isOpen, onOpenChange }: ContextViewerProps) {
  const [isCreatingSummary, setIsCreatingSummary] = useState(false);

  // Fetch context data for preview (only when viewer is open)
  const contextData = useQuery(
    api.chat.getContextMessages,
    isOpen ? { chatId, maxMessages: 50 } : 'skip'
  );

  // Get latest summary info
  const latestSummary = useQuery(
    api.chatSummarization.getLatestSummary,
    isOpen ? { chatId } : 'skip'
  );

  // Mutation for requesting summarization
  const requestSummarization = useSessionMutation(api.chatSummarization.requestSummarization);

  // Format context data for display
  const formatContextForDisplay = () => {
    if (!contextData) return 'Loading context...';

    let content = '';

    // Show summary if available
    if (contextData.summary) {
      content += '=== CONVERSATION SUMMARY ===\n';
      content += `${contextData.summary}\n\n`;
      content += `[This summary covers ${latestSummary?.messageCount || 'unknown'} older messages]\n\n`;
    }

    // Show recent messages
    if (contextData.messages.length > 0) {
      content += `=== RECENT MESSAGES (${contextData.messages.length}) ===\n`;
      contextData.messages.forEach((msg, index) => {
        const timestamp = new Date(msg.timestamp).toLocaleString();
        const sender = msg.type === 'chatbot' ? 'AI Assistant' : msg.sender?.name || 'User';
        content += `[${timestamp}] ${sender}:\n${msg.content}\n\n`;
      });
    }

    // Show context statistics
    content += '=== CONTEXT STATISTICS ===\n';
    content += `Total messages in chat: ${contextData.totalMessageCount || 'Unknown'}\n`;
    content += `Messages in current context: ${contextData.messages.length}\n`;
    content += `Has summary: ${contextData.summary ? 'Yes' : 'No'}\n`;
    content += `Estimated tokens: ${contextData.tokenEstimate || 'Unknown'}\n`;
    content += `Needs summarization: ${contextData.needsSummarization ? 'Yes' : 'No'}\n`;

    return content || 'No context available';
  };

  const getContextStatus = () => {
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
  };

  const handleCreateSummary = async () => {
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
  };

  const contextStatus = getContextStatus();

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] lg:max-w-[1200px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Current Context Data
          </DialogTitle>
          <DialogDescription>
            This is the context data that would be sent to the AI with your next /deepseek command.
          </DialogDescription>
        </DialogHeader>

        {/* Main content area with side-by-side layout */}
        <div className="grid grid-cols-1 xl:grid-cols-[400px_1fr] gap-6">
          {/* Context Status Card - Left side */}
          <div className="space-y-4">
            {contextData && (
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Brain className="w-4 h-4" />
                    Context Status
                    <Badge
                      variant={
                        contextStatus.color === 'green'
                          ? 'default'
                          : contextStatus.color === 'orange'
                            ? 'destructive'
                            : 'secondary'
                      }
                      className="ml-auto"
                    >
                      {contextStatus.status === 'optimized' && (
                        <Sparkles className="w-3 h-3 mr-1" />
                      )}
                      {contextStatus.status === 'needs-summarization' && (
                        <Info className="w-3 h-3 mr-1" />
                      )}
                      {contextStatus.message}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-medium text-muted-foreground">Total Messages</div>
                      <div className="text-lg font-semibold">
                        {contextData.totalMessageCount || 0}
                      </div>
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

                  {/* Summary Info */}
                  {latestSummary && (
                    <>
                      <Separator className="my-3" />
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div>
                          Summary created: {new Date(latestSummary.createdAt).toLocaleString()}
                        </div>
                        <div>
                          Covers {latestSummary.messageCount} messages • Used{' '}
                          {latestSummary.tokensUsed} tokens
                        </div>
                      </div>
                    </>
                  )}

                  {/* Optimization Suggestion */}
                  {contextData.needsSummarization && (
                    <>
                      <Separator className="my-3" />
                      <div className="flex flex-col gap-3">
                        <div className="text-xs bg-orange-50 border border-orange-200 rounded p-2">
                          <div className="font-medium text-orange-800 mb-1">
                            💡 Optimization Tip
                          </div>
                          <div className="text-orange-700">
                            Your context contains many messages. Enable Smart Context Summarization
                            in settings to reduce token usage while maintaining conversation
                            context.
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
            )}
          </div>

          {/* Raw Context Data - Right side (wider on desktop) */}
          <div className="space-y-2">
            <h3 className="font-medium text-sm">Raw Context Data</h3>
            <ScrollArea className="h-[60vh] w-full">
              <div className="p-4 bg-gray-50 rounded-md">
                <pre className="text-sm whitespace-pre-wrap font-mono">
                  {formatContextForDisplay()}
                </pre>
              </div>
            </ScrollArea>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
