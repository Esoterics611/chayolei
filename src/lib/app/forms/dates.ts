/** A date input's value (YYYY-MM-DD) as an ISO timestamp at local noon, or undefined. */
export const dateToIso = (value: string): string | undefined =>
  value ? new Date(`${value}T12:00:00`).toISOString() : undefined;
