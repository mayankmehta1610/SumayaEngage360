/** Pure helpers for report KPI math — unit-tested without a database. */

export function funnelConversion(stages: { status: string; count: number }[]) {
  const ordered = [...stages].sort((a, b) => b.count - a.count);
  const total = stages.reduce((s, x) => s + x.count, 0);
  return ordered.map((s, i) => ({
    status: s.status,
    count: s.count,
    pctOfTotal: total ? Math.round((s.count / total) * 1000) / 10 : 0,
    conversionFromPrev:
      i === 0 || !ordered[i - 1].count
        ? 100
        : Math.round((s.count / ordered[i - 1].count) * 1000) / 10,
  }));
}

export function attritionRate(exits: number, avgHeadcount: number) {
  if (!avgHeadcount) return 0;
  return Math.round((exits / avgHeadcount) * 1000) / 10;
}

export function utilizationPct(allocated: number, capacity = 100) {
  if (!capacity) return 0;
  return Math.min(100, Math.round((allocated / capacity) * 1000) / 10);
}

export function benchEmployees(
  rows: { employeeId: string; allocatedPct: number }[],
  activeEmployeeIds: string[],
) {
  const alloc = new Map<string, number>();
  for (const r of rows) {
    alloc.set(r.employeeId, (alloc.get(r.employeeId) ?? 0) + r.allocatedPct);
  }
  return activeEmployeeIds
    .map((id) => ({ employeeId: id, allocatedPct: alloc.get(id) ?? 0 }))
    .filter((e) => e.allocatedPct < 100);
}

export function timesheetCompliance(submitted: number, draft: number, approved: number) {
  const total = submitted + draft + approved;
  return {
    total,
    submittedPct: total ? Math.round((submitted / total) * 1000) / 10 : 0,
    approvedPct: total ? Math.round((approved / total) * 1000) / 10 : 0,
    draftPct: total ? Math.round((draft / total) * 1000) / 10 : 0,
  };
}

export function avgDaysInStage(
  rows: { status: string; updatedAt: Date; createdAt: Date }[],
  now = new Date(),
) {
  const byStatus = new Map<string, number[]>();
  for (const r of rows) {
    const days = Math.max(0, (now.getTime() - new Date(r.updatedAt).getTime()) / 864e5);
    const list = byStatus.get(r.status) ?? [];
    list.push(days);
    byStatus.set(r.status, list);
  }
  return [...byStatus.entries()].map(([status, days]) => ({
    status,
    avgDays: days.length
      ? Math.round((days.reduce((a, b) => a + b, 0) / days.length) * 10) / 10
      : 0,
    count: days.length,
  }));
}
