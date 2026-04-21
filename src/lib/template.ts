import type { Variable } from "./types";

const VAR_REGEX = /(?<![:@\w]):([A-Za-z_][A-Za-z0-9_]*)\b/g;

export function extractVariables(sql: string): string[] {
  const names = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = VAR_REGEX.exec(sql))) {
    names.add(m[1]);
  }
  return Array.from(names);
}

export function mergeVariables(
  sql: string,
  existing: Variable[],
): Variable[] {
  const names = extractVariables(sql);
  const byName = new Map(existing.map((v) => [v.name, v]));
  const result: Variable[] = [];
  for (const n of names) {
    const prior = byName.get(n);
    result.push(
      prior ?? {
        name: n,
        label: humanize(n),
        type: guessType(n),
        default: "",
      },
    );
  }
  return result;
}

function humanize(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function guessType(name: string): Variable["type"] {
  const n = name.toLowerCase();
  if (n.includes("date")) return "date";
  if (
    n.includes("code") ||
    n.includes("id") ||
    n.includes("num") ||
    n.includes("qty") ||
    n.includes("amount")
  ) {
    if (n.includes("whs") || n.includes("entrepot")) return "text";
    return "number";
  }
  return "text";
}

export function buildParams(
  variables: Variable[],
  values: Record<string, string>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const v of variables) {
    const raw = values[v.name] ?? v.default ?? "";
    if (v.type === "number") {
      const n = Number(raw);
      out[v.name] = Number.isFinite(n) ? n : 0;
    } else {
      out[v.name] = String(raw);
    }
  }
  return out;
}
