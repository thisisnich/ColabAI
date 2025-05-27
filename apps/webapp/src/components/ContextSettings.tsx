import { api } from '@workspace/backend/convex/_generated/api';
import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import { useSessionMutation, useSessionQuery } from 'convex-helpers/react/sessions';
import { Eye, FileCog, Globe, Info, MessageCircle, Settings, Zap } from 'lucide-react';
import { useState } from 'react';
import { useEffect } from 'react';
import { ContextViewer } from './ContextViewer';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Switch } from './ui/switch';

interface ContextSettingsProps {
  chatId: Id<'chats'>;
}

type ContextMode = 'none' | 'deepseek_only' | 'all_messages';

const contextModeOptions = [
  {
    value: 'none',
    title: 'No Context',
    description: 'Each message is treated as a new conversation',
    tokenUsage: 'Minimal',
    icon: <Zap className="w-4 h-4" />,
    details:
      'Every /deepseek command starts fresh with no memory of previous messages. Uses the least tokens.',
    pros: ['Lowest token usage', 'Fast responses', 'No context confusion'],
    cons: ['No conversation continuity', 'Cannot reference previous messages'],
  },
  {
    value: 'deepseek_only' as const,
    title: 'DeepSeek Messages Only',
    description: 'Remember only messages that start with /deepseek',
    tokenUsage: 'Moderate',
    icon: <MessageCircle className="w-4 h-4" />,
    details:
      'AI remembers previous /deepseek commands and responses for context. Other chat messages are ignored.',
    pros: ['Maintains AI conversation flow', 'Moderate token usage', 'Focused context'],
    cons: ['Ignores regular chat context', 'May miss relevant discussions'],
  },
  {
    value: 'all_messages' as const,
    title: 'All Messages',
    description: 'Remember all messages in the chat',
    tokenUsage: 'High',
    icon: <Globe className="w-4 h-4" />,
    details:
      'AI has full context of all chat messages. Provides the most comprehensive understanding.',
    pros: [
      'Complete conversation awareness',
      'Best contextual responses',
      'Understands full discussion',
    ],
    cons: ['Highest token usage', 'May include irrelevant context', 'Slower processing'],
  },
];

export function ContextSettings({ chatId }: ContextSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isContextViewerOpen, setIsContextViewerOpen] = useState(false);

  // Fetch current context settings
  const contextSettings = useSessionQuery(api.chat.getContextSettings, { chatId });
  const updateContextSettings = useSessionMutation(api.chat.updateContextSettings);

  // Get user's token stats to show current usage
  const tokenStats = useSessionQuery(api.tokens.getUserTokenStats, { limit: 5 });

  // Initialize tokens mutation
  const initializeTokens = useSessionMutation(api.tokens.initializeUserTokensFromSession);

  console.log('Set Context Settings:', contextSettings);
  console.log('Token Stats:', tokenStats);

  const [selectedMode, setSelectedMode] = useState<ContextMode>('deepseek_only');
  const [useSummaryContext, setUseSummaryContext] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializingTokens, setIsInitializingTokens] = useState(false);
  const [initializationAttempted, setInitializationAttempted] = useState(false);

  // Update state when contextSettings loads
  useEffect(() => {
    if (contextSettings) {
      setSelectedMode(contextSettings.contextMode || 'deepseek_only');
      setUseSummaryContext(contextSettings.useSummaryContext || false);
    }
  }, [contextSettings]);

  // Auto-initialize tokens if they don't exist
  useEffect(() => {
    // Only attempt initialization if:
    // 1. tokenStats has loaded and is explicitly null (not undefined)
    // 2. We're not already initializing
    // 3. We haven't already attempted initialization
    if (tokenStats === null && !isInitializingTokens && !initializationAttempted) {
      console.log('Token stats is null, initializing...');
      setIsInitializingTokens(true);
      setInitializationAttempted(true);

      initializeTokens({})
        .then(() => {
          console.log('Token tracking initialized successfully');
        })
        .catch((error) => {
          console.error('Failed to initialize token tracking:', error);
          // Reset attempt flag on error so user can retry
          setInitializationAttempted(false);
        })
        .finally(() => {
          setIsInitializingTokens(false);
        });
    }
  }, [tokenStats, initializeTokens, isInitializingTokens, initializationAttempted]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await updateContextSettings({
        chatId,
        contextMode: selectedMode,
        useSummaryContext,
      });
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to update context settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualTokenInit = async () => {
    setIsInitializingTokens(true);
    try {
      await initializeTokens({});
      console.log('Manual token initialization successful');
    } catch (error) {
      console.error('Manual token initialization failed:', error);
    } finally {
      setIsInitializingTokens(false);
    }
  };

  const currentOption = contextModeOptions.find((opt) => opt.value === selectedMode);
  console.log(currentOption);

  // Determine token stats loading state
  const isTokenStatsLoading = tokenStats === undefined;
  const isTokenStatsNotInitialized = tokenStats === null;
  const availableTokens = tokenStats?.availableTokens || 0;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <FileCog className="w-4 h-4 mr-2" />
            Context Settings
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>AI Context Settings</DialogTitle>
            <DialogDescription>
              Configure how much conversation history the AI remembers when responding to /deepseek
              commands.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Token Usage Info */}
            {isTokenStatsLoading ? (
              <Card className="bg-blue-50 border-blue-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Token Usage
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-2 text-sm">
                  <div className="flex justify-center items-center py-2">
                    <span className="text-muted-foreground">Loading token stats...</span>
                  </div>
                </CardContent>
              </Card>
            ) : isTokenStatsNotInitialized ? (
              <Card className="bg-orange-50 border-orange-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Token Tracking Not Initialized
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-3 text-sm">
                  <p className="text-muted-foreground">
                    Token tracking needs to be set up for your account.
                  </p>
                  {isInitializingTokens ? (
                    <div className="flex justify-center items-center py-2">
                      <span className="text-muted-foreground">Initializing token tracking...</span>
                    </div>
                  ) : (
                    <Button
                      onClick={handleManualTokenInit}
                      size="sm"
                      disabled={isInitializingTokens}
                    >
                      Initialize Token Tracking
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              tokenStats && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      Current Token Usage
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Available tokens:</span>
                      <Badge variant={availableTokens > 1000 ? 'default' : 'destructive'}>
                        {availableTokens.toLocaleString()}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Used this month:</span>
                      <span>{tokenStats.monthlyTokensUsed.toLocaleString()}</span>
                    </div>
                  </CardContent>
                </Card>
              )
            )}

            {/* Context Mode Selection */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Context Retention Mode</Label>
              <RadioGroup
                value={selectedMode}
                onValueChange={(value: ContextMode) => setSelectedMode(value)}
                className="space-y-4"
              >
                {contextModeOptions.map((option) => (
                  <div key={option.value} className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value={option.value} id={option.value} />
                      <Label htmlFor={option.value} className="cursor-pointer flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {option.icon}
                            <span className="font-medium">{option.title}</span>
                          </div>
                          <Badge
                            variant={
                              option.tokenUsage === 'Minimal'
                                ? 'default'
                                : option.tokenUsage === 'Moderate'
                                  ? 'secondary'
                                  : 'destructive'
                            }
                            className="text-xs"
                          >
                            {option.tokenUsage} Tokens
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{option.description}</p>
                      </Label>
                    </div>

                    {/* Detailed info for selected option */}
                    {selectedMode === option.value && (
                      <Card className="ml-6 bg-muted/50">
                        <CardContent className="pt-4">
                          <p className="text-sm mb-3">{option.details}</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                            <div>
                              <h4 className="font-medium text-green-700 mb-1">Advantages:</h4>
                              <ul className="space-y-1 text-muted-foreground">
                                {option.pros.map((pro) => (
                                  <li key={`${option.value}-pro-${pro}`}>• {pro}</li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <h4 className="font-medium text-orange-700 mb-1">Considerations:</h4>
                              <ul className="space-y-1 text-muted-foreground">
                                {option.cons.map((con) => (
                                  <li key={`${option.value}-con-${con}`}>• {con}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Summary Context Option */}
            {selectedMode !== 'none' && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="summary-context" className="text-base font-medium">
                        Smart Context Summarization
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Use AI to summarize older messages instead of including full text. Reduces
                        token usage while maintaining context.
                      </p>
                    </div>
                    <Switch
                      id="summary-context"
                      checked={useSummaryContext}
                      onCheckedChange={setUseSummaryContext}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Warning for high usage modes */}
            {selectedMode === 'all_messages' &&
              !useSummaryContext &&
              tokenStats &&
              availableTokens < 5000 && (
                <Card className="border-orange-200 bg-orange-50">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 text-orange-800">
                      <Info className="w-4 h-4" />
                      <span className="text-sm font-medium">Token Usage Warning</span>
                    </div>
                    <p className="text-sm text-orange-700 mt-1">
                      "All Messages" mode uses significantly more tokens. Consider enabling Smart
                      Context Summarization or purchasing additional tokens.
                    </p>
                  </CardContent>
                </Card>
              )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isLoading || isInitializingTokens}>
                {isLoading ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Context Viewer Component */}
      <ContextViewer
        chatId={chatId}
        isOpen={isContextViewerOpen}
        onOpenChange={setIsContextViewerOpen}
      />
    </>
  );
}
