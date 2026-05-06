/**
 * Auto-resume subscriptions whose `pauseUntil` has passed.
 *
 * v1 stub — schema columns `subscriptionPausedAt` and `pauseUntil` don't exist
 * yet. Returns zero-work until Prompt 2 adds the schema and the real query.
 *
 * Idempotency contract: query `paused AND pauseUntil <= now()`, act, write back.
 * Subsequent runs see fewer/zero matches. Missing a day's run is recoverable —
 * tomorrow catches up. Double-firing is harmless — second pass finds no work.
 */
export async function runResumeDue(): Promise<{ processed: number; errors: string[] }> {
	return { processed: 0, errors: [] };
}
