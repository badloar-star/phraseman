"use client";

import {
  findingPriorityScore,
  findingPriorityTier,
  type FindingPriorityTier
} from "@subscription-recovery/core";
import { useEffect, useMemo, useState, type CSSProperties } from "react";

type Summary = {
  totalMonthlySpend: number;
  potentialMonthlySavings: number;
  confirmedMonthlySavings: number;
  openFindings: number;
  totalFindings: number;
  confirmedLedgersCount: number;
  recoveryRatePercent: number;
  confirmedToPotentialRatio: number;
  avgFindingConfidence: number;
};

type FindingStatus = "open" | "in_review" | "actioned" | "closed";

/** Matches backend `WasteFinding.type` values used by detection. */
type FindingTypeKey = "duplicate" | "orphaned" | "review" | "owner_gap";

type OrgMember = {
  id: string;
  email: string;
  role: string;
};

type SubscriptionApiItem = {
  id: string;
  detectionKey: string;
  avgAmount: unknown;
  currency: string;
  confidence: number;
  ownerUserId: string | null;
  merchant: { canonicalName: string; category: string } | null;
  owner: { id: string; email: string; role: string } | null;
};

type DetectionRunRow = {
  id: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  success: boolean;
  errorMessage: string | null;
  incremental: boolean;
  fullReset: boolean;
  scannedTransactions: number;
  candidateCount: number;
  avgCandidateConfidence: number;
  detectedSubscriptions: number;
  generatedFindings: number;
  generatedDuplicateFindings: number;
  removedStaleSubscriptions: number;
  clearedTransientFindings: number;
};

type Finding = {
  id: string;
  type: string;
  title: string;
  estimatedMonthlySaving: number;
  confidence: number;
  status: FindingStatus;
  /** From `GET /api/findings` — same formula as `@subscription-recovery/core`. */
  priorityScore?: number;
  priorityTier?: FindingPriorityTier;
  subscription?: {
    currency: string;
  } | null;
  /** Set when a `SavingsLedger` row exists for this finding. */
  confirmedMonthlySaving?: number | null;
  savingsRealizedAt?: string | null;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

function formatMoney(value: number) {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function scoreForFinding(item: Finding): number {
  return (
    item.priorityScore ??
    findingPriorityScore({
      estimatedMonthlySaving: item.estimatedMonthlySaving,
      confidence: item.confidence,
      type: item.type
    })
  );
}

function subscriptionAvgAmount(row: SubscriptionApiItem): number {
  const value = row.avgAmount;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return Number(value);
}

function tierForFinding(item: Finding): FindingPriorityTier {
  return (
    item.priorityTier ??
    findingPriorityTier({
      estimatedMonthlySaving: item.estimatedMonthlySaving,
      confidence: item.confidence,
      type: item.type
    })
  );
}

function priorityBadgeStyle(tier: FindingPriorityTier): CSSProperties {
  if (tier === "P1") {
    return {
      display: "inline-block",
      minWidth: "2.25rem",
      textAlign: "center",
      fontSize: "0.7rem",
      fontWeight: 800,
      letterSpacing: "0.04em",
      padding: "0.2rem 0.45rem",
      borderRadius: "6px",
      background: "#FEE2E2",
      color: "#991B1B",
      border: "1px solid #FECACA"
    };
  }
  if (tier === "P2") {
    return {
      display: "inline-block",
      minWidth: "2.25rem",
      textAlign: "center",
      fontSize: "0.7rem",
      fontWeight: 800,
      letterSpacing: "0.04em",
      padding: "0.2rem 0.45rem",
      borderRadius: "6px",
      background: "#FEF3C7",
      color: "#92400E",
      border: "1px solid #FDE68A"
    };
  }
  return {
    display: "inline-block",
    minWidth: "2.25rem",
    textAlign: "center",
    fontSize: "0.7rem",
    fontWeight: 800,
    letterSpacing: "0.04em",
    padding: "0.2rem 0.45rem",
    borderRadius: "6px",
    background: "#F3F4F6",
    color: "#4B5563",
    border: "1px solid #E5E7EB"
  };
}

export default function HomePage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [findingsFilter, setFindingsFilter] = useState<"all" | FindingStatus>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | FindingTypeKey>("all");
  const [isRunning, setIsRunning] = useState(false);
  const [lastRunResult, setLastRunResult] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busyFindingId, setBusyFindingId] = useState<string | null>(null);
  const [detectionRuns, setDetectionRuns] = useState<DetectionRunRow[]>([]);
  const [exportFrom, setExportFrom] = useState("");
  const [exportTo, setExportTo] = useState("");
  const [savingsBasisRealized, setSavingsBasisRealized] = useState(false);
  const [exportBusy, setExportBusy] = useState<"findings" | "savings" | null>(null);
  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionApiItem[]>([]);
  const [busySubscriptionId, setBusySubscriptionId] = useState<string | null>(null);

  const stats = useMemo(
    () => [
      { label: "Total monthly spend", value: formatMoney(summary?.totalMonthlySpend ?? 0) },
      { label: "Potential savings", value: formatMoney(summary?.potentialMonthlySavings ?? 0) },
      { label: "Confirmed savings", value: formatMoney(summary?.confirmedMonthlySavings ?? 0) },
      { label: "Open findings", value: String(summary?.openFindings ?? 0) }
    ],
    [summary]
  );

  const kpiStats = useMemo(() => {
    const s = summary;
    if (!s) {
      return [
        { label: "Recovery rate", value: "—", hint: "Confirmed ÷ potential (monthly $)" },
        { label: "Confirmed / potential", value: "—", hint: "Ratio in dollars" },
        { label: "Avg finding confidence", value: "—", hint: "Mean model confidence" },
        { label: "Confirmed in ledger", value: "—", hint: "Rows with confirmed $ / total findings" }
      ];
    }
    const ratioLabel =
      s.potentialMonthlySavings > 0
        ? `${s.confirmedToPotentialRatio.toFixed(2)}×`
        : "—";
    const ledgerLabel =
      s.totalFindings > 0 ? `${s.confirmedLedgersCount} / ${s.totalFindings}` : String(s.confirmedLedgersCount);
    return [
      {
        label: "Recovery rate",
        value: `${s.recoveryRatePercent.toFixed(0)}%`,
        hint: "Share of potential savings confirmed in ledger"
      },
      {
        label: "Confirmed / potential",
        value: ratioLabel,
        hint: "Dollar ratio (capped at 1.00)"
      },
      {
        label: "Avg finding confidence",
        value: `${Math.round(s.avgFindingConfidence * 100)}%`,
        hint: "Across all findings"
      },
      {
        label: "Ledger confirmations",
        value: ledgerLabel,
        hint: "Findings with a confirmed ledger row vs total findings"
      }
    ];
  }, [summary]);

  async function loadSummary() {
    const response = await fetch(`${API_BASE_URL}/api/dashboard/summary`, {
      cache: "no-store"
    });
    if (!response.ok) {
      throw new Error("Failed to load dashboard summary");
    }
    const data = (await response.json()) as Summary;
    setSummary(data);
  }

  async function loadFindings() {
    const response = await fetch(`${API_BASE_URL}/api/findings`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Failed to load findings");
    }
    const data = (await response.json()) as { items: Finding[] };
    setFindings(data.items);
  }

  async function loadDetectionRuns() {
    const response = await fetch(`${API_BASE_URL}/api/detection/runs?limit=12`, {
      cache: "no-store"
    });
    if (!response.ok) {
      throw new Error("Failed to load detection runs");
    }
    const data = (await response.json()) as { items: DetectionRunRow[] };
    setDetectionRuns(data.items);
  }

  async function loadOwnersSection() {
    const [membersResponse, subsResponse] = await Promise.all([
      fetch(`${API_BASE_URL}/api/organization/members`, { cache: "no-store" }),
      fetch(`${API_BASE_URL}/api/subscriptions`, { cache: "no-store" })
    ]);
    if (membersResponse.ok) {
      const data = (await membersResponse.json()) as { items: OrgMember[] };
      setOrgMembers(data.items);
    } else {
      setOrgMembers([]);
    }
    if (subsResponse.ok) {
      const data = (await subsResponse.json()) as { items: SubscriptionApiItem[] };
      setSubscriptions(data.items);
    }
  }

  async function assignSubscriptionOwner(subscriptionId: string, ownerUserId: string | null) {
    setBusySubscriptionId(subscriptionId);
    setErrorMessage(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/subscriptions/${subscriptionId}/owner`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ownerUserId })
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to update owner");
      }
      await Promise.all([loadOwnersSection(), loadFindings(), loadSummary()]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Owner update failed");
    } finally {
      setBusySubscriptionId(null);
    }
  }

  async function downloadCsvExport(kind: "findings" | "savings") {
    setExportBusy(kind);
    setErrorMessage(null);
    try {
      const path = kind === "findings" ? "/api/export/findings.csv" : "/api/export/savings.csv";
      const url = new URL(path, API_BASE_URL);
      if (exportFrom.trim()) url.searchParams.set("from", exportFrom.trim());
      if (exportTo.trim()) url.searchParams.set("to", exportTo.trim());
      if (kind === "savings" && savingsBasisRealized) {
        url.searchParams.set("basis", "realized");
      }
      const response = await fetch(url.toString());
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Export failed");
      }
      const blob = await response.blob();
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = kind === "findings" ? "findings-export.csv" : "savings-ledger-export.csv";
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(href);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Export failed");
    } finally {
      setExportBusy(null);
    }
  }

  async function runDetection(options?: { fullReset?: boolean }) {
    setIsRunning(true);
    setErrorMessage(null);
    setLastRunResult(null);
    try {
      const url =
        options?.fullReset === true
          ? `${API_BASE_URL}/api/detection/run?reset=1`
          : `${API_BASE_URL}/api/detection/run`;
      const response = await fetch(url, {
        method: "POST"
      });
      if (!response.ok) {
        throw new Error("Detection API call failed");
      }
      const result = (await response.json()) as {
        ok?: boolean;
        message?: string;
        runId?: string;
        incremental?: boolean;
        fullReset?: boolean;
        scannedTransactions: number;
        detectedSubscriptions: number;
        generatedFindings: number;
        generatedDuplicateFindings?: number;
        removedStaleSubscriptions?: number;
        clearedTransientFindings?: number;
        durationMs?: number;
        avgCandidateConfidence?: number;
      };
      if (result.ok === false) {
        setLastRunResult(result.message ?? "Detection did not run.");
        return;
      }
      const lines = [
        `Scanned ${result.scannedTransactions} transactions, detected ${result.detectedSubscriptions} subscriptions, generated ${result.generatedFindings} findings (${result.generatedDuplicateFindings ?? 0} duplicate-type).`
      ];
      if (result.runId) {
        lines.push(
          `Run ${result.runId.slice(0, 8)}… in ${result.durationMs ?? 0} ms · avg candidate confidence ${((result.avgCandidateConfidence ?? 0) * 100).toFixed(0)}%.`
        );
      }
      if (result.fullReset) {
        lines.push("Mode: full reset (all findings, ledgers, and subscriptions for the org were cleared first).");
      } else if (result.incremental) {
        lines.push(
          `Mode: incremental — removed ${result.removedStaleSubscriptions ?? 0} stale subscription(s), cleared ${result.clearedTransientFindings ?? 0} open / in-review finding(s) without confirmed savings.`
        );
      }
      setLastRunResult(lines.join(" "));
      await Promise.all([loadSummary(), loadFindings(), loadDetectionRuns(), loadOwnersSection()]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Detection failed");
    } finally {
      setIsRunning(false);
    }
  }

  async function confirmSavings(findingId: string) {
    const previous = findings;
    const row = findings.find((f) => f.id === findingId);
    if (!row) return;
    setBusyFindingId(findingId);
    setErrorMessage(null);
    setFindings((current) =>
      current.map((f) =>
        f.id === findingId
          ? {
              ...f,
              status: "actioned",
              confirmedMonthlySaving: f.estimatedMonthlySaving,
              savingsRealizedAt: new Date().toISOString()
            }
          : f
      )
    );
    try {
      const response = await fetch(`${API_BASE_URL}/api/findings/${findingId}/confirm-savings`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({})
      });
      if (!response.ok) {
        throw new Error("Failed to confirm savings");
      }
      await Promise.all([loadSummary(), loadFindings()]);
    } catch (error) {
      setFindings(previous);
      setErrorMessage(error instanceof Error ? error.message : "Confirm savings failed");
    } finally {
      setBusyFindingId(null);
    }
  }

  async function updateFindingStatus(findingId: string, nextStatus: FindingStatus) {
    const previous = findings;
    setBusyFindingId(findingId);
    setErrorMessage(null);
    setFindings((current) =>
      current.map((item) => (item.id === findingId ? { ...item, status: nextStatus } : item))
    );
    try {
      const response = await fetch(`${API_BASE_URL}/api/findings/${findingId}/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });
      if (!response.ok) {
        throw new Error("Failed to update finding status");
      }
      await Promise.all([loadSummary(), loadFindings()]);
    } catch (error) {
      setFindings(previous);
      setErrorMessage(error instanceof Error ? error.message : "Failed to update finding");
    } finally {
      setBusyFindingId(null);
    }
  }

  useEffect(() => {
    Promise.all([loadSummary(), loadFindings(), loadDetectionRuns(), loadOwnersSection()]).catch((error) => {
      setErrorMessage(error instanceof Error ? error.message : "Could not load dashboard");
    });
  }, []);

  const visibleFindings = useMemo(() => {
    let list = findings;
    if (findingsFilter !== "all") {
      list = list.filter((item) => item.status === findingsFilter);
    }
    if (typeFilter !== "all") {
      list = list.filter((item) => item.type === typeFilter);
    }
    return [...list].sort((a, b) => {
      const diff = scoreForFinding(b) - scoreForFinding(a);
      if (diff !== 0) return diff;
      return b.estimatedMonthlySaving - a.estimatedMonthlySaving;
    });
  }, [findings, findingsFilter, typeFilter]);

  const filterButtons: { id: "all" | FindingStatus; label: string }[] = [
    { id: "all", label: "All" },
    { id: "open", label: "Open" },
    { id: "in_review", label: "In review" },
    { id: "actioned", label: "Actioned" }
  ];

  const typeFilterButtons: { id: "all" | FindingTypeKey; label: string }[] = [
    { id: "all", label: "All types" },
    { id: "duplicate", label: "Duplicate" },
    { id: "orphaned", label: "Orphaned" },
    { id: "review", label: "Review" },
    { id: "owner_gap", label: "Owner gap" }
  ];

  return (
    <main style={{ fontFamily: "Arial, sans-serif", padding: "2rem" }}>
      <h1 style={{ marginBottom: "0.75rem" }}>Subscription Recovery Dashboard</h1>
      <p style={{ marginBottom: "1.5rem" }}>
        Pilot view for finance teams. Connect bank data, detect recurring spend,
        and track recoverable savings.
      </p>
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", alignItems: "center", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => void runDetection()}
          disabled={isRunning}
          style={{
            background: isRunning ? "#9fb4ff" : "#1D4ED8",
            border: 0,
            color: "#fff",
            fontWeight: 700,
            minHeight: "44px",
            padding: "0 16px",
            borderRadius: "12px",
            cursor: isRunning ? "not-allowed" : "pointer"
          }}
        >
          {isRunning ? "Running..." : "Run Detection"}
        </button>
        <button
          type="button"
          onClick={() => void runDetection({ fullReset: true })}
          disabled={isRunning}
          title="Deletes all findings, savings ledger rows, and subscriptions for the demo org, then re-runs detection."
          style={{
            background: "transparent",
            border: "1px solid #94a3b8",
            color: "#475569",
            fontWeight: 600,
            minHeight: "44px",
            padding: "0 14px",
            borderRadius: "12px",
            cursor: isRunning ? "not-allowed" : "pointer"
          }}
        >
          Run (full reset)
        </button>
        {lastRunResult && <p style={{ margin: 0, color: "#2f4f4f" }}>{lastRunResult}</p>}
      </div>
      {errorMessage && <p style={{ color: "#B00020", marginTop: 0 }}>{errorMessage}</p>}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1rem"
        }}
      >
        {stats.map((item) => (
          <article
            key={item.label}
            style={{
              border: "1px solid #d9d9d9",
              borderRadius: "8px",
              padding: "1rem",
              background: "#fff"
            }}
          >
            <h2 style={{ fontSize: "0.95rem", margin: 0 }}>{item.label}</h2>
            <p style={{ fontSize: "1.4rem", fontWeight: 700, margin: "0.5rem 0 0" }}>
              {item.value}
            </p>
          </article>
        ))}
      </section>
      <h2 style={{ fontSize: "1.05rem", margin: "1.25rem 0 0.5rem", color: "#374151" }}>KPIs</h2>
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1rem"
        }}
      >
        {kpiStats.map((item) => (
          <article
            key={item.label}
            title={item.hint}
            style={{
              border: "1px solid #dbeafe",
              borderRadius: "8px",
              padding: "1rem",
              background: "#f8fafc"
            }}
          >
            <h2 style={{ fontSize: "0.95rem", margin: 0, color: "#475569" }}>{item.label}</h2>
            <p style={{ fontSize: "1.35rem", fontWeight: 700, margin: "0.5rem 0 0", color: "#0f172a" }}>
              {item.value}
            </p>
            <p style={{ fontSize: "0.75rem", color: "#64748b", margin: "0.35rem 0 0", lineHeight: 1.35 }}>
              {item.hint}
            </p>
          </article>
        ))}
      </section>
      <h2 style={{ fontSize: "1.05rem", margin: "1.25rem 0 0.5rem", color: "#374151" }}>Recent detection runs</h2>
      <section
        style={{
          overflowX: "auto",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          marginTop: "0.25rem",
          background: "#fff"
        }}
      >
        {detectionRuns.length === 0 ? (
          <p style={{ margin: "1rem", color: "#64748b" }}>
            No runs recorded yet. Run detection once to populate history (stored per organization).
          </p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
            <thead>
              <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
                <th style={{ padding: "0.5rem 0.65rem" }}>Finished</th>
                <th style={{ padding: "0.5rem 0.65rem" }}>Mode</th>
                <th style={{ padding: "0.5rem 0.65rem" }}>Ms</th>
                <th style={{ padding: "0.5rem 0.65rem" }}>Tx</th>
                <th style={{ padding: "0.5rem 0.65rem" }}>Cand</th>
                <th style={{ padding: "0.5rem 0.65rem" }}>Avg cand</th>
                <th style={{ padding: "0.5rem 0.65rem" }}>Subs</th>
                <th style={{ padding: "0.5rem 0.65rem" }}>Findings</th>
                <th style={{ padding: "0.5rem 0.65rem" }}>Dup</th>
                <th style={{ padding: "0.5rem 0.65rem" }}>Stale −</th>
                <th style={{ padding: "0.5rem 0.65rem" }}>Cleared</th>
              </tr>
            </thead>
            <tbody>
              {detectionRuns.map((r) => (
                <tr key={r.id} style={{ borderTop: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "0.45rem 0.65rem", whiteSpace: "nowrap" }}>
                    {new Date(r.finishedAt).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </td>
                  <td style={{ padding: "0.45rem 0.65rem" }}>
                    {r.fullReset ? "reset" : r.incremental ? "incr" : "—"}
                  </td>
                  <td style={{ padding: "0.45rem 0.65rem" }}>{r.durationMs}</td>
                  <td style={{ padding: "0.45rem 0.65rem" }}>{r.scannedTransactions}</td>
                  <td style={{ padding: "0.45rem 0.65rem" }}>{r.candidateCount}</td>
                  <td style={{ padding: "0.45rem 0.65rem" }}>
                    {Math.round(r.avgCandidateConfidence * 100)}%
                  </td>
                  <td style={{ padding: "0.45rem 0.65rem" }}>{r.detectedSubscriptions}</td>
                  <td style={{ padding: "0.45rem 0.65rem" }}>{r.generatedFindings}</td>
                  <td style={{ padding: "0.45rem 0.65rem" }}>{r.generatedDuplicateFindings}</td>
                  <td style={{ padding: "0.45rem 0.65rem" }}>{r.removedStaleSubscriptions}</td>
                  <td style={{ padding: "0.45rem 0.65rem" }}>{r.clearedTransientFindings}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <h2 style={{ fontSize: "1.05rem", margin: "1.25rem 0 0.5rem", color: "#374151" }}>CSV export</h2>
      <section
        style={{
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          padding: "1rem",
          marginTop: "0.25rem",
          background: "#fff",
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          alignItems: "flex-end"
        }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.85rem" }}>
          From (optional)
          <input
            type="date"
            value={exportFrom}
            onChange={(event) => setExportFrom(event.target.value)}
            style={{ padding: "0.35rem 0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.85rem" }}>
          To (optional)
          <input
            type="date"
            value={exportTo}
            onChange={(event) => setExportTo(event.target.value)}
            style={{ padding: "0.35rem 0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
          />
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={savingsBasisRealized}
            onChange={(event) => setSavingsBasisRealized(event.target.checked)}
          />
          Savings: filter by realized date
        </label>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            type="button"
            disabled={exportBusy !== null}
            onClick={() => void downloadCsvExport("findings")}
            style={{
              minHeight: "40px",
              padding: "0 14px",
              borderRadius: "10px",
              border: "1px solid #1D4ED8",
              background: exportBusy === "findings" ? "#e0e7ff" : "#fff",
              color: "#1e3a8a",
              fontWeight: 600,
              cursor: exportBusy !== null ? "wait" : "pointer"
            }}
          >
            {exportBusy === "findings" ? "Downloading…" : "Findings CSV"}
          </button>
          <button
            type="button"
            disabled={exportBusy !== null}
            onClick={() => void downloadCsvExport("savings")}
            style={{
              minHeight: "40px",
              padding: "0 14px",
              borderRadius: "10px",
              border: "1px solid #0f766e",
              background: exportBusy === "savings" ? "#ccfbf1" : "#fff",
              color: "#115e59",
              fontWeight: 600,
              cursor: exportBusy !== null ? "wait" : "pointer"
            }}
          >
            {exportBusy === "savings" ? "Downloading…" : "Savings ledger CSV"}
          </button>
        </div>
        <p style={{ margin: 0, fontSize: "0.78rem", color: "#64748b", flex: "1 1 220px" }}>
          Dates filter <strong>finding created_at</strong> (findings) or <strong>ledger created_at</strong> (savings),
          unless &quot;realized date&quot; is checked for savings (<code>basis=realized</code>).
        </p>
      </section>
      <h2 style={{ fontSize: "1.05rem", margin: "1.25rem 0 0.5rem", color: "#374151" }}>Subscription owners</h2>
      <p style={{ margin: "0 0 0.75rem", fontSize: "0.88rem", color: "#64748b", maxWidth: "52rem" }}>
        Assign a finance owner per detected subscription. After each detection run, subscriptions without an owner get
        an <strong>owner_gap</strong> finding until someone is assigned (then open owner_gap rows for that line close
        automatically).
      </p>
      <section
        style={{
          overflowX: "auto",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          marginBottom: "0.25rem",
          background: "#fff"
        }}
      >
        {subscriptions.length === 0 ? (
          <p style={{ margin: "1rem", color: "#64748b" }}>No subscriptions loaded.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
                <th style={{ padding: "0.5rem 0.65rem" }}>Merchant</th>
                <th style={{ padding: "0.5rem 0.65rem" }}>Avg / mo</th>
                <th style={{ padding: "0.5rem 0.65rem" }}>Owner</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((row) => (
                <tr key={row.id} style={{ borderTop: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "0.45rem 0.65rem" }}>
                    {row.merchant?.canonicalName ?? "—"}
                    <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{row.detectionKey}</div>
                  </td>
                  <td style={{ padding: "0.45rem 0.65rem", whiteSpace: "nowrap" }}>
                    {formatMoney(subscriptionAvgAmount(row))} {row.currency}
                  </td>
                  <td style={{ padding: "0.45rem 0.65rem" }}>
                    <select
                      aria-label={`Owner for ${row.merchant?.canonicalName ?? row.id}`}
                      disabled={busySubscriptionId === row.id || orgMembers.length === 0}
                      value={row.ownerUserId ?? ""}
                      onChange={(event) => {
                        const value = event.target.value;
                        void assignSubscriptionOwner(row.id, value === "" ? null : value);
                      }}
                      style={{
                        minWidth: "12rem",
                        padding: "0.35rem 0.5rem",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1"
                      }}
                    >
                      <option value="">Unassigned</option>
                      {orgMembers.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.email} ({member.role})
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <section style={{ marginTop: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
          <h2 style={{ margin: 0 }}>Latest Findings</h2>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.5rem" }}>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
              {filterButtons.map((filter) => {
                const isActive = findingsFilter === filter.id;
                return (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setFindingsFilter(filter.id)}
                    style={{
                      border: "1px solid #d0d7e1",
                      background: isActive ? "#1D4ED8" : "#fff",
                      color: isActive ? "#fff" : "#233045",
                      borderRadius: "999px",
                      minHeight: "36px",
                      padding: "0 12px",
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
              {typeFilterButtons.map((filter) => {
                const isActive = typeFilter === filter.id;
                return (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setTypeFilter(filter.id)}
                    style={{
                      border: "1px solid #d0d7e1",
                      background: isActive ? "#0F172A" : "#fff",
                      color: isActive ? "#fff" : "#233045",
                      borderRadius: "999px",
                      minHeight: "32px",
                      padding: "0 10px",
                      fontWeight: 600,
                      fontSize: "0.85rem",
                      cursor: "pointer"
                    }}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        {visibleFindings.length === 0 ? (
          <div
            style={{
              marginTop: "0.75rem",
              border: "1px solid #d9d9d9",
              borderRadius: "12px",
              background: "#fff",
              padding: "1rem",
              color: "#556071"
            }}
          >
            No findings for this filter yet.
          </div>
        ) : (
          <div style={{ marginTop: "0.75rem", overflowX: "auto", border: "1px solid #d9d9d9", borderRadius: "12px", background: "#fff" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", background: "#f8f9fc" }}>
                  <th style={{ padding: "0.8rem", width: "4.5rem" }}>Priority</th>
                  <th style={{ padding: "0.8rem" }}>Type</th>
                  <th style={{ padding: "0.8rem" }}>Title</th>
                  <th style={{ padding: "0.8rem" }}>Savings</th>
                  <th style={{ padding: "0.8rem" }}>Confidence</th>
                  <th style={{ padding: "0.8rem" }}>Status</th>
                  <th style={{ padding: "0.8rem" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleFindings.map((item) => {
                  const tier = tierForFinding(item);
                  return (
                  <tr key={item.id} style={{ borderTop: "1px solid #eff1f6" }}>
                    <td style={{ padding: "0.8rem", verticalAlign: "middle" }}>
                      <span title={`Impact ≈ ${scoreForFinding(item).toFixed(0)} (savings × confidence × type)`} style={priorityBadgeStyle(tier)}>
                        {tier}
                      </span>
                    </td>
                    <td style={{ padding: "0.8rem", textTransform: "capitalize" }}>{item.type.replaceAll("_", " ")}</td>
                    <td style={{ padding: "0.8rem", color: "#1f2a3a" }}>{item.title}</td>
                    <td style={{ padding: "0.8rem", fontWeight: 600 }}>
                      <div>
                        Est: {formatMoney(item.estimatedMonthlySaving)}{" "}
                        {item.subscription?.currency ?? ""}
                      </div>
                      {item.confirmedMonthlySaving != null && (
                        <div style={{ fontSize: "0.82rem", color: "#166534", fontWeight: 700, marginTop: 4 }}>
                          Confirmed: {formatMoney(item.confirmedMonthlySaving)}{" "}
                          {item.subscription?.currency ?? ""}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "0.8rem" }}>{Math.round(item.confidence * 100)}%</td>
                    <td style={{ padding: "0.8rem", textTransform: "capitalize" }}>{item.status.replaceAll("_", " ")}</td>
                    <td style={{ padding: "0.8rem" }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", alignItems: "center" }}>
                      {item.status !== "in_review" && (
                        <button
                          type="button"
                          onClick={() => updateFindingStatus(item.id, "in_review")}
                          disabled={busyFindingId === item.id}
                          style={{
                            marginRight: 0,
                            border: "1px solid #d0d7e1",
                            background: "#fff",
                            borderRadius: "8px",
                            minHeight: "30px",
                            padding: "0 10px",
                            cursor: "pointer"
                          }}
                        >
                          Review
                        </button>
                      )}
                      {item.status !== "actioned" && (
                        <button
                          type="button"
                          onClick={() => updateFindingStatus(item.id, "actioned")}
                          disabled={busyFindingId === item.id}
                          style={{
                            border: 0,
                            background: "#1D4ED8",
                            color: "#fff",
                            borderRadius: "8px",
                            minHeight: "30px",
                            padding: "0 10px",
                            cursor: "pointer"
                          }}
                        >
                          Mark actioned
                        </button>
                      )}
                      {item.confirmedMonthlySaving == null && item.status !== "closed" && (
                        <button
                          type="button"
                          onClick={() => confirmSavings(item.id)}
                          disabled={busyFindingId === item.id}
                          style={{
                            marginLeft: 0,
                            border: "1px solid #15803d",
                            background: "#f0fdf4",
                            color: "#14532d",
                            borderRadius: "8px",
                            minHeight: "30px",
                            padding: "0 10px",
                            cursor: "pointer",
                            fontWeight: 700
                          }}
                        >
                          Confirm savings
                        </button>
                      )}
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
