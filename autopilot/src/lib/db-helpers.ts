/**
 * Normalize a Supabase relational join that may come back as a single object,
 * an array, or null, into its first element (or null).
 */
export function firstOf<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}
