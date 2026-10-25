// Ledger filters (/ledger/[[filter]]).
const FILTERS = ['money', 'decisions', 'work', 'rules', 'people'];

export function match(param: string): boolean {
  return FILTERS.includes(param);
}
