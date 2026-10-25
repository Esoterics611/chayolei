// Tabs of a deliverable page (/d/[id]/[[tab]]).
export const TABS = ['overview', 'work', 'tasks', 'reviews', 'thread', 'history'] as const;
export type Tab = (typeof TABS)[number];

export function match(param: string): param is Tab {
  return (TABS as readonly string[]).includes(param);
}
