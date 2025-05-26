// ============================================================================
// ChatInvite.tsx - STANDARDIZED
// ============================================================================

import { useSessionMutation, useSessionQuery } from 'convex-helpers/react/sessions';
import { CopyIcon, Loader2, UserPlus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { api } from '@workspace/backend/convex/_generated/api';
import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import { formatLoginCode } from '@workspace/backend/modules/auth/codeUtils';

import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';

interface ChatInviteProps {
  chatId: Id<'chats'>;
}

export function ChatInvite({ chatId }: ChatInviteProps) {
  // ========================================
  // State Management
  // ========================================
  const [isOpen, setIsOpen] = useState(false);
  const [joinCode, setJoinCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [hasShownExpiredNotification, setHasShownExpiredNotification] = useState(false);

  // ========================================
  // Queries
  // ========================================
  const activeCodeQuery = useSessionQuery(api.invite.getActiveChatJoinCode, { chatId });

  // ========================================
  // Mutations
  // ========================================
  const createChatJoinCode = useSessionMutation(api.invite.createJoinCode);

  // ========================================
  // Helper Functions
  // ========================================
  const getTimeRemaining = useCallback((): string => {
    if (!expiresAt) return '';

    const timeLeft = Math.max(0, expiresAt - Date.now());
    const minutes = Math.floor(timeLeft / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [expiresAt]);

  // ========================================
  // Event Handlers
  // ========================================
  const handleGenerateCode = useCallback(async () => {
    setIsGenerating(true);
    try {
      const result = await createChatJoinCode({ chatId });

      if (result.success && result.code !== undefined && result.expiresAt !== undefined) {
        setJoinCode(result.code);
        setExpiresAt(result.expiresAt);
        setTimeRemaining(getTimeRemaining());
        toast.success('Join code generated successfully');
      } else {
        toast.error(result.message || 'Failed to generate join code');
      }
    } catch (error) {
      console.error('Error generating join code:', error);
      toast.error('An error occurred while generating join code');
    } finally {
      setIsGenerating(false);
    }
  }, [chatId, createChatJoinCode, getTimeRemaining]);

  const handleCopyCode = useCallback(() => {
    if (!joinCode) return;

    navigator.clipboard
      .writeText(formatLoginCode(joinCode))
      .then(() => toast.success('Join code copied to clipboard!'))
      .catch(() => toast.error('Failed to copy code.'));
  }, [joinCode]);

  // ========================================
  // Effects
  // ========================================
  useEffect(() => {
    if (!activeCodeQuery) return;

    if (activeCodeQuery.success && activeCodeQuery.code && activeCodeQuery.expiresAt) {
      if (joinCode !== activeCodeQuery.code) {
        setJoinCode(activeCodeQuery.code);
        setExpiresAt(activeCodeQuery.expiresAt);
        setHasShownExpiredNotification(false);
      }
    } else {
      if (joinCode) {
        setJoinCode(null);
        setExpiresAt(null);

        if (activeCodeQuery.reason === 'no_active_code' && !hasShownExpiredNotification) {
          toast.info('Your chat join code was used or has expired');
          setHasShownExpiredNotification(true);
        }
      }
    }
  }, [activeCodeQuery, joinCode, hasShownExpiredNotification]);

  useEffect(() => {
    if (!expiresAt) return;

    const interval = setInterval(() => {
      const remaining = getTimeRemaining();
      setTimeRemaining(remaining);

      if (remaining === '0:00') {
        clearInterval(interval);
        setJoinCode(null);
        setExpiresAt(null);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, getTimeRemaining]);

  // ========================================
  // Main Render
  // ========================================
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          <span>Invite</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite to Chat</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {joinCode ? (
            <div className="space-y-4">
              <div className="p-4 bg-secondary/50 rounded-lg text-center">
                <p className="text-sm text-muted-foreground mb-1">Chat join code:</p>
                <p className="text-3xl font-mono font-bold tracking-wider" aria-live="polite">
                  {formatLoginCode(joinCode)}
                </p>
                <p className="text-sm text-muted-foreground mt-2" aria-live="polite">
                  Valid for {timeRemaining}
                </p>
              </div>

              <div className="flex justify-between gap-2">
                <Button variant="secondary" onClick={handleGenerateCode} disabled={isGenerating}>
                  Generate New Code
                </Button>
                <Button variant="outline" onClick={handleCopyCode}>
                  <CopyIcon className="h-4 w-4 mr-2" />
                  Copy Code
                </Button>
              </div>

              <p className="text-sm text-muted-foreground">
                Share this code with someone to give them access to this chat. The code is valid for
                1 minute.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Generate a temporary join code to invite someone to this chat. The code will be
                valid for 1 minute.
              </p>
              <Button onClick={handleGenerateCode} disabled={isGenerating} className="w-full">
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  'Generate Join Code'
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
