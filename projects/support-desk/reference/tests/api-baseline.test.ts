// @vitest-environment node
import {test,expect,afterAll} from 'vitest';import {buildApp} from '../api/app';import {db} from '../api/db';const app=buildApp();afterAll(async()=>{await app.close();await db.$disconnect();});
test('API starts and migrated database is ready',async()=>{expect((await app.inject('/health/live')).statusCode).toBe(200);expect((await app.inject('/health/ready')).statusCode).toBe(200);expect(await db.user.count()).toBeGreaterThanOrEqual(0);});
