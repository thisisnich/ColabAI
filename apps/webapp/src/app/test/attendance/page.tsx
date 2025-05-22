'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AttendanceModule } from '@/modules/attendance/components/AttendanceModule';

export default function AttendanceTestPage() {
  // Hardcoded attendee names
  const attendeeNames = ['John Doe', 'Jane Smith', 'Alex Johnson', 'Michael Brown', 'Emily Davis'];

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Attendance Test Page</h1>

      <AttendanceModule
        attendanceKey="weekly-team-meeting"
        title="Weekly Team Meeting"
        expectedNames={attendeeNames}
      />
    </div>
  );
}
