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

## Excel export

Click **Excel** in the top bar. You get a dialog where you pick which tables to
include:

- the **current live result** (if a query has run)
- any **snapshots** already saved

Each selected item becomes its own sheet. A first **Accueil** sheet is added
with a gradient banner, a clickable table-of-contents, and a Parameters block
showing every variable used (yellow-filled cells clearly styled as input
fields, with a note on how to change them in the app).

Data sheets are styled: violet header row, frozen first line, auto-filter,
banded rows, per-type number/date formats (`#,##0.00`, `yyyy-mm-dd hh:mm`…),
auto-fit column widths, and a small source-query note under the data.

## Sharing results with colleagues who don't have SQL access

Not everyone on the team has VPN + SQL credentials, but they still need to see
the data. The app solves that with **snapshots** + **workspace files**.

**Workflow:**

1. Person A (has SQL access) runs a query → clicks **Capturer** in the results
   header → gives it a name ("Ventes Q1 — vendeur 12").
2. Person A clicks **Exporter** in the top bar → saves a `.sapwork` file
   (plain JSON) containing all templates, history and snapshots.
3. Person A sends the `.sapwork` file to Person B (Slack, email, shared drive…).
4. Person B opens the app → clicks **Importer** → picks the file.
5. Person B switches to the **Captures** tab in the sidebar → clicks the
   snapshot → **the tables and charts render exactly as Person A saw them, with
   no database connection required**.

Snapshots are cap-limited to 20 000 rows each to keep file size reasonable.
Import mode is "merge by id" — existing templates / snapshots with the same id
are overwritten, everything else is kept. Swap to the replace mode in code if
you want a clean wipe.

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
