import { createTaskDataAccess } from '../src/features/tasks/data';
import { growthDate, growthFixture, growthNow } from '../tests/helpers/growth-fixture';

async function main() {
  const f = await growthFixture();
  try {
    const metrics: Record<string, unknown> = {};
    function record<T>(name: string, action: () => T) {
      const result = f.measure(action);
      metrics[name] = { statements: result.count, rows: result.rows };
      return result.value;
    }
    const commitments = record('commitmentSummary', () => f.commitments.read());
    const id = commitments.items[0].commitment.id;
    const first = record('commitmentHistory1', () => f.commitments.readHistory(id));
    const second = record('commitmentHistory2', () => f.commitments.readHistory(id, first.nextBefore!));
    record('commitmentHistory3', () => f.commitments.readHistory(id, second.nextBefore!));
    record('fitnessSummary', () => f.fitness.readSummaries(1));
    record('fitnessHistory', () => f.fitness.readHistory(20));
    record('fitnessOverview', () => f.fitness.readOverview(20));
    record('workOverview', () => f.work.readOverview());
    const workPage = record('workHistory', () => f.work.readHistory());
    record('workHistory2', () => f.work.readHistory(20, workPage.next!));
    const tasks = createTaskDataAccess(f.db, () => 'unused', growthNow);
    // Use a fully materialized past range to isolate the read plan from generation.
    const range = f.measure(() => tasks.readRange({ from: '2026-01-01', to: '2026-01-31' }));
    metrics.taskRange = range.statements.filter((row) => row.sql.startsWith('select') && row.sql.includes('"task_occurrences"'))
      .map((row) => ({ sql: row.sql, params: row.params, rows: row.rows,
        plan: f.sqlite.prepare(`EXPLAIN QUERY PLAN ${row.sql}`).all(...row.params).map((plan) => plan.detail) }));
    metrics.fixture = { today: growthDate, commitments: 20, commitmentOccurrences: 1220, routines: 30,
      routineEntries: 90, workouts: 300, sets: 9600, workEntries: 1000, payments: 520, allocations: 1000, taskOccurrences: 5000 };
    console.log(JSON.stringify(metrics, null, 2));
  } finally { f.sqlite.close(); }
}
void main();
