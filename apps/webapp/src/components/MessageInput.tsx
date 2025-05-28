import { useEffect, useRef, useState } from 'react';
import { MessageContent } from './MessageDisplay';
import { Button } from './ui/button';

interface MessageInputProps {
  onSendMessage: (message: string) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function MessageInput({
  onSendMessage,
  disabled = false,
  placeholder = 'Type a message...',
  className = '',
}: MessageInputProps) {
  // ========================================
  // State Management
  // ========================================
  const [message, setMessage] = useState('');
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // ========================================
  // Refs
  // ========================================
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ========================================
  // Event Handlers
  // ========================================
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || disabled || isSending) return;

    setIsSending(true);
    try {
      await onSendMessage(message);
      setMessage('');
      setIsPreviewMode(false);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
    // New line on Shift+Enter
    else if (e.key === 'Enter' && e.shiftKey) {
      // Let the default behavior happen (insert newline)
      return;
    }
  };

  const togglePreview = () => {
    setIsPreviewMode(!isPreviewMode);
  };

  // ========================================
  // Effects
  // ========================================
  useEffect(() => {
    // Auto-resize textarea
    const textarea = textareaRef.current;
    if (textarea && !isPreviewMode) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  });

  // Focus textarea when not in preview mode
  useEffect(() => {
    if (!isPreviewMode && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isPreviewMode]);

  // ========================================
  // Computed Values
  // ========================================
  const hasContent = message.trim().length > 0;
  const isMultiline = message.includes('\n');
  const hasMarkdown = /(\*\*[^*]*\*\*|\*[^*]*\*|`[^`]*`|#{1,6}\s|>\s|[-*+]\s|\d+\.\s|```)/m.test(
    message
  );

  // ========================================
  // Main Render
  // ========================================
  return (
    <form
      onSubmit={handleSendMessage}
      className={`border-t border-gray-200 dark:border-gray-700 ${className}`}
    >
      <div className="p-3 space-y-2">
        {/* Preview/Edit Toggle */}
        {hasContent && hasMarkdown && (
          <div className="flex justify-between items-center">
            <div className="text-xs text-muted-foreground">
              {isMultiline && !isPreviewMode && (
                <span>Press Shift+Enter for new line, Enter to send</span>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={togglePreview}
              className="text-xs h-6 px-2"
            >
              {isPreviewMode ? 'Edit' : 'Preview'}
            </Button>
          </div>
        )}

        {/* Input/Preview Area */}
        <div className="relative">
          {isPreviewMode ? (
            <div className="min-h-[2.5rem] p-3 border rounded-md bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <MessageContent content={message} isAI={false} enableFormatting={true} />
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              placeholder={placeholder}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled || isSending}
              className="w-full min-h-[2.5rem] max-h-[200px] resize-none border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              rows={1}
            />
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center">
          <div className="text-xs text-muted-foreground">
            {!isMultiline && hasContent && !isPreviewMode && (
              <span>Press Shift+Enter for new line</span>
            )}
          </div>

          <div className="flex gap-2">
            {isPreviewMode && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={togglePreview}
                disabled={isSending}
              >
                Edit
              </Button>
            )}
            <Button type="submit" disabled={!hasContent || disabled || isSending} size="sm">
              {isSending ? 'Sending...' : 'Send'}
            </Button>
          </div>
        </div>

        {/* Help Text */}
        {hasContent && !isPreviewMode && (
          <div className="text-xs text-muted-foreground space-y-1">
            <div>Supports Markdown: **bold**, *italic*, `code`, &gt; quotes, - lists</div>
            {isMultiline && (
              <div className="text-blue-600 dark:text-blue-400">Multi-line message detected</div>
            )}
          </div>
        )}
      </div>
    </form>
  );
}
