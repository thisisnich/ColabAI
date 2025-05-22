import { SessionIdArg } from 'convex-helpers/server/sessions';
import { v } from 'convex/values';
import { ConvexError } from 'convex/values';
import { getAuthUser } from '../modules/auth/getAuthUser';
import type { Id } from './_generated/dataModel';
import { mutation, query } from './_generated/server';

// Hardcoded attendance key
const ATTENDANCE_KEY = 'default-attendance';

// Record attendance for an attendee (both anonymous and authenticated)
export const recordAttendance = mutation({
  args: {
    attendanceKey: v.optional(v.string()),
    name: v.string(),
    status: v.union(v.literal('attending'), v.literal('not_attending')),
    reason: v.optional(v.string()),
    self: v.optional(v.boolean()),
    ...SessionIdArg,
  },
  handler: async (ctx, args) => {
    let attendanceUserId = undefined; //the user id associated with the attendance record
    const name = args.name;
    const attendanceKey = args.attendanceKey || ATTENDANCE_KEY;
    const self = args.self ?? false;

    console.log('args', args);

    // For authenticated users
    const user = await getAuthUser(ctx, args);
    if (user && self) {
      attendanceUserId = user._id; //only associate the user if they are recording for themselves
    }

    // Name is required if not authenticated or not self
    if (!attendanceUserId && !name) {
      throw new ConvexError('Name is required for anonymous attendance');
    }

    // delete any records already associated with this user
    if (attendanceUserId) {
      // if the user is registering
      const existingRecords = await ctx.db
        .query('attendanceRecords')
        .withIndex('by_user_attendance', (q) =>
          q.eq('attendanceKey', attendanceKey).eq('userId', attendanceUserId)
        )
        .collect();
      //delete all existing records
      await Promise.all(existingRecords.map((record) => ctx.db.delete(record._id)));
    }

    // Create a new record
    return ctx.db.insert('attendanceRecords', {
      attendanceKey,
      userId: attendanceUserId,
      name,
      timestamp: Date.now(),
      status: args.status,
      reason: args.status === 'not_attending' ? args.reason : undefined,
    });
  },
});

// Get attendance data including records and current user's response
export const getAttendanceData = query({
  args: {
    attendanceKey: v.string(),
    ...SessionIdArg,
  },
  handler: async (ctx, args) => {
    // Get all attendance records for this key
    const records = await ctx.db
      .query('attendanceRecords')
      .withIndex('by_attendance', (q) => q.eq('attendanceKey', args.attendanceKey))
      .collect();

    // Get current user's response if authenticated
    const user = await getAuthUser(ctx, args);
    const currentUserResponse = user
      ? await ctx.db
          .query('attendanceRecords')
          .withIndex('by_user_attendance', (q) =>
            q.eq('attendanceKey', args.attendanceKey).eq('userId', user._id)
          )
          .first()
      : null;
    return {
      records,
      currentUserResponse,
    };
  },
});
