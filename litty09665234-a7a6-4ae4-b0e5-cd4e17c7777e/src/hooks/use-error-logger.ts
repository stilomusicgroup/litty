import { api } from '@/lib/api-client';

export interface LogErrorInput {
  message: string;
  context?: string;
  level?: 'error' | 'warn' | 'info';
  stack?: string;
  source?: string;
  userAddress?: string;
  appVersion?: string;
}

export async function logError(input: LogErrorInput): Promise<boolean> {
  try {
    await api.post('/api/error-log', {
      level: input.level ?? 'error',
      message: input.message,
      context: input.context,
      stack: input.stack,
      source: input.source ?? 'frontend',
      userAddress: input.userAddress,
      appVersion: input.appVersion,
    });
    return true;
  } catch {
    return false;
  }
}

export function useErrorLogger() {
  return { logError };
}
