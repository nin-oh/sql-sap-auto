const KEY = "sap.variableValues.v1";
const PER_VAR_LIMIT = 12;

type Store = Record<string, string[]>;

function read(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Store;
  } catch {
    return {};
  }
}

function write(s: Store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore quota errors */
  }
}

export function rememberValue(variable: string, value: string) {
  const v = value.trim();
  if (!v) return;
  const s = read();
  const prev = s[variable] ?? [];
  const deduped = [v, ...prev.filter((x) => x !== v)].slice(0, PER_VAR_LIMIT);
  s[variable] = deduped;
  write(s);
}

export function getHistory(variable: string): string[] {
  return read()[variable] ?? [];
}

export function clearHistoryFor(variable: string) {
  const s = read();
  delete s[variable];
  write(s);
}
