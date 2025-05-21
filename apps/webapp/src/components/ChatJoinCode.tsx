import { api } from '@workspace/backend/convex/_generated/api';
import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import { formatLoginCode } from '@workspace/backend/modules/auth/codeUtils';
import { useSessionMutation, useSessionQuery } from 'convex-helpers/react/sessions';
import { CopyIcon, Loader2, UserPlus, UsersRound } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';

interface ChatJoinCodeProps {
  chatId: Id<'chats'>;
}

export function ChatJoinCode({ chatId }: ChatJoinCodeProps) {
  // State
  const [joinCode, setJoinCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [inputCode, setInputCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Mutations
  const createChatJoinCode = useSessionMutation(api.invite.createJoinCode);
  const joinChatWithCode = useSessionMutation(api.invite.joinChatWithCode);
  const activeCodeQuery = useSessionQuery(api.invite.getActiveChatJoinCode, { chatId });

  // Function to calculate time remaining
  const getTimeRemaining = useCallback((): string => {
    if (!expiresAt) return '';

    const timeLeft = Math.max(0, expiresAt - Date.now());
    const minutes = Math.floor(timeLeft / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [expiresAt]);

  // Keep join code synced with active code from backend
  useEffect(() => {
    if (!activeCodeQuery) return;

    if (activeCodeQuery.success && activeCodeQuery.code && activeCodeQuery.expiresAt) {
      // We have an active code
      if (joinCode !== activeCodeQuery.code) {
        setJoinCode(activeCodeQuery.code);
        setExpiresAt(activeCodeQuery.expiresAt);
      }
    } else {
      // No active code or code was consumed
      if (joinCode) {
        setJoinCode(null);
        setExpiresAt(null);

        // Only show notification if we had a code before
        if (activeCodeQuery.reason === 'no_active_code') {
          toast.info('Your chat join code was used or has expired');
        }
      }
    }
  }, [activeCodeQuery, joinCode]);

  // Update timer every second
  useEffect(() => {
    if (!expiresAt) return;

    const interval = setInterval(() => {
      const remaining = getTimeRemaining();
      setTimeRemaining(remaining);

      // If expired, clear the code
      if (remaining === '0:00') {
        clearInterval(interval);
        setJoinCode(null);
        setExpiresAt(null);
        toast.info('Your chat join code has expired');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, getTimeRemaining]);

  // Handle code generation
  const handleGenerateCode = useCallback(async () => {
    setIsGenerating(true);
    try {
      const result = await createChatJoinCode({ chatId });
      if (result.success && result.code && result.expiresAt) {
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
  // Format code as user types (add dash after 4 characters)
  const handleCodeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (value.length <= 8) {
      if (value.length <= 4) {
        setInputCode(value);
      } else {
        const formattedCode = `${value.slice(0, 4)}-${value.slice(4, 8)}`;
        setInputCode(formattedCode);
      }
    }
  }, []);

  // Handle joining chat with code
  const handleJoinChat = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // Validate code format
      const cleanCode = inputCode.replace(/-/g, '');
      if (cleanCode.length !== 8) {
        setJoinError('Please enter a valid 8-character join code');
        return;
      }

      setIsJoining(true);
      setJoinError(null);

      try {
        const result = await joinChatWithCode({ code: cleanCode });

        if (result.success) {
          toast.success('Successfully joined chat');
          setJoinDialogOpen(false);
          setInputCode('');
        } else {
          setJoinError(result.message || 'Failed to join chat');
          toast.error(result.message || 'Failed to join chat');
        }
      } catch (error) {
        console.error('Failed to join chat:', error);
        setJoinError('An unexpected error occurred. Please try again.');
        toast.error('Failed to join chat. Please try again.');
      } finally {
        setIsJoining(false);
      }
    },
    [inputCode, joinChatWithCode]
  );

  // Handle copy code to clipboard
  const handleCopyCode = useCallback(() => {
    if (joinCode) {
      navigator.clipboard
        .writeText(formatLoginCode(joinCode))
        .then(() => {
          toast.success('Join code copied to clipboard!');
        })
        .catch((err) => {
          console.error('Failed to copy text: ', err);
          toast.error('Failed to copy code.');
        });
    }
  }, [joinCode]);

  // Generate/Join Code Dialog
  return (
    <>
      {/* Generate Code Dialog */}
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" title="Invite to chat">
            <UserPlus className="h-4 w-4" />
            <span className="sr-only">Invite to Chat</span>
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

                <div className="flex justify-between">
                  <Button variant="secondary" onClick={handleGenerateCode} disabled={isGenerating}>
                    Generate New Code
                  </Button>
                  <Button variant="outline" onClick={handleCopyCode}>
                    <CopyIcon className="h-4 w-4 mr-2" />
                    Copy Code
                  </Button>
                </div>

                <p className="text-sm text-muted-foreground">
                  Share this code with someone to give them access to this chat. The code is valid
                  for 1 minute.
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
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
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

      {/* Join Chat Dialog */}
      <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" title="Join a chat">
            <UsersRound className="h-4 w-4" />
            <span className="sr-only">Join a Chat</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Join a Chat</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleJoinChat} className="space-y-4 py-4">
            <div>
              <Input
                type="text"
                placeholder="XXXX-XXXX"
                value={inputCode}
                onChange={handleCodeChange}
                className="text-center font-mono text-lg tracking-wider"
                maxLength={9} // 8 characters + 1 dash
                autoComplete="off"
                disabled={isJoining}
                aria-label="Enter join code"
                aria-describedby={joinError ? 'code-error' : undefined}
                aria-invalid={joinError ? true : undefined}
              />
              {joinError && (
                <p id="code-error" className="mt-1 text-sm text-destructive" role="alert">
                  {joinError}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isJoining}>
              {isJoining ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>Joining...</span>
                </>
              ) : (
                'Join Chat'
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              The join code is case-insensitive and valid for 1 minute after generation
            </p>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
