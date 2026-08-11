// Manual mock for next-auth/next
// This file is picked up by Vitest when vi.mock('next-auth/next') is called
export const getServerSession = async () => null;
