# SAP Query Desktop

A beautiful desktop app to query your SAP Business One / SQL Server datawarehouse
without writing SQL every time. Paste (or save) a query once, then let your team
fill in a friendly form to pull the data they need — with sortable tables, charts,
CSV export and persistent history.

![stack](https://img.shields.io/badge/stack-Electron%20%2B%20React%20%2B%20TypeScript-7c5cff)

## Highlights

- **SQL Server connection manager** — credentials encrypted via the OS keychain
  (Electron `safeStorage`).
- **Friendly variables for non-SQL users** — write `:varName` in your SQL and the
  app auto-generates a form (text / number / date). No injection: values are sent
  as parameterized inputs through the `mssql` driver.
- **Beautiful SQL editor** — CodeMirror 6 with MSSQL dialect, auto-completion,
  syntax highlighting.
- **Gorgeous data grid** — TanStack Table with sort, filter, pagination and CSV
  export.
- **Charts** — Bar, Line and Pie charts (Recharts) over any numeric column, with
  auto-aggregation for categorical X axes on pie.
- **Query history** — every run is persisted locally (500 entries). One click to
  reload.
- **Reusable templates** — saved queries with their variables. Pre-seeded with the
  SAP SLS_DET template used in your Power Query example.
- **Keyboard-first** — `Ctrl/Cmd + Enter` runs the query.

## Pre-seeded SAP template

```sql
SELECT *
FROM DATAWAREHOUSE.dbo.SLS_DET s
WHERE
    s.SlpCode = :SlpCode
    AND (:Entrepot = '*' OR s.WhsCode LIKE :Entrepot)
    AND s.Dte BETWEEN :StartDate AND :EndDate
ORDER BY s.Dte
```

Variables: `SlpCode` (number), `Entrepot` (text, `*` = all), `StartDate` /
`EndDate` (date). Users just fill the form — no SQL required.

## Network / VPN

The SQL Server at `192.168.1.240` lives on the internal network, so the app can
only reach it while your **corporate VPN is connected**. When it isn't, the
connection test and every query fail fast with a dedicated "Serveur injoignable"
banner that tells the user to connect the VPN — instead of a cryptic TCP
timeout. Recognized network error codes: `ETIMEDOUT`, `ESOCKET`, `ECONNREFUSED`,
`ECONNRESET`, `EHOSTUNREACH`, `ENETUNREACH`, `ENOTFOUND`, `EAI_AGAIN`.

## Dev

```bash
npm install
npm run electron:dev     # Vite + Electron with hot reload
```

## Build

```bash
npm run electron:build   # produces installers in ./release
```

Targets: Windows (NSIS), macOS (DMG), Linux (AppImage).

## Variable syntax

Inside your SQL, use `:paramName`:

```sql
SELECT * FROM items WHERE code = :ItemCode AND date >= :From
```

The app:
1. Detects every `:name` and creates a form field.
2. Guesses the type from the name (`*Date*` → date, `*Code*`/`*Id*` → number, …).
3. Sends the value as a true SQL parameter to SQL Server (no injection risk).

You can override types, labels and hints by saving your query as a template and
editing its metadata — or just type in the form; the app remembers your values
while you iterate.

## Storage

All local, inside the user-data directory:

- `connection.json` — server config; password is encrypted with OS keychain.
- `history.json` — last 500 runs.
- `templates.json` — saved templates.

## Stack

Electron 33 · React 18 · TypeScript 5 · Vite 5 · Tailwind 3 · CodeMirror 6 ·
TanStack Table 8 · Recharts 2 · Zustand 5 · mssql 11.
