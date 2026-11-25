import 'dotenv/config';
import crypto from 'node:crypto';
import pg from 'pg';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hash } from './auth.js';

const { Pool } = pg;
const CONFIRMATION = 'CREATE_PRODUCTION_ADMIN';

function required(env, name) {
  const value = env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function configuration(env) {
  const databaseUrl = required(env, 'DATABASE_URL');
  if (!/^postgres(?:ql)?:\/\//i.test(databaseUrl)) throw new Error('DATABASE_URL must be a PostgreSQL connection string.');
  if (env.BOOTSTRAP_ADMIN_CONFIRM !== CONFIRMATION) throw new Error(`Set BOOTSTRAP_ADMIN_CONFIRM=${CONFIRMATION} to continue.`);
  return {
    databaseUrl,
    email: required(env, 'BOOTSTRAP_ADMIN_EMAIL').toLowerCase(),
    firstName: required(env, 'BOOTSTRAP_ADMIN_FIRST_NAME'),
    lastName: required(env, 'BOOTSTRAP_ADMIN_LAST_NAME'),
    organizationId: env.BOOTSTRAP_ORGANIZATION_ID?.trim() || null,
    organizationName: env.BOOTSTRAP_ORGANIZATION_NAME?.trim() || 'EnterpriseOS'
  };
}

export async function bootstrapAdmin({ env = process.env, createPool = options => new Pool(options), logger = console } = {}) {
  const config = configuration(env);
  const pool = createPool({ connectionString: config.databaseUrl });
  let client;
  let transactionStarted = false;

  try {
    client = await pool.connect();

await client.query('BEGIN');
transactionStarted = true;

await client.query(
  'SELECT pg_advisory_xact_lock(713245, 1)'
);
    const organizations = await client.query('SELECT id FROM organizations ORDER BY created_at');
    let organizationId = config.organizationId;

    if (organizations.rowCount === 0) {
      const created = await client.query('INSERT INTO organizations(name) VALUES($1) RETURNING id', [config.organizationName]);
      organizationId = created.rows[0].id;
    } else if (organizationId) {
      const selected = await client.query('SELECT id FROM organizations WHERE id=$1', [organizationId]);
      if (!selected.rowCount) throw new Error('BOOTSTRAP_ORGANIZATION_ID does not match an existing organization.');
    } else if (organizations.rowCount === 1) {
      organizationId = organizations.rows[0].id;
    } else {
      throw new Error('Multiple organizations exist. Set BOOTSTRAP_ORGANIZATION_ID to select one.');
    }

    const existing = await client.query("SELECT id FROM users WHERE organization_id=$1 AND role IN ('ADMIN','SUPER_ADMIN') LIMIT 1", [organizationId]);
    if (existing.rowCount) throw new Error('An administrator already exists in the selected organization.');

    const initialPassword = crypto.randomBytes(24).toString('base64url');
    const passwordHash = await hash(initialPassword);
    const created = await client.query("INSERT INTO users(organization_id,first_name,last_name,email,password_hash,role,must_change_password) VALUES($1,$2,$3,$4,$5,'SUPER_ADMIN',true) RETURNING id", [organizationId, config.firstName, config.lastName, config.email, passwordHash]);
    await client.query('COMMIT');
    transactionStarted = false;

    logger.log(`Bootstrap administrator created for ${config.email}. Initial password (displayed once): ${initialPassword}`);
    return { id: created.rows[0].id, organizationId };
  } catch (error) {
    if (transactionStarted) await client.query('ROLLBACK');
    throw error;
  } finally {
    client?.release();
    await pool.end();
  }
}

const isDirectExecution = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectExecution) {
  bootstrapAdmin().catch(error => {
    console.error(`Administrator bootstrap failed: ${error.message}`);
    process.exitCode = 1;
  });
}
