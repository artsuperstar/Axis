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
  // Cross-task materialization and Calendar range reads include retained tombstones.
  index('task_occurrences_date_idx').on(table.scheduledDate),
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

// Fitness plans and actual performance have separate identities and lifecycles.
const fitnessTypes = ['strength', 'bodyweight', 'duration', 'distance'] as const;
const fitnessLifecycle = () => ({
  createdAt: integer('created_at').notNull(), updatedAt: integer('updated_at').notNull(), deletedAt: integer('deleted_at'),
});
const fitnessTargets = () => ({
  targetSetCount: integer('target_set_count'), targetRepMin: integer('target_rep_min'), targetRepMax: integer('target_rep_max'),
  targetDurationSeconds: integer('target_duration_seconds'), targetDistanceMeters: integer('target_distance_meters'),
});
const positiveFitnessInteger = (column: SQLWrapper) => sql`typeof(${column}) = 'integer' AND ${column} BETWEEN 1 AND 9007199254740991`;
const fitnessTargetCheck = (table: {
  measurementType: SQLWrapper; targetSetCount: SQLWrapper; targetRepMin: SQLWrapper; targetRepMax: SQLWrapper;
  targetDurationSeconds: SQLWrapper; targetDistanceMeters: SQLWrapper;
}) => sql`(${table.targetSetCount} IS NULL OR (typeof(${table.targetSetCount}) = 'integer' AND ${table.targetSetCount} BETWEEN 1 AND 100))
  AND ((${table.targetRepMin} IS NULL AND ${table.targetRepMax} IS NULL)
    OR (${table.measurementType} IN ('strength', 'bodyweight') AND ${table.targetRepMin} IS NOT NULL AND ${table.targetRepMax} IS NOT NULL
      AND ${positiveFitnessInteger(table.targetRepMin)} AND ${positiveFitnessInteger(table.targetRepMax)} AND ${table.targetRepMax} >= ${table.targetRepMin}))
  AND (${table.targetDurationSeconds} IS NULL OR (${table.measurementType} = 'duration' AND ${positiveFitnessInteger(table.targetDurationSeconds)}))
  AND (${table.targetDistanceMeters} IS NULL OR (${table.measurementType} = 'distance' AND ${positiveFitnessInteger(table.targetDistanceMeters)}))`;

export const fitnessExercises = sqliteTable('fitness_exercises', {
  id: text('id').primaryKey().notNull(), name: text('name').notNull(),
  measurementType: text('measurement_type', { enum: fitnessTypes }).notNull(),
  isBuiltIn: integer('is_built_in', { mode: 'boolean' }).notNull().default(false), ...fitnessLifecycle(),
}, (table) => [
  check('fitness_exercise_name_valid', sql`length(trim(${table.name})) BETWEEN 1 AND 120`),
  check('fitness_exercise_type_valid', sql`${table.measurementType} IN ('strength', 'bodyweight', 'duration', 'distance')`),
  check('fitness_exercise_builtin_valid', sql`${table.isBuiltIn} IN (0, 1)`),
  check('fitness_exercise_updated_valid', sql`${table.updatedAt} >= ${table.createdAt}`),
  uniqueIndex('fitness_exercise_id_type_unique').on(table.id, table.measurementType),
  uniqueIndex('fitness_exercise_active_name_unique').on(sql`lower(${table.name})`).where(sql`${table.deletedAt} IS NULL`),
]);

export const fitnessRoutines = sqliteTable('fitness_routines', {
  id: text('id').primaryKey().notNull(), name: text('name').notNull(), ...fitnessLifecycle(),
}, (table) => [
  check('fitness_routine_name_valid', sql`length(trim(${table.name})) BETWEEN 1 AND 120`),
  check('fitness_routine_updated_valid', sql`${table.updatedAt} >= ${table.createdAt}`),
  uniqueIndex('fitness_routine_active_name_unique').on(sql`lower(${table.name})`).where(sql`${table.deletedAt} IS NULL`),
]);

export const fitnessRoutineExercises = sqliteTable('fitness_routine_exercises', {
  id: text('id').primaryKey().notNull(), routineId: text('routine_id').notNull().references(() => fitnessRoutines.id, { onDelete: 'restrict' }),
  exerciseId: text('exercise_id').notNull(), measurementType: text('measurement_type', { enum: fitnessTypes }).notNull(),
  position: integer('position').notNull(), ...fitnessTargets(), ...fitnessLifecycle(),
}, (table) => [
  foreignKey({ columns: [table.exerciseId, table.measurementType], foreignColumns: [fitnessExercises.id, fitnessExercises.measurementType] }).onDelete('restrict').onUpdate('restrict'),
  check('fitness_routine_exercise_position_valid', sql`typeof(${table.position}) = 'integer' AND ${table.position} BETWEEN 0 AND 9007199254740991`),
  check('fitness_routine_targets_valid', fitnessTargetCheck(table)),
  check('fitness_routine_exercise_updated_valid', sql`${table.updatedAt} >= ${table.createdAt}`),
  uniqueIndex('fitness_routine_exercise_position_unique').on(table.routineId, table.position).where(sql`${table.deletedAt} IS NULL`),
]);

export const fitnessSessions = sqliteTable('fitness_workout_sessions', {
  id: text('id').primaryKey().notNull(), routineId: text('routine_id').references(() => fitnessRoutines.id, { onDelete: 'restrict' }),
  name: text('name').notNull(), startedAt: integer('started_at').notNull(), completedAt: integer('completed_at'), note: text('note'), ...fitnessLifecycle(),
}, (table) => [
  check('fitness_session_name_valid', sql`length(trim(${table.name})) BETWEEN 1 AND 120`),
  check('fitness_session_completed_valid', sql`${table.completedAt} IS NULL OR ${table.completedAt} >= ${table.startedAt}`),
  check('fitness_session_updated_valid', sql`${table.updatedAt} >= ${table.createdAt}`),
  uniqueIndex('fitness_one_active_session').on(sql`(1)`).where(sql`${table.completedAt} IS NULL AND ${table.deletedAt} IS NULL`),
  index('fitness_session_history_idx').on(table.completedAt, table.id).where(sql`${table.deletedAt} IS NULL AND ${table.completedAt} IS NOT NULL`),
]);

export const fitnessSessionExercises = sqliteTable('fitness_session_exercises', {
  id: text('id').primaryKey().notNull(), sessionId: text('session_id').notNull().references(() => fitnessSessions.id, { onDelete: 'restrict' }),
  exerciseId: text('exercise_id').notNull(), exerciseName: text('exercise_name').notNull(),
  measurementType: text('measurement_type', { enum: fitnessTypes }).notNull(), position: integer('position').notNull(), note: text('note'),
  ...fitnessTargets(), ...fitnessLifecycle(),
}, (table) => [
  foreignKey({ columns: [table.exerciseId, table.measurementType], foreignColumns: [fitnessExercises.id, fitnessExercises.measurementType] }).onDelete('restrict').onUpdate('restrict'),
  check('fitness_session_exercise_name_valid', sql`length(trim(${table.exerciseName})) BETWEEN 1 AND 120`),
  check('fitness_session_exercise_position_valid', sql`typeof(${table.position}) = 'integer' AND ${table.position} BETWEEN 0 AND 9007199254740991`),
  check('fitness_session_targets_valid', fitnessTargetCheck(table)),
  check('fitness_session_exercise_updated_valid', sql`${table.updatedAt} >= ${table.createdAt}`),
  uniqueIndex('fitness_session_exercise_id_type_unique').on(table.id, table.measurementType),
  uniqueIndex('fitness_session_exercise_position_unique').on(table.sessionId, table.position).where(sql`${table.deletedAt} IS NULL`),
]);

export const fitnessSets = sqliteTable('fitness_sets', {
  id: text('id').primaryKey().notNull(), sessionExerciseId: text('session_exercise_id').notNull(),
  measurementType: text('measurement_type', { enum: fitnessTypes }).notNull(), position: integer('position').notNull(),
  weightGrams: integer('weight_grams'), reps: integer('reps'), durationSeconds: integer('duration_seconds'), distanceMeters: integer('distance_meters'),
  ...fitnessLifecycle(),
}, (table) => [
  foreignKey({ columns: [table.sessionExerciseId, table.measurementType], foreignColumns: [fitnessSessionExercises.id, fitnessSessionExercises.measurementType] }).onDelete('restrict').onUpdate('restrict'),
  check('fitness_set_position_valid', sql`typeof(${table.position}) = 'integer' AND ${table.position} BETWEEN 0 AND 9007199254740991`),
  check('fitness_set_values_valid', sql`
    (${table.measurementType} = 'strength' AND ${table.weightGrams} IS NOT NULL AND typeof(${table.weightGrams}) = 'integer' AND ${table.weightGrams} BETWEEN 0 AND 9007199254740991
      AND ${table.reps} IS NOT NULL AND ${positiveFitnessInteger(table.reps)} AND ${table.durationSeconds} IS NULL AND ${table.distanceMeters} IS NULL)
    OR (${table.measurementType} = 'bodyweight' AND ${table.reps} IS NOT NULL AND ${positiveFitnessInteger(table.reps)}
      AND (${table.weightGrams} IS NULL OR ${positiveFitnessInteger(table.weightGrams)}) AND ${table.durationSeconds} IS NULL AND ${table.distanceMeters} IS NULL)
    OR (${table.measurementType} = 'duration' AND ${table.durationSeconds} IS NOT NULL AND ${positiveFitnessInteger(table.durationSeconds)}
      AND ${table.weightGrams} IS NULL AND ${table.reps} IS NULL AND ${table.distanceMeters} IS NULL)
    OR (${table.measurementType} = 'distance' AND ${table.distanceMeters} IS NOT NULL AND ${positiveFitnessInteger(table.distanceMeters)}
      AND (${table.durationSeconds} IS NULL OR ${positiveFitnessInteger(table.durationSeconds)}) AND ${table.weightGrams} IS NULL AND ${table.reps} IS NULL)`),
  check('fitness_set_updated_valid', sql`${table.updatedAt} >= ${table.createdAt}`),
  uniqueIndex('fitness_set_position_unique').on(table.sessionExerciseId, table.position).where(sql`${table.deletedAt} IS NULL`),
]);

export const journalEntries = sqliteTable('journal_entries', {
  id: text('id').primaryKey().notNull(),
  entryDate: text('entry_date').notNull(),
  content: text('content').notNull(),
  mood: text('mood', { enum: ['great', 'good', 'okay', 'low', 'bad'] }),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  deletedAt: integer('deleted_at'),
}, (table) => [
  check('journal_date_valid', civilDate(table.entryDate)),
  check('journal_mood_valid', sql`${table.mood} IS NULL OR ${table.mood} IN ('great', 'good', 'okay', 'low', 'bad')`),
  check('journal_content_valid', sql`typeof(${table.content}) = 'text' AND (length(trim(${table.content}, ' ' || char(9) || char(10) || char(13))) > 0 OR ${table.mood} IS NOT NULL OR ${table.deletedAt} IS NOT NULL)`),
  check('journal_timestamps_valid', sql`typeof(${table.createdAt}) = 'integer' AND ${table.createdAt} BETWEEN 0 AND 9007199254740991
    AND typeof(${table.updatedAt}) = 'integer' AND ${table.updatedAt} BETWEEN ${table.createdAt} AND 9007199254740991
    AND (${table.deletedAt} IS NULL OR (typeof(${table.deletedAt}) = 'integer' AND ${table.deletedAt} BETWEEN ${table.createdAt} AND ${table.updatedAt}))`),
  uniqueIndex('journal_active_date_unique').on(table.entryDate).where(sql`${table.deletedAt} IS NULL`),
]);

// Recovery state is separate from authoritative entries and survives saved-entry deletion/recreation.
export const journalDrafts = sqliteTable('journal_drafts', {
  entryDate: text('entry_date').primaryKey().notNull(),
  content: text('content').notNull(),
  mood: text('mood', { enum: ['great', 'good', 'okay', 'low', 'bad'] }),
  updatedAt: integer('updated_at').notNull(),
  baseEntryId: text('base_entry_id'),
  baseEntryUpdatedAt: integer('base_entry_updated_at'),
}, (table) => [
  check('journal_draft_date_valid', civilDate(table.entryDate)),
  check('journal_draft_mood_valid', sql`${table.mood} IS NULL OR ${table.mood} IN ('great', 'good', 'okay', 'low', 'bad')`),
  check('journal_draft_content_valid', sql`typeof(${table.content}) = 'text' AND (length(trim(${table.content}, ' ' || char(9) || char(10) || char(13))) > 0 OR ${table.mood} IS NOT NULL OR ${table.baseEntryId} IS NOT NULL)`),
  check('journal_draft_updated_valid', sql`typeof(${table.updatedAt}) = 'integer' AND ${table.updatedAt} BETWEEN 0 AND 9007199254740991`),
  check('journal_draft_base_valid', sql`(${table.baseEntryId} IS NULL AND ${table.baseEntryUpdatedAt} IS NULL)
    OR (${table.baseEntryId} IS NOT NULL AND length(trim(${table.baseEntryId})) > 0 AND ${table.baseEntryUpdatedAt} IS NOT NULL
      AND typeof(${table.baseEntryUpdatedAt}) = 'integer' AND ${table.baseEntryUpdatedAt} BETWEEN 0 AND 9007199254740991)`),
]);
