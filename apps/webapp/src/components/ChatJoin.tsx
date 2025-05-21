import { api } from '@workspace/backend/convex/_generated/api';
import { useSessionMutation } from 'convex-helpers/react/sessions';
import { Loader2, UsersRound } from 'lucide-react';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';

export function ChatJoin() {
  // State
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [inputCode, setInputCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Mutations
  const joinChatWithCode = useSessionMutation(api.invite.joinChatWithCode);

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

  return (
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
  );
}
