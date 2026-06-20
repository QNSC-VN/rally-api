/**
 * Drizzle schema registry — re-exports all table definitions grouped by Postgres schema.
 * Drizzle-kit and DrizzleProvider both import from this single entry point.
 *
 * Table definitions are generated/maintained per bounded context under their
 * corresponding subdirectory. Add new schema files here as they are created.
 */

// ── tenancy schema ─────────────────────────────────────────────────────────
export * from './tenancy';

// ── identity schema ────────────────────────────────────────────────────────
export * from './identity';

// ── access schema ──────────────────────────────────────────────────────────
export * from './access';

// ── work schema ────────────────────────────────────────────────────────────
export * from './work';

// ── messaging schema ──────────────────────────────────────────────────────
export * from './messaging';
