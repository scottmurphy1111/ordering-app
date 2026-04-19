export type DayHours = { open: string; close: string; closed?: boolean };
export type WeekHours = Partial<Record<string, DayHours>>;

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function timeToMinutes(time: string): number {
	const [h, m] = time.split(':').map(Number);
	return h * 60 + (m ?? 0);
}

export function getOpenStatus(hours: WeekHours | null | undefined): boolean | null {
	if (!hours || Object.keys(hours).length === 0) return null;

	const now = new Date();
	const dayName = DAYS[now.getDay()];
	const todayHours = hours[dayName];

	if (!todayHours || todayHours.closed) return false;

	const current = now.getHours() * 60 + now.getMinutes();
	return current >= timeToMinutes(todayHours.open) && current < timeToMinutes(todayHours.close);
}

export function getNextOpenDay(hours: WeekHours | null | undefined): string | null {
	if (!hours || Object.keys(hours).length === 0) return null;

	const todayIndex = new Date().getDay();
	for (let i = 1; i <= 7; i++) {
		const dayName = DAYS[(todayIndex + i) % 7];
		const dayHours = hours[dayName];
		if (dayHours && !dayHours.closed) {
			return i === 1 ? `tomorrow at ${dayHours.open}` : `${dayName} at ${dayHours.open}`;
		}
	}
	return null;
}
