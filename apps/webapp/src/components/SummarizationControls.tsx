// SummarizationControls.tsx
import { api } from '@workspace/backend/convex/_generated/api';
import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import { useSessionMutation, useSessionQuery } from 'convex-helpers/react/sessions';
import { Brain, Clock, FileText, Loader2, Sparkles, Zap } from 'lucide-react';
import { useState } from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';

interface SummarizationControlsProps {
  chatId: Id<'chats'>;
  className?: string;
}

export function SummarizationControls({ chatId, className }: SummarizationControlsProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  // Get context data to check if summarization is needed
  const contextData = useSessionQuery(api.context.getContextMessages, { chatId });
  const latestSummary = useSessionQuery(api.chatSummarization.getLatestSummary, { chatId });
  const requestSummarization = useSessionMutation(api.chatSummarization.requestSummarization);

  const handleGenerateSummary = async () => {
    setIsGenerating(true);
    try {
      await requestSummarization({ chatId });
    } catch (error) {
      console.error('Failed to request summarization:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!contextData) {
    return null;
  }

  // Calculate values based on available data
  const totalMessages = contextData.messages.length;
  const needsSummarization = totalMessages > 20; // Adjust this threshold as needed
  const summarizedMessages = latestSummary?.messageCount || 0;
  const unsummarizedMessages = totalMessages - summarizedMessages;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Brain className="w-4 h-4" />
          Context Summarization
        </CardTitle>
        <CardDescription className="text-xs">
          Optimize token usage by summarizing older messages
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Summary Status */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span>Messages Status</span>
            <div className="flex items-center gap-2">
              {latestSummary && (
                <Badge variant="secondary" className="text-xs">
                  <Sparkles className="w-3 h-3 mr-1" />
                  {summarizedMessages} summarized
                </Badge>
              )}
              <Badge variant={needsSummarization ? 'destructive' : 'default'} className="text-xs">
                <FileText className="w-3 h-3 mr-1" />
                {unsummarizedMessages} unsummarized
              </Badge>
            </div>
          </div>

          {totalMessages > 0 && (
            <Progress value={(summarizedMessages / totalMessages) * 100} className="h-2" />
          )}
        </div>

        {/* Last Summary Info */}
        {latestSummary && (
          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
            <div className="flex items-center gap-1 mb-1">
              <Clock className="w-3 h-3" />
              Last summary: {new Date(latestSummary._creationTime).toLocaleDateString()}
            </div>
            <div className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              Tokens used: {latestSummary.tokensUsed}
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="flex gap-2">
          <Button
            onClick={handleGenerateSummary}
            disabled={isGenerating || !needsSummarization}
            size="sm"
            className="flex-1"
            variant={needsSummarization ? 'default' : 'secondary'}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                Generating...
              </>
            ) : needsSummarization ? (
              <>
                <Brain className="w-3 h-3 mr-2" />
                Generate Summary
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3 mr-2" />
                Up to Date
              </>
            )}
          </Button>
        </div>

        {/* Token Savings Estimate */}
        {needsSummarization && (
          <div className="text-xs text-green-700 bg-green-50 p-2 rounded border border-green-200">
            <div className="font-medium mb-1">Potential Token Savings</div>
            <div>
              Summarizing {unsummarizedMessages - 15} messages could save ~
              {Math.round((unsummarizedMessages - 15) * 0.75 * 25)} tokens per AI request
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
