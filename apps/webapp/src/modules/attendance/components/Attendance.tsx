import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCurrentUser } from '@/modules/auth/AuthProvider';
import { api } from '@workspace/backend/convex/_generated/api';
import type { Doc } from '@workspace/backend/convex/_generated/dataModel';
import { useSessionQuery } from 'convex-helpers/react/sessions';
import { CheckCircle2, ChevronDown, Plus, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AttendanceDialog } from './AttendanceDialog';

interface AttendanceModuleProps {
  attendanceKey: string;
  title: string;
  expectedNames?: string[];
}

export const Attendance = ({
  attendanceKey,
  title = 'Attendance',
  expectedNames = [],
}: AttendanceModuleProps) => {
  const currentUser = useCurrentUser();
  const isAuthenticated = currentUser !== undefined;
  const [expanded, setExpanded] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFullListModal, setShowFullListModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'responded'>('responded');

  const attendanceData = useSessionQuery(api.attendance.getAttendanceData, {
    attendanceKey,
  });

  const attendanceRecords = attendanceData?.records || [];
  const currentUserResponse = attendanceData?.currentUserResponse;

  // Effect to set default tab based on currentUserResponse
  useEffect(() => {
    if (attendanceData !== undefined) {
      if (!currentUserResponse) {
        setActiveTab('pending');
      } else {
        setActiveTab('responded');
      }
    }
  }, [attendanceData, currentUserResponse]);

  // Check if the current user is already in the attendance list
  const isCurrentUserRegistered = Boolean(currentUserResponse);

  // Create a map of names to their attendance records
  const attendanceMap = new Map<string, Doc<'attendanceRecords'>>();
  for (const record of attendanceRecords) {
    if (record.name) {
      attendanceMap.set(record.name, record);
    }
  }

  const handleJoin = () => {
    if (!isAuthenticated || !currentUser) {
      toast.error('You need to be logged in to join');
      return;
    }

    // Open the dialog with the current user's name pre-selected
    setSelectedPerson(currentUser.name);
    setDialogOpen(true);
  };

  const toggleExpand = (name: string) => {
    setExpanded(expanded === name ? null : name);
  };

  const handlePersonClick = (name: string) => {
    setSelectedPerson(name);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedPerson('');
  };

  // Check if a record belongs to the current user by comparing user IDs
  const isCurrentUser = (name: string) => {
    const record = attendanceMap.get(name);
    return isAuthenticated && currentUser && record?.userId === currentUser._id;
  };

  // Prepare the combined list of names (expected + recorded)
  const allNames = new Set<string>();

  // Add expected names
  if (expectedNames) {
    for (const name of expectedNames) {
      allNames.add(name);
    }
  }

  // Add recorded names
  for (const record of attendanceRecords) {
    if (record.name) {
      allNames.add(record.name);
    }
  }

  // Convert set to array and filter by search query
  const filteredNames = Array.from(allNames).filter((name) =>
    name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Separate names into pending and responded
  const pendingNames = filteredNames.filter((name) => {
    const record = attendanceMap.get(name);
    return !record?.status;
  });

  const respondedNames = filteredNames.filter((name) => {
    const record = attendanceMap.get(name);
    return record?.status;
  });

  // Get the names to display based on active tab
  const displayNames = activeTab === 'pending' ? pendingNames : respondedNames;

  const attendingCount = attendanceRecords.filter((r) => r.status === 'attending').length;
  const notAttendingCount = attendanceRecords.filter((r) => r.status === 'not_attending').length;
  const pendingCount = pendingNames.length;

  return (
    <>
      <div className="pb-3">
        <h2 className="text-lg flex justify-between items-center">
          <span>{title}</span>
          {attendanceData === undefined ? (
            <Skeleton className="h-6 w-20" />
          ) : (
            <div className="flex space-x-2">
              <Badge variant="outline" className="bg-green-50">
                <CheckCircle2 className="h-3 w-3 mr-1" /> {attendingCount}
              </Badge>
              <Badge variant="outline" className="bg-red-50">
                <XCircle className="h-3 w-3 mr-1" /> {notAttendingCount}
              </Badge>
              {pendingCount > 0 && <Badge variant="outline">{pendingCount} pending</Badge>}
            </div>
          )}
        </h2>
      </div>
      <div>
        {attendanceData === undefined ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <>
            {!isCurrentUserRegistered && (
              <Button
                variant="outline"
                className="w-full mb-4 flex items-center justify-center"
                onClick={handleJoin}
              >
                <Plus className="h-4 w-4 mr-2" /> Join
              </Button>
            )}

            <div className="mb-4">
              <input
                type="text"
                placeholder="Search names..."
                className="w-full px-3 py-2 border rounded-md"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Tabs
              defaultValue="responded"
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as 'pending' | 'responded')}
            >
              <TabsList className="w-full mb-4">
                <TabsTrigger value="responded" className="flex-1">
                  Responded ({respondedNames.length})
                </TabsTrigger>
                <TabsTrigger value="pending" className="flex-1">
                  Pending ({pendingNames.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="responded">
                {respondedNames.length === 0 ? (
                  <div className="text-center text-muted-foreground py-4">No responses yet</div>
                ) : (
                  <div className="space-y-2">
                    {respondedNames.slice(0, 7).map((name) => {
                      const record = attendanceMap.get(name);
                      const status = record?.status;
                      const reason = record?.reason;
                      const isYou = isCurrentUser(name);

                      return (
                        <div key={name} className="p-2 border rounded-md relative hover:bg-gray-50">
                          <div className="flex items-center justify-between">
                            <Button
                              variant="ghost"
                              className="flex items-center text-left justify-start p-2 h-auto w-full"
                              onClick={() => handlePersonClick(name)}
                            >
                              <div className="flex items-center">
                                {status === 'attending' ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                                ) : status === 'not_attending' ? (
                                  <XCircle className="h-4 w-4 text-red-500 mr-2 flex-shrink-0" />
                                ) : (
                                  <div className="h-4 w-4 rounded-full border mr-2 flex-shrink-0" />
                                )}
                                <span>
                                  {name}
                                  {isYou && (
                                    <span className="ml-1 text-sm text-muted-foreground">
                                      (you)
                                    </span>
                                  )}
                                </span>
                              </div>
                            </Button>

                            {status === 'not_attending' && reason && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 ml-2 flex-shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleExpand(name);
                                }}
                              >
                                {expanded === name ? '-' : '+'}
                              </Button>
                            )}
                          </div>

                          {expanded === name && reason && (
                            <div className="mt-2 p-2 text-sm bg-muted rounded-md w-full">
                              {reason}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {respondedNames.length > 7 && (
                      <Button
                        variant="ghost"
                        className="w-full mt-3 text-muted-foreground hover:text-foreground h-9 rounded-md transition-colors flex items-center justify-center"
                        onClick={() => setShowFullListModal(true)}
                      >
                        View {respondedNames.length} more responses
                        <ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="pending">
                {pendingNames.length === 0 ? (
                  <div className="text-center text-muted-foreground py-4">No pending responses</div>
                ) : (
                  <div className="space-y-2">
                    {pendingNames.slice(0, 7).map((name) => {
                      const isYou = isCurrentUser(name);
                      return (
                        <div key={name} className="p-2 border rounded-md relative hover:bg-gray-50">
                          <Button
                            variant="ghost"
                            className="flex items-center text-left justify-start p-2 h-auto w-full"
                            onClick={() => handlePersonClick(name)}
                          >
                            <div className="flex items-center">
                              <div className="h-4 w-4 rounded-full border mr-2 flex-shrink-0" />
                              <span>
                                {name}
                                {isYou && (
                                  <span className="ml-1 text-sm text-muted-foreground">(you)</span>
                                )}
                              </span>
                            </div>
                          </Button>
                        </div>
                      );
                    })}
                    {pendingNames.length > 7 && (
                      <Button
                        variant="ghost"
                        className="w-full mt-3 text-muted-foreground hover:text-foreground h-9 rounded-md transition-colors flex items-center justify-center"
                        onClick={() => setShowFullListModal(true)}
                      >
                        View {pendingNames.length} pending responses
                        <ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>

      {/* Full list modal - update to show based on active tab */}
      <Dialog open={showFullListModal} onOpenChange={setShowFullListModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {activeTab === 'pending' ? 'Pending Responses' : 'All Responses'} (
              {displayNames.length})
            </DialogTitle>
          </DialogHeader>
          <div>
            <input
              type="text"
              placeholder="Search names..."
              className="w-full px-3 py-2 border rounded-md"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2">
              {displayNames.map((name) => {
                const record = attendanceMap.get(name);
                const status = record?.status;
                const reason = record?.reason;
                const isYou = isCurrentUser(name);

                return (
                  <div key={name} className="p-2 border rounded-md relative hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <Button
                        variant="ghost"
                        className="flex items-center text-left justify-start p-2 h-auto w-full"
                        onClick={() => {
                          setSelectedPerson(name);
                          setDialogOpen(true);
                          setShowFullListModal(false);
                        }}
                      >
                        <div className="flex items-center">
                          {status === 'attending' ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                          ) : status === 'not_attending' ? (
                            <XCircle className="h-4 w-4 text-red-500 mr-2 flex-shrink-0" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border mr-2 flex-shrink-0" />
                          )}
                          <span>
                            {name}
                            {isYou && (
                              <span className="ml-1 text-sm text-muted-foreground">(you)</span>
                            )}
                          </span>
                        </div>
                      </Button>
                      {status === 'not_attending' && reason && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 ml-2 flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(name);
                          }}
                        >
                          {expanded === name ? '-' : '+'}
                        </Button>
                      )}
                    </div>
                    {expanded === name && reason && (
                      <div className="mt-2 p-2 text-sm bg-muted rounded-md w-full">{reason}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {dialogOpen && attendanceRecords && (
        <AttendanceDialog
          isOpen={dialogOpen}
          onClose={handleDialogClose}
          personName={selectedPerson}
          attendanceKey={attendanceKey}
          attendanceRecords={attendanceRecords}
        />
      )}
    </>
  );
};
