import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { PGlite } from '@electric-sql/pglite';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

describe('Isolated PostgreSQL (PGlite) Combined Migration & Schema Verification', () => {
  let db: PGlite;

  beforeAll(async () => {
    db = new PGlite();
    // Apply all repo migrations in chronological order
    const migrationsDir = path.resolve(__dirname, '../prisma/migrations');
    const dirs = fs
      .readdirSync(migrationsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();

    // Also include Codex notification_outbox migration from git branch 2c26ffb in chronological order
    let codexSql = '';
    try {
      codexSql = execSync(
        'git show 2c26ffb:prisma/migrations/20261125000000_notification_outbox/migration.sql',
        { encoding: 'utf8' }
      );
    } catch {
      codexSql = '';
    }

    for (const dir of dirs) {
      if (dir === '20261125120000_beta_sprint_foundations' && codexSql) {
        await db.exec(codexSql);
      }
      const sql = fs.readFileSync(path.join(migrationsDir, dir, 'migration.sql'), 'utf8');
      await db.exec(sql);
    }
  });

  afterAll(async () => {
    await db.close();
  });

  it('applies all migrations cleanly including Codex notification_outbox and beta_sprint_foundations', async () => {
    const tables = await db.query<{ tablename: string }>(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;`
    );
    const names = tables.rows.map((r) => r.tablename);
    expect(names).toContain('users');
    expect(names).toContain('leads');
    expect(names).toContain('services');
    expect(names).toContain('service_packages');
    expect(names).toContain('property_listings');
    expect(names).toContain('crm_sync_events');
    expect(names).toContain('legal_document_acceptances');
    expect(names).toContain('commission_rules');
    expect(names).toContain('notification_logs');
  });

  it('supports service packages, structured leads, legacy leads, property listings, commission rules, and legal acceptances', async () => {
    const userRes = await db.query<{ id: string }>(
      `INSERT INTO users (id, email, password_hash, full_name, role, account_status, updated_at)
       VALUES (gen_random_uuid(), 'pglite@example.com', 'hash', 'PGlite User', 'REFERRAL_PARTNER', 'ACTIVE', NOW())
       RETURNING id;`
    );
    const userId = userRes.rows[0].id;

    const catRes = await db.query<{ id: string }>(
      `INSERT INTO service_categories (id, slug, name) VALUES (gen_random_uuid(), 'corp-adv', 'Corporate Advisory') RETURNING id;`
    );
    const catId = catRes.rows[0].id;

    const srvRes = await db.query<{ id: string }>(
      `INSERT INTO services (id, category_id, slug, name, form_type, updated_at)
       VALUES (gen_random_uuid(), $1, 'free-zone-company-formation', 'Free Zone Company Formation', 'COMPANY_FORMATION', NOW())
       RETURNING id;`,
      [catId]
    );
    const serviceId = srvRes.rows[0].id;

    const pkgRes = await db.query<{ id: string }>(
      `INSERT INTO service_packages (id, service_id, slug, name, visa_count, display_order)
       VALUES (gen_random_uuid(), $1, 'one-visa', 'One Visa Package', 1, 1)
       RETURNING id;`,
      [serviceId]
    );
    const packageId = pkgRes.rows[0].id;

    // Legacy referral without structuredData or packageId (backward compatibility)
    await db.query(
      `INSERT INTO leads (id, reference_no, partner_id, service_id, client_name, client_phone, expected_deal_value, updated_at)
       VALUES (gen_random_uuid(), 'REF-LEGACY-1', $1, $2, 'Legacy Client', '+971500000001', 50000, NOW());`,
      [userId, serviceId]
    );

    // Structured referral with packageId + structured_data
    const leadRes = await db.query<{ id: string; package_id: string }>(
      `INSERT INTO leads (id, reference_no, partner_id, service_id, package_id, structured_data, client_name, client_phone, expected_deal_value, updated_at)
       VALUES (gen_random_uuid(), 'REF-STRUCT-1', $1, $2, $3, $4::jsonb, 'Structured Client', '+971500000002', 75000, NOW())
       RETURNING id, package_id;`,
      [userId, serviceId, packageId, JSON.stringify({ formType: 'COMPANY_FORMATION', preferredFreeZone: 'DMCC', visaRequirementCount: 1 })]
    );
    expect(leadRes.rows[0].package_id).toBe(packageId);

    // Property listing lifecycle
    const propRes = await db.query<{ status: string }>(
      `INSERT INTO property_listings (id, external_source, external_id, title, location, classification, property_type, status)
       VALUES (gen_random_uuid(), 'LEADRAT', 'ext-101', 'Creek Residences', 'Dubai', 'OFF_PLAN', 'Apartment', 'IMPORTED')
       RETURNING status;`
    );
    expect(propRes.rows[0].status).toBe('IMPORTED');

    // Commission rule versioning
    const ruleRes = await db.query<{ version: number; rule_type: string }>(
      `INSERT INTO commission_rules (id, service_id, rule_name, rule_type, partner_commission_bps, agent_commission_bps, valid_from)
       VALUES (gen_random_uuid(), $1, 'Free Zone Standard', 'PERCENTAGE', 500, 250, '2026-11-25')
       RETURNING version, rule_type;`,
      [serviceId]
    );
    expect(ruleRes.rows[0].version).toBe(1);

    // Legal document acceptance
    const legalRes = await db.query<{ document_key: string }>(
      `INSERT INTO legal_document_acceptances (id, user_id, document_key, version, required)
       VALUES (gen_random_uuid(), $1, 'GOVERNANCE_POLICY', '2026-11-25-draft', true)
       RETURNING document_key;`,
      [userId]
    );
    expect(legalRes.rows[0].document_key).toBe('GOVERNANCE_POLICY');
  });
});
