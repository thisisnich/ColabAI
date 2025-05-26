// SummaryPreview.tsx - Component to preview current summary
import { api } from '@workspace/backend/convex/_generated/api';
import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import { useSessionQuery } from 'convex-helpers/react/sessions';
import { Clock, FileText } from 'lucide-react';
import { SummarizationControls } from './SummarizationControls';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';

interface SummaryPreviewProps {
  chatId: Id<'chats'>;
  trigger?: React.ReactNode;
}

export function SummaryPreview({ chatId, trigger }: SummaryPreviewProps) {
  const latestSummary = useSessionQuery(api.chatSummarization.getLatestSummary, { chatId });

  if (!latestSummary) {
    return null;
  }

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <FileText className="w-4 h-4 mr-2" />
      View Summary
    </Button>
  );

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Conversation Summary
          </DialogTitle>
          <DialogDescription className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              Created: {new Date(latestSummary.createdAt).toLocaleString()}
            </div>
            <Badge variant="secondary">{latestSummary.messageCount} messages summarized</Badge>
            <Badge variant="outline">{latestSummary.tokensUsed} tokens used</Badge>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] w-full">
          <div className="p-4 bg-gray-50 rounded-md">
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {latestSummary.summary}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// Update to ContextSettings.tsx - Add summarization controls
// Add this import to the top of ContextSettings.tsx:
// import { SummarizationControls, SummaryPreview } from './SummarizationControls';

// Then add this section in the ContextSettings dialog, after the Summary Context switch:

export function SummarizationSection({
  chatId,
  useSummaryContext,
}: {
  chatId: Id<'chats'>;
  useSummaryContext: boolean;
}) {
  if (!useSummaryContext) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Summary Management</h4>
        <SummaryPreview chatId={chatId} />
      </div>

      <SummarizationControls chatId={chatId} />

      <div className="text-xs text-muted-foreground bg-blue-50 p-3 rounded-md">
        <div className="font-medium mb-1">How Smart Summarization Works:</div>
        <ul className="space-y-1 list-disc list-inside">
          <li>Older messages are automatically summarized to save tokens</li>
          <li>Recent messages (last 10-15) are kept in full for context</li>
          <li>Summaries are generated using AI to preserve important details</li>
          <li>New summaries are created as conversations grow</li>
        </ul>
      </div>
    </div>
  );
}
