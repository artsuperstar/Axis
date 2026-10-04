import { sql, type SQLWrapper } from 'drizzle-orm';
import { check, foreignKey, index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const taskCategories = sqliteTable('task_categories', {
  id: text('id').primaryKey().notNull(),
  name: text('name').notNull(),
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  deletedAt: integer('deleted_at'),
}, (table) => [
  check('category_name_not_empty', sql`length(trim(${table.name})) > 0`),
  check('category_updated_after_created', sql`${table.updatedAt} >= ${table.createdAt}`),
  uniqueIndex('task_categories_active_name_unique')
    .on(sql`lower(${table.name})`)
    .where(sql`${table.deletedAt} IS NULL`),
]);

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey().notNull(),
  title: text('title').notNull(),
  description: text('description'),
  date: text('date'),
  time: text('time'),
  priority: text('priority', { enum: ['none', 'low', 'medium', 'high'] }).notNull().default('none'),
  categoryId: text('category_id').references(() => taskCategories.id, { onDelete: 'restrict' }),
  completedAt: integer('completed_at'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  deletedAt: integer('deleted_at'),
}, (table) => [
  check('task_title_not_empty', sql`length(trim(${table.title})) > 0`),
  check('task_priority_valid', sql`${table.priority} IN ('none', 'low', 'medium', 'high')`),
  check('task_date_valid', sql`${table.date} IS NULL OR (
    ${table.date} GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
    AND substr(${table.date}, 1, 4) >= '0001'
    AND coalesce(strftime('%Y-%m-%d', ${table.date}, '+0 days') = ${table.date}, 0)
  )`),
  check('task_time_valid', sql`${table.time} IS NULL OR (
    ${table.date} IS NOT NULL
    AND ${table.time} GLOB '[0-2][0-9]:[0-5][0-9]'
    AND substr(${table.time}, 1, 2) < '24'
  )`),
  check('task_updated_after_created', sql`${table.updatedAt} >= ${table.createdAt}`),
  index('tasks_active_date_idx').on(table.date).where(sql`${table.deletedAt} IS NULL`),
]);

// Versions retain the schedule needed to materialize older history after a rule changes.
export const taskRecurrences = sqliteTable('task_recurrences', {
  id: text('id').primaryKey().notNull(),
  taskId: text('task_id').notNull().references(() => tasks.id, { onDelete: 'restrict' }),
  frequency: text('frequency', { enum: ['daily', 'weekly', 'monthly', 'yearly'] }).notNull(),
  interval: integer('interval').notNull().default(1),
  weekdayMask: integer('weekday_mask'), // Monday = bit 0, Sunday = bit 6.
  monthDay: integer('month_day'),
  month: integer('month'),
  startDate: text('start_date').notNull(),
  scheduledTime: text('scheduled_time'),
  endDate: text('end_date'), // Inclusive; null means never.
  effectiveFrom: text('effective_from').notNull(),
  effectiveUntil: text('effective_until'), // Exclusive; null means open-ended.
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  deletedAt: integer('deleted_at'),
}, (table) => [
  index('task_recurrences_task_idx').on(table.taskId, table.effectiveFrom),
  check('recurrence_frequency_valid', sql`${table.frequency} IN ('daily', 'weekly', 'monthly', 'yearly')`),
  check('recurrence_interval_valid', sql`${table.interval} >= 1 AND (${table.frequency} != 'yearly' OR ${table.interval} = 1)`),
  check('recurrence_pattern_valid', sql`CASE ${table.frequency}
    WHEN 'weekly' THEN ${table.weekdayMask} BETWEEN 1 AND 127 AND ${table.monthDay} IS NULL AND ${table.month} IS NULL
    WHEN 'monthly' THEN ${table.weekdayMask} IS NULL AND ${table.monthDay} BETWEEN 1 AND 31 AND ${table.month} IS NULL
    WHEN 'yearly' THEN ${table.weekdayMask} IS NULL AND ${table.month} BETWEEN 1 AND 12 AND ${table.monthDay} BETWEEN 1 AND
      CASE ${table.month} WHEN 2 THEN 29 WHEN 4 THEN 30 WHEN 6 THEN 30 WHEN 9 THEN 30 WHEN 11 THEN 30 ELSE 31 END
    ELSE ${table.weekdayMask} IS NULL AND ${table.monthDay} IS NULL AND ${table.month} IS NULL
  END AND CASE ${table.frequency} WHEN 'weekly' THEN ${table.weekdayMask} IS NOT NULL
    WHEN 'monthly' THEN ${table.monthDay} IS NOT NULL
    WHEN 'yearly' THEN ${table.month} IS NOT NULL AND ${table.monthDay} IS NOT NULL ELSE 1 END`),
  check('recurrence_dates_valid', sql`
    ${table.startDate} GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND substr(${table.startDate}, 1, 4) >= '0001'
    AND coalesce(strftime('%Y-%m-%d', ${table.startDate}, '+0 days') = ${table.startDate}, 0)
    AND ${table.effectiveFrom} GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND substr(${table.effectiveFrom}, 1, 4) >= '0001'
    AND coalesce(strftime('%Y-%m-%d', ${table.effectiveFrom}, '+0 days') = ${table.effectiveFrom}, 0)
    AND (${table.endDate} IS NULL OR (${table.endDate} >= ${table.startDate}
      AND ${table.endDate} GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
      AND coalesce(strftime('%Y-%m-%d', ${table.endDate}, '+0 days') = ${table.endDate}, 0)))
    AND (${table.effectiveUntil} IS NULL OR (${table.effectiveUntil} > ${table.effectiveFrom}
      AND ${table.effectiveUntil} GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
      AND coalesce(strftime('%Y-%m-%d', ${table.effectiveUntil}, '+0 days') = ${table.effectiveUntil}, 0)))`),
  check('recurrence_time_valid', sql`${table.scheduledTime} IS NULL OR (${table.scheduledTime} GLOB '[0-2][0-9]:[0-5][0-9]' AND substr(${table.scheduledTime}, 1, 2) < '24')`),
  check('recurrence_updated_after_created', sql`${table.updatedAt} >= ${table.createdAt}`),
]);

export const taskOccurrences = sqliteTable('task_occurrences', {
  id: text('id').primaryKey().notNull(),
  taskId: text('task_id').notNull().references(() => tasks.id, { onDelete: 'restrict' }),
  recurrenceId: text('recurrence_id').notNull().references(() => taskRecurrences.id, { onDelete: 'restrict' }),
  scheduledDate: text('scheduled_date').notNull(),
  scheduledTime: text('scheduled_time'),
  status: text('status', { enum: ['pending', 'completed', 'skipped'] }).notNull().default('pending'),
  completedAt: integer('completed_at'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  deletedAt: integer('deleted_at'),
}, (table) => [
  uniqueIndex('task_occurrences_rule_date_unique').on(table.recurrenceId, table.scheduledDate),
  uniqueIndex('task_occurrences_active_task_date_unique').on(table.taskId, table.scheduledDate).where(sql`${table.deletedAt} IS NULL`),
  index('task_occurrences_history_idx').on(table.taskId, table.scheduledDate),
  check('occurrence_status_valid', sql`${table.status} IN ('pending', 'completed', 'skipped')`),
  check('occurrence_completion_valid', sql`(${table.status} = 'completed' AND ${table.completedAt} IS NOT NULL) OR (${table.status} != 'completed' AND ${table.completedAt} IS NULL)`),
  check('occurrence_date_valid', sql`${table.scheduledDate} GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND substr(${table.scheduledDate}, 1, 4) >= '0001' AND coalesce(strftime('%Y-%m-%d', ${table.scheduledDate}, '+0 days') = ${table.scheduledDate}, 0)`),
  check('occurrence_time_valid', sql`${table.scheduledTime} IS NULL OR (${table.scheduledTime} GLOB '[0-2][0-9]:[0-5][0-9]' AND substr(${table.scheduledTime}, 1, 2) < '24')`),
  check('occurrence_updated_after_created', sql`${table.updatedAt} >= ${table.createdAt}`),
]);

export const financeCategories = sqliteTable('finance_categories', {
  id: text('id').primaryKey().notNull(),
  name: text('name').notNull(),
  type: text('type', { enum: ['income', 'expense'] }).notNull(),
  isBuiltIn: integer('is_built_in', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  deletedAt: integer('deleted_at'),
}, (table) => [
  check('finance_category_name_not_empty', sql`length(trim(${table.name})) > 0`),
  check('finance_category_type_valid', sql`${table.type} IN ('income', 'expense')`),
  check('finance_category_builtin_valid', sql`${table.isBuiltIn} IN (0, 1)`),
  check('finance_category_updated_after_created', sql`${table.updatedAt} >= ${table.createdAt}`),
  uniqueIndex('finance_categories_id_type_unique').on(table.id, table.type),
  uniqueIndex('finance_categories_active_type_name_unique').on(table.type, sql`lower(${table.name})`).where(sql`${table.deletedAt} IS NULL`),
]);

export const financeTransactions = sqliteTable('finance_transactions', {
  id: text('id').primaryKey().notNull(),
  type: text('type', { enum: ['income', 'expense'] }).notNull(),
  amountMinor: integer('amount_minor').notNull(),
  description: text('description').notNull(),
  note: text('note'),
  transactionDate: text('transaction_date').notNull(),
  categoryId: text('category_id'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  deletedAt: integer('deleted_at'),
}, (table) => [
  uniqueIndex('finance_transactions_id_type_unique').on(table.id, table.type),
  // A composite FK enforces category direction while allowing category tombstones to stay referenced.
  foreignKey({ name: 'finance_transaction_category_type_fk', columns: [table.categoryId, table.type],
    foreignColumns: [financeCategories.id, financeCategories.type] }).onDelete('restrict').onUpdate('restrict'),
  check('finance_transaction_type_valid', sql`${table.type} IN ('income', 'expense')`),
  check('finance_transaction_amount_valid', sql`typeof(${table.amountMinor}) = 'integer' AND ${table.amountMinor} BETWEEN 1 AND 9007199254740991`),
  check('finance_transaction_description_not_empty', sql`length(trim(${table.description})) > 0`),
  check('finance_transaction_date_valid', sql`${table.transactionDate} GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
    AND substr(${table.transactionDate}, 1, 4) >= '0001'
    AND coalesce(strftime('%Y-%m-%d', ${table.transactionDate}, '+0 days') = ${table.transactionDate}, 0)`),
  check('finance_transaction_updated_after_created', sql`${table.updatedAt} >= ${table.createdAt}`),
  index('finance_transactions_active_date_idx').on(table.transactionDate, table.createdAt, table.id).where(sql`${table.deletedAt} IS NULL`),
  index('finance_transactions_category_idx').on(table.categoryId),
]);

function civilDate(column: SQLWrapper) {
  return sql`${column} GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND substr(${column}, 1, 4) >= '0001'
    AND coalesce(strftime('%Y-%m-%d', ${column}, '+0 days') = ${column}, 0)`;
}

export const financeCommitments = sqliteTable('finance_commitments', {
  id: text('id').primaryKey().notNull(),
  kind: text('kind', { enum: ['bill', 'subscription', 'installment'] }).notNull(),
  title: text('title').notNull(),
  categoryId: text('category_id'),
  categoryType: text('category_type', { enum: ['expense'] }).notNull().default('expense'),
  expectedAmountMinor: integer('expected_amount_minor').notNull(),
  installmentCount: integer('installment_count'),
  status: text('status', { enum: ['active', 'paused', 'ended', 'completed'] }).notNull().default('active'),
  completedAt: integer('completed_at'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  deletedAt: integer('deleted_at'),
}, (table) => [
  foreignKey({ columns: [table.categoryId, table.categoryType], foreignColumns: [financeCategories.id, financeCategories.type] }).onDelete('restrict').onUpdate('restrict'),
  check('commitment_kind_valid', sql`${table.kind} IN ('bill', 'subscription', 'installment')`),
  check('commitment_title_valid', sql`length(trim(${table.title})) > 0`),
  check('commitment_category_expense', sql`${table.categoryType} = 'expense'`),
  check('commitment_amount_valid', sql`typeof(${table.expectedAmountMinor}) = 'integer' AND ${table.expectedAmountMinor} BETWEEN 1 AND 9007199254740991`),
  check('commitment_installments_valid', sql`(${table.kind} = 'installment' AND ${table.installmentCount} IS NOT NULL AND typeof(${table.installmentCount}) = 'integer' AND ${table.installmentCount} BETWEEN 1 AND 1200)
    OR (${table.kind} != 'installment' AND ${table.installmentCount} IS NULL)`),
  check('commitment_status_valid', sql`${table.status} IN ('active', 'paused', 'ended', 'completed') AND (${table.status} != 'completed' OR ${table.kind} = 'installment')`),
  check('commitment_completion_valid', sql`(${table.status} = 'completed' AND ${table.completedAt} IS NOT NULL) OR (${table.status} != 'completed' AND ${table.completedAt} IS NULL)`),
  check('commitment_updated_valid', sql`${table.updatedAt} >= ${table.createdAt}`),
  index('finance_commitments_status_idx').on(table.status).where(sql`${table.deletedAt} IS NULL`),
]);

export const commitmentSchedules = sqliteTable('finance_commitment_schedules', {
  id: text('id').primaryKey().notNull(),
  commitmentId: text('commitment_id').notNull().references(() => financeCommitments.id, { onDelete: 'restrict' }),
  startDate: text('start_date').notNull(),
  billingDay: integer('billing_day').notNull(),
  firstInstallmentIndex: integer('first_installment_index').notNull().default(1),
  expectedAmountMinor: integer('expected_amount_minor').notNull(),
  effectiveFrom: text('effective_from').notNull(),
  effectiveUntil: text('effective_until'), // Exclusive. Empty versions allow same-day pause/resume/edit.
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => [
  uniqueIndex('commitment_schedules_id_parent_unique').on(table.id, table.commitmentId),
  index('commitment_schedules_parent_idx').on(table.commitmentId, table.effectiveFrom),
  check('commitment_schedule_day_valid', sql`${table.billingDay} BETWEEN 1 AND 31 AND typeof(${table.billingDay}) = 'integer'`),
  check('commitment_schedule_index_valid', sql`${table.firstInstallmentIndex} BETWEEN 1 AND 1200 AND typeof(${table.firstInstallmentIndex}) = 'integer'`),
  check('commitment_schedule_amount_valid', sql`typeof(${table.expectedAmountMinor}) = 'integer' AND ${table.expectedAmountMinor} BETWEEN 1 AND 9007199254740991`),
  check('commitment_schedule_dates_valid', sql`${civilDate(table.startDate)} AND ${civilDate(table.effectiveFrom)}
    AND (${table.effectiveUntil} IS NULL OR (${table.effectiveUntil} >= ${table.effectiveFrom} AND ${civilDate(table.effectiveUntil)}))`),
  check('commitment_schedule_updated_valid', sql`${table.updatedAt} >= ${table.createdAt}`),
]);

export const commitmentOccurrences = sqliteTable('finance_commitment_occurrences', {
  id: text('id').primaryKey().notNull(),
  commitmentId: text('commitment_id').notNull().references(() => financeCommitments.id, { onDelete: 'restrict' }),
  scheduleId: text('schedule_id').notNull(),
  dueDate: text('due_date').notNull(),
  expectedAmountMinor: integer('expected_amount_minor').notNull(),
  installmentIndex: integer('installment_index'),
  status: text('status', { enum: ['pending', 'paid', 'skipped'] }).notNull().default('pending'),
  paidTransactionId: text('paid_transaction_id'),
  paymentType: text('payment_type', { enum: ['expense'] }).notNull().default('expense'),
  resolvedAt: integer('resolved_at'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  deletedAt: integer('deleted_at'),
}, (table) => [
  foreignKey({ columns: [table.scheduleId, table.commitmentId], foreignColumns: [commitmentSchedules.id, commitmentSchedules.commitmentId] }).onDelete('restrict'),
  foreignKey({ columns: [table.paidTransactionId, table.paymentType], foreignColumns: [financeTransactions.id, financeTransactions.type] }).onDelete('restrict').onUpdate('restrict'),
  uniqueIndex('commitment_occurrences_parent_date_unique').on(table.commitmentId, table.dueDate),
  uniqueIndex('commitment_occurrences_installment_unique').on(table.commitmentId, table.installmentIndex),
  uniqueIndex('commitment_occurrences_payment_unique').on(table.paidTransactionId),
  index('commitment_occurrences_due_idx').on(table.dueDate, table.status).where(sql`${table.deletedAt} IS NULL`),
  check('commitment_occurrence_status_valid', sql`${table.status} IN ('pending', 'paid', 'skipped')`),
  check('commitment_occurrence_payment_valid', sql`${table.paymentType} = 'expense' AND
    ((${table.status} = 'paid' AND ${table.paidTransactionId} IS NOT NULL AND ${table.resolvedAt} IS NOT NULL)
    OR (${table.status} = 'skipped' AND ${table.paidTransactionId} IS NULL AND ${table.resolvedAt} IS NOT NULL)
    OR (${table.status} = 'pending' AND ${table.paidTransactionId} IS NULL AND ${table.resolvedAt} IS NULL))`),
  check('commitment_occurrence_amount_valid', sql`typeof(${table.expectedAmountMinor}) = 'integer' AND ${table.expectedAmountMinor} BETWEEN 1 AND 9007199254740991`),
  check('commitment_occurrence_index_valid', sql`${table.installmentIndex} IS NULL OR (typeof(${table.installmentIndex}) = 'integer' AND ${table.installmentIndex} BETWEEN 1 AND 1200)`),
  check('commitment_occurrence_date_valid', civilDate(table.dueDate)),
  check('commitment_occurrence_updated_valid', sql`${table.updatedAt} >= ${table.createdAt}`),
]);

export const workCounterparties = sqliteTable('work_counterparties', {
  id: text('id').primaryKey().notNull(), name: text('name').notNull(),
  createdAt: integer('created_at').notNull(), updatedAt: integer('updated_at').notNull(), deletedAt: integer('deleted_at'),
}, (table) => [
  check('work_counterparty_name_valid', sql`length(trim(${table.name})) > 0`),
  check('work_counterparty_updated_valid', sql`${table.updatedAt} >= ${table.createdAt}`),
  uniqueIndex('work_counterparties_active_name_unique').on(sql`lower(${table.name})`).where(sql`${table.deletedAt} IS NULL`),
]);

export const workEntries = sqliteTable('work_entries', {
  id: text('id').primaryKey().notNull(),
  counterpartyId: text('counterparty_id').notNull().references(() => workCounterparties.id, { onDelete: 'restrict' }),
  description: text('description').notNull(), compensationType: text('compensation_type', { enum: ['hourly', 'fixed'] }).notNull(),
  workDate: text('work_date').notNull(), durationMinutes: integer('duration_minutes'), hourlyRateMinor: integer('hourly_rate_minor'), fixedAmountMinor: integer('fixed_amount_minor'),
  expectedPaymentDate: text('expected_payment_date'),
  createdAt: integer('created_at').notNull(), updatedAt: integer('updated_at').notNull(), deletedAt: integer('deleted_at'),
}, (table) => [
  check('work_description_valid', sql`length(trim(${table.description})) > 0`),
  check('work_compensation_valid', sql`(${table.compensationType} = 'hourly' AND ${table.durationMinutes} IS NOT NULL AND ${table.hourlyRateMinor} IS NOT NULL
    AND typeof(${table.durationMinutes}) = 'integer' AND ${table.durationMinutes} BETWEEN 1 AND 9007199254740991
    AND typeof(${table.hourlyRateMinor}) = 'integer' AND ${table.hourlyRateMinor} BETWEEN 1 AND 9007199254740991 AND ${table.fixedAmountMinor} IS NULL)
    OR (${table.compensationType} = 'fixed' AND ${table.fixedAmountMinor} IS NOT NULL AND typeof(${table.fixedAmountMinor}) = 'integer'
    AND ${table.fixedAmountMinor} BETWEEN 1 AND 9007199254740991 AND ${table.durationMinutes} IS NULL AND ${table.hourlyRateMinor} IS NULL)`),
  check('work_dates_valid', sql`${civilDate(table.workDate)} AND (${table.expectedPaymentDate} IS NULL OR ${civilDate(table.expectedPaymentDate)})`),
  check('work_updated_valid', sql`${table.updatedAt} >= ${table.createdAt}`),
  index('work_entries_counterparty_idx').on(table.counterpartyId),
  index('work_entries_date_idx').on(table.workDate).where(sql`${table.deletedAt} IS NULL`),
  index('work_entries_expected_date_idx').on(table.expectedPaymentDate).where(sql`${table.deletedAt} IS NULL`),
]);

export const workPaymentAllocations = sqliteTable('work_payment_allocations', {
  id: text('id').primaryKey().notNull(),
  workEntryId: text('work_entry_id').notNull().references(() => workEntries.id, { onDelete: 'restrict' }),
  financeTransactionId: text('finance_transaction_id').notNull(),
  transactionType: text('transaction_type', { enum: ['income'] }).notNull().default('income'),
  amountMinor: integer('amount_minor').notNull(), createdAt: integer('created_at').notNull(), deletedAt: integer('deleted_at'),
}, (table) => [
  foreignKey({ columns: [table.financeTransactionId, table.transactionType], foreignColumns: [financeTransactions.id, financeTransactions.type] }).onDelete('restrict').onUpdate('restrict'),
  check('work_allocation_income_valid', sql`${table.transactionType} = 'income'`),
  check('work_allocation_amount_valid', sql`typeof(${table.amountMinor}) = 'integer' AND ${table.amountMinor} BETWEEN 1 AND 9007199254740991`),
  check('work_allocation_deleted_valid', sql`${table.deletedAt} IS NULL OR ${table.deletedAt} >= ${table.createdAt}`),
  uniqueIndex('work_allocations_entry_transaction_unique').on(table.workEntryId, table.financeTransactionId),
  index('work_allocations_entry_idx').on(table.workEntryId),
  index('work_allocations_transaction_idx').on(table.financeTransactionId),
]);
