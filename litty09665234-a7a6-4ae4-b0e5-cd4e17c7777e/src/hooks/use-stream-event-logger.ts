import { useCallback } from 'react';
import { useAuth } from '@/hooks/use-privy-auth';
import { setStreamEvents } from '@/lib/collections/streamEvents';
import { Address, Time } from '@/lib/db-client';

export interface StreamEventInput {
  songId: string;
  duration?: number;
  source?: string;
}

export function useStreamEventLogger() {
  const { user } = useAuth();

  const createStreamEvent = useCallback(async (input: StreamEventInput) => {
    if (!user?.address) return false;

    const eventId = crypto.randomUUID();

    const success = await setStreamEvents(eventId, {
      songId: input.songId,
      userAddress: Address.publicKey(user.address),
      duration: input.duration ?? 0,
      timestamp: Time.Now,
      source: input.source ?? 'player',
    });

    return success;
  }, [user]);

  return { createStreamEvent };
}
