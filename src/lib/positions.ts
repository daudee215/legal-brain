/** What someone signing up does. Saved with their account (user_metadata.position) so we know who uses Wakeel Pro. */
export const POSITIONS = [
  { id: 'advocate', label: 'Advocate' },
  { id: 'lawyer', label: 'Lawyer / legal consultant' },
  { id: 'student', label: 'Law student' },
  { id: 'researcher', label: 'Legal researcher' },
  { id: 'clerk', label: 'Clerk / munshi' },
  { id: 'other', label: 'Other' },
] as const;

export type Position = (typeof POSITIONS)[number]['id'];

export const isPosition = (v: unknown): v is Position => POSITIONS.some((p) => p.id === v);
