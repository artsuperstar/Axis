// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import journal from './meta/_journal.json';
import m0000 from './0000_tasks_initial.sql';
import m0001 from './0001_recurring_tasks.sql';
import m0002 from './0002_finance_ledger.sql';
import m0003 from './0003_finance_commitments.sql';
import m0004 from './0004_work_balance.sql';
import m0005 from './0005_fitness_foundation.sql';
import m0006 from './0006_journal_foundation.sql';
import m0007 from './0007_journal_drafts.sql';
import m0008 from './0008_task_occurrence_date_index.sql';

export default { journal, migrations: { m0000, m0001, m0002, m0003, m0004, m0005, m0006, m0007, m0008 } };
