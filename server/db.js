import pg from 'pg';
import { newDb, DataType } from 'pg-mem';
import crypto from 'node:crypto';
const { Pool } = pg;
export const isInMemory = !process.env.DATABASE_URL;
const memory = isInMemory;

if (memory && process.env.NODE_ENV === 'production') {
  throw new Error('DATABASE_URL is required in production. Refusing to use the in-memory database.');
}
const db = memory ? newDb({ autoCreateForeignKeyIndices: true }) : null;
if (memory) db.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
export const pool = memory ? newDbPool(db) : new Pool({ connectionString: process.env.DATABASE_URL });
function newDbPool(instance) { return new (instance.adapters.createPg().Pool)(); }
export const q = (text, params = []) => pool.query(text, params);

export async function migrate() {
  if (!memory) await q(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
  await q(`
  CREATE TABLE IF NOT EXISTS organizations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, created_at timestamptz DEFAULT now());
  CREATE TABLE IF NOT EXISTS departments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid REFERENCES organizations(id), name text NOT NULL, head_name text, active boolean DEFAULT true, UNIQUE(organization_id,name));
  CREATE TABLE IF NOT EXISTS users(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid REFERENCES organizations(id), first_name text NOT NULL, last_name text NOT NULL, email text NOT NULL, password_hash text NOT NULL, role text NOT NULL CHECK(role IN ('SUPER_ADMIN','ADMIN','MANAGER','EMPLOYEE')), department_id uuid REFERENCES departments(id), manager_id uuid REFERENCES users(id), designation text, active boolean DEFAULT true, created_at timestamptz DEFAULT now(), UNIQUE(organization_id,email));
  CREATE TABLE IF NOT EXISTS attendance(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid REFERENCES organizations(id), user_id uuid REFERENCES users(id), work_date date NOT NULL, clock_in timestamptz, clock_out timestamptz, status text DEFAULT 'PRESENT', UNIQUE(user_id,work_date));
  CREATE TABLE IF NOT EXISTS leave_requests(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid REFERENCES organizations(id), user_id uuid REFERENCES users(id), leave_type text NOT NULL, start_date date NOT NULL, end_date date NOT NULL, reason text NOT NULL, status text NOT NULL DEFAULT 'PENDING', reviewed_by uuid REFERENCES users(id), reviewed_at timestamptz, created_at timestamptz DEFAULT now());
  CREATE TABLE IF NOT EXISTS projects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid REFERENCES organizations(id), name text NOT NULL, description text, status text NOT NULL DEFAULT 'ACTIVE', priority text DEFAULT 'MEDIUM', manager_id uuid REFERENCES users(id), due_date date, created_at timestamptz DEFAULT now());
  CREATE TABLE IF NOT EXISTS tasks(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid REFERENCES organizations(id), project_id uuid REFERENCES projects(id), title text NOT NULL, description text, assignee_id uuid REFERENCES users(id), creator_id uuid REFERENCES users(id), status text NOT NULL DEFAULT 'TODO', priority text NOT NULL DEFAULT 'MEDIUM', due_date date, estimated_hours numeric DEFAULT 0, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
  CREATE TABLE IF NOT EXISTS performance_reviews(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid REFERENCES organizations(id), employee_id uuid REFERENCES users(id), reviewer_id uuid REFERENCES users(id), rating int CHECK(rating BETWEEN 1 AND 5), feedback text, goals text, review_date date DEFAULT current_date);
  CREATE TABLE IF NOT EXISTS notifications(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid REFERENCES organizations(id), recipient_id uuid REFERENCES users(id), type text NOT NULL, title text NOT NULL, message text NOT NULL, read boolean DEFAULT false, created_at timestamptz DEFAULT now());
  CREATE TABLE IF NOT EXISTS audit_logs(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid REFERENCES organizations(id), actor_id uuid REFERENCES users(id), action text NOT NULL, entity text NOT NULL, entity_id uuid, metadata jsonb DEFAULT '{}', created_at timestamptz DEFAULT now());
  ALTER TABLE users ADD COLUMN IF NOT EXISTS manager_id uuid REFERENCES users(id);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;
  CREATE INDEX IF NOT EXISTS ix_tasks_tenant ON tasks(organization_id,status); CREATE INDEX IF NOT EXISTS ix_users_manager ON users(manager_id); CREATE INDEX IF NOT EXISTS ix_audit_tenant ON audit_logs(organization_id,created_at DESC);`);
}
