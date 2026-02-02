import { env, SELF } from 'cloudflare:test';
import { describe, it, expect, beforeAll } from 'vitest';

describe('Activity API Integration Tests', () => {
    const ADMIN_TOKEN = "dev-secret"; // Matches .dev.vars for local testing

    beforeAll(async () => {
        // Initialize the database with schema
        const schema = `
            CREATE TABLE IF NOT EXISTS status_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            section TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            position INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL,
            message TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
        `;
        // D1 doesn't support multiple statements in one call easily via worker API, 
        // but we can split by semicolon for simple schemas.
        for (const statement of schema.split(';')) {
            if (statement.trim()) {
                await (env.DB as any).prepare(statement).run();
            }
        }
    });

    it('GET / should return service info', async () => {
        const res = await SELF.fetch('http://example.com/');
        expect(res.status).toBe(200);
        const body: any = await res.json();
        expect(body.service).toBe('activity-api');
        expect(body.status).toBe('ok');
    });

    it('GET /status should return building and learning sections', async () => {
        const res = await SELF.fetch('http://example.com/status');
        expect(res.status).toBe(200);
        const body: any = await res.json();
        expect(body).toHaveProperty('building');
        expect(body).toHaveProperty('learning');
    });

    it('GET /logs should return an array', async () => {
        const res = await SELF.fetch('http://example.com/logs');
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(Array.isArray(body)).toBe(true);
    });

    it('POST /logs should block unauthorized requests', async () => {
        const res = await SELF.fetch('http://example.com/logs', {
            method: 'POST',
            body: JSON.stringify({ type: 'tech', message: 'test' }),
            headers: { 'Content-Type': 'application/json' }
        });
        expect(res.status).toBe(401);
    });

    it('POST /logs (Admin) should create a log', async () => {
        const res = await SELF.fetch('http://example.com/logs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-token': ADMIN_TOKEN
            },
            body: JSON.stringify({
                type: 'tech',
                message: 'Vitest integration test log'
            })
        });
        expect(res.status).toBe(200);
        const body: any = await res.json();
        expect(body.success).toBe(true);
    });

    it('POST /status (Admin) should create and then delete a status item', async () => {
        // 1. Create
        const createRes = await SELF.fetch('http://example.com/status', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-token': ADMIN_TOKEN
            },
            body: JSON.stringify({
                section: 'building',
                title: 'Vitest Test Item',
                description: 'Test description',
                position: 99
            })
        });
        expect(createRes.status).toBe(200);

        // 2. Verify it exists and get ID
        const listRes = await SELF.fetch('http://example.com/status');
        const listData: any = await listRes.json();
        const item = listData.building.find((i: any) => i.title === 'Vitest Test Item');
        expect(item).toBeDefined();
        const id = item.id;

        // 3. Delete
        const deleteRes = await SELF.fetch(`http://example.com/status/${id}`, {
            method: 'DELETE',
            headers: { 'x-admin-token': ADMIN_TOKEN }
        });
        expect(deleteRes.status).toBe(200);
    });

    it('GET /unknown should return 404', async () => {
        const res = await SELF.fetch('http://example.com/non-existent');
        expect(res.status).toBe(404);
    });
});
