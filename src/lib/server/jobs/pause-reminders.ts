/**
 * Send 7/3/1-day pause-resume reminder emails.
 *
 * v1 stub — schema columns `subscriptionPausedAt` and `pauseUntil` don't exist
 * yet. Returns zero-work until Prompt 2 adds the schema and the real query.
 *
 * Idempotency by exact-day-match — query for `pauseUntil` exactly 7, 3, or 1
 * days from today. A missed run day means a missed reminder for the day's
 * matching cohort (acceptable degradation; auto-resume still fires correctly).
 * No tracking column needed.
 */
export async function runPauseReminders(): Promise<{ processed: number; errors: string[] }> {
	return { processed: 0, errors: [] };
}
