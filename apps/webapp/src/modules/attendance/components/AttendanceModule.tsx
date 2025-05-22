import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthState, useCurrentUser } from '@/modules/auth/AuthProvider';
import { api } from '@workspace/backend/convex/_generated/api';
import { useSessionMutation, useSessionQuery } from 'convex-helpers/react/sessions';
import { useMutation, useQuery } from 'convex/react';
import { CheckCircle2, Plus, XCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { AttendanceDialog } from './AttendanceDialog';
// Define a type for the record as it comes from the API
interface ApiAttendanceRecord {
  _id: string;
  _creationTime: number;
  attendanceKey: string;
  timestamp: number;
  userId?: string;
  name?: string;
  status?: 'attending' | 'not_attending';
  reason?: string;
}

interface AttendanceModuleProps {
  attendanceKey: string;
  title: string;
  expectedNames?: string[];
}

export const AttendanceModule = ({
  attendanceKey,
  title = 'Attendance',
  expectedNames = [],
}: AttendanceModuleProps) => {
  const currentUser = useCurrentUser();
  const isAuthenticated = currentUser !== undefined;
  const [expanded, setExpanded] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<string>('');

  const attendanceData = useSessionQuery(api.attendance.getAttendanceData, {
    attendanceKey,
  });

  const attendanceRecords: ApiAttendanceRecord[] = attendanceData?.records || [];
  const currentUserResponse = attendanceData?.currentUserResponse;
  const recordAttendance = useSessionMutation(api.attendance.recordAttendance);

  // Check if the current user is already in the attendance list
  const isCurrentUserRegistered = Boolean(currentUserResponse);

  // Create a map of names to their attendance records
  const attendanceMap = new Map<string, ApiAttendanceRecord>();
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

  // Check if a name is the current user
  const isCurrentUser = (name: string) => {
    return isAuthenticated && currentUser && currentUser.name === name;
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

  const attendingCount = attendanceRecords.filter((r) => r.status === 'attending').length;
  const notAttendingCount = attendanceRecords.filter((r) => r.status === 'not_attending').length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex justify-between items-center">
            <span>Attendees</span>
            <div className="flex space-x-2">
              <Badge variant="outline" className="bg-green-50">
                <CheckCircle2 className="h-3 w-3 mr-1" /> {attendingCount}
              </Badge>
              <Badge variant="outline" className="bg-red-50">
                <XCircle className="h-3 w-3 mr-1" /> {notAttendingCount}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!isCurrentUserRegistered && (
            <Button
              variant="outline"
              className="w-full mb-4 flex items-center justify-center"
              onClick={handleJoin}
            >
              <Plus className="h-4 w-4 mr-2" /> Join
            </Button>
          )}

          {allNames.size === 0 ? (
            <div className="text-center text-muted-foreground py-4">No attendees yet</div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {Array.from(allNames).map((name) => {
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
          )}
        </CardContent>
      </Card>

      {dialogOpen && attendanceRecords && (
        <AttendanceDialog
          isOpen={dialogOpen}
          onClose={handleDialogClose}
          personName={selectedPerson}
          attendanceKey={attendanceKey}
          attendanceRecords={attendanceRecords as any}
        />
      )}
    </div>
  );
};
