import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCurrentUser } from '@/modules/auth/AuthProvider';
import { api } from '@workspace/backend/convex/_generated/api';
import type { Doc } from '@workspace/backend/convex/_generated/dataModel';
import { useSessionMutation } from 'convex-helpers/react/sessions';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AttendanceStatus } from '../types';

interface AttendanceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  personName: string;
  attendanceKey?: string;
  attendanceRecords: Doc<'attendanceRecords'>[];
}

export function AttendanceDialog({
  isOpen,
  onClose,
  personName,
  attendanceKey,
  attendanceRecords,
}: AttendanceDialogProps) {
  const currentUser = useCurrentUser();
  const isAuthenticated = currentUser !== undefined;

  const userAlreadyResponded = isAuthenticated
    ? attendanceRecords.some((record) => record.userId === currentUser?._id)
    : false;
  const defaultRespondAs =
    isAuthenticated && userAlreadyResponded && currentUser?.name !== personName
      ? 'other'
      : isAuthenticated
        ? 'self'
        : 'other';

  const [respondAs, setRespondAs] = useState<'self' | 'other'>(defaultRespondAs);
  const [status, setStatus] = useState<AttendanceStatus>(AttendanceStatus.ATTENDING);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const recordAttendance = useSessionMutation(api.attendance.recordAttendance);

  useEffect(() => {
    //automatically set the respond as to the default if the default changes
    setRespondAs(defaultRespondAs);
  }, [defaultRespondAs]);

  const handleSubmit = async () => {
    setLoading(true);

    try {
      if (respondAs === 'self' && isAuthenticated) {
        await recordAttendance({
          name: personName,
          attendanceKey,
          status,
          reason: status === AttendanceStatus.NOT_ATTENDING ? reason : undefined,
          self: true,
        });
        toast.success('Your attendance has been recorded');
      } else {
        await recordAttendance({
          attendanceKey,
          name: personName,
          status,
          reason: status === AttendanceStatus.NOT_ATTENDING ? reason : undefined,
          self: false,
        });
        toast.success(`Attendance recorded for ${personName}`);
      }

      onClose();
    } catch (error) {
      console.error('Failed to record attendance:', error);
      toast.error('Failed to record attendance. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Record Attendance</DialogTitle>
          <DialogDescription>
            {isAuthenticated
              ? 'Record attendance for yourself or for someone else.'
              : `Record attendance for ${personName}.`}
          </DialogDescription>
        </DialogHeader>

        {isAuthenticated && (
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="respond-as">Who are you responding as?</Label>
              <Select
                value={respondAs}
                onValueChange={(value) => setRespondAs(value as 'self' | 'other')}
              >
                <SelectTrigger id="respond-as">
                  <SelectValue placeholder="Select who to respond as" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="self">Myself ({currentUser?.name})</SelectItem>
                  <SelectItem value="other">{personName}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="status">Attendance Status</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as AttendanceStatus)}>
              <SelectTrigger id="status">
                <SelectValue placeholder="Select attendance status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={AttendanceStatus.ATTENDING}>Attending</SelectItem>
                <SelectItem value={AttendanceStatus.NOT_ATTENDING}>Not Attending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {status === AttendanceStatus.NOT_ATTENDING && (
            <div className="space-y-2">
              <Label htmlFor="reason">Reason (optional)</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why can't you attend?"
                rows={3}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Recording...
              </>
            ) : (
              'Save'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
