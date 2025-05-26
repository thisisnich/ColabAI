import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

// Generate a random beta code
function generateBetaCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `BETA-${result}`;
}

// Submit beta application
export const submitApplication = mutation({
  args: {
    email: v.string(),
    fullName: v.string(),
    company: v.optional(v.string()),
    role: v.string(),
    teamSize: v.string(),
    useCase: v.string(),
    expectedUsage: v.string(),
    referralSource: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if email already exists
    const existing = await ctx.db
      .query('betaApplications')
      .withIndex('by_email', (q) => q.eq('email', args.email))
      .first();

    if (existing) {
      throw new Error('Application already exists for this email');
    }

    // All applications start as pending for manual review
    const applicationId = await ctx.db.insert('betaApplications', {
      ...args,
      status: 'pending',
      appliedAt: Date.now(),
    });

    console.log(`New beta application received from ${args.email}`);

    return {
      applicationId,
      status: 'pending',
    };
  },
});

// Placeholder auto-approval logic
function checkAutoApprovalCriteria(args: any): boolean {
  // Example criteria - modify as needed
  const companyKeywords = ['google', 'microsoft', 'apple', 'meta', 'amazon', 'netflix'];
  const roleKeywords = ['founder', 'ceo', 'cto', 'vp', 'director', 'lead'];

  const company = args.company?.toLowerCase() || '';
  const role = args.role.toLowerCase();
  const useCase = args.useCase.toLowerCase();

  // Auto-approve if:
  // 1. From known companies
  // 2. Senior roles
  // 3. Detailed use case (>100 characters)
  // 4. Larger teams
  return (
    companyKeywords.some((keyword) => company.includes(keyword)) ||
    roleKeywords.some((keyword) => role.includes(keyword)) ||
    (useCase.length > 100 && args.teamSize !== '1-5') ||
    args.teamSize === '50+' ||
    args.expectedUsage === 'Daily'
  );
}

// Get all applications (for admin)
export const getApplications = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('betaApplications')
      .order('desc')
      .take(args.limit ?? 50);
  },
});

// Manually approve application
export const approveApplication = mutation({
  args: {
    applicationId: v.id('betaApplications'),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const application = await ctx.db.get(args.applicationId);
    if (!application) {
      throw new Error('Application not found');
    }

    if (application.status === 'approved') {
      throw new Error('Application already approved');
    }

    const betaCode = generateBetaCode();

    // Store the beta code
    await ctx.db.insert('betaCodes', {
      code: betaCode,
      email: application.email,
      isUsed: false,
      createdAt: Date.now(),
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    // Update application
    await ctx.db.patch(args.applicationId, {
      status: 'approved',
      betaCode,
      reviewedAt: Date.now(),
      notes: args.notes,
    });

    // TODO: Send email with beta code
    console.log(`Manually approved application for ${application.email} with code: ${betaCode}`);

    return { betaCode };
  },
});
