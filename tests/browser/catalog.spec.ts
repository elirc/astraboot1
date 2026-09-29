import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { packageSchema, publicItem } from '../../packages/contracts/src/content';

const pkg = packageSchema.parse(JSON.parse(readFileSync('curriculum/snapshot.json', 'utf8')));
const chapters = pkg.items.filter(item => item.kind === 'chapter').map(item => ({...publicItem(item), progress: [], placedOut: false}));
const tracks = pkg.items.filter(item => item.kind === 'track').map(publicItem);
test.beforeEach(async ({page}) => {
  await page.route('**/api/v1/**', async route => {
    const url = new URL(route.request().url());
    let data: unknown = {};
    let meta: unknown;
    if (url.pathname.endsWith('/auth/me')) data = {id:'catalog-owner', email:'owner@example.test', csrfToken:'test', theme:'light'};
    else if (url.pathname.endsWith('/progress')) data = {totalXP:0, level:1, dueReviews:0, lessons:[], missions:[], concepts:[], totalLessonCount:108};
    else if (url.pathname.endsWith('/curriculum')) {
      const query = (url.searchParams.get('q') ?? '').toLowerCase();
      const track = url.searchParams.get('track');
      const limit = Number(url.searchParams.get('limit') ?? 20);
      const offset = Number(url.searchParams.get('cursor') ?? 0);
      const filtered = chapters.filter(item => item.kind === 'chapter' && item.title.toLowerCase().includes(query) && (!track || item.trackId === track));
      data = filtered.slice(offset, offset + limit);
      meta = {tracks, nextCursor: offset + limit < filtered.length ? String(offset + limit) : null};
    } else if (url.pathname.includes('/chapters/') || url.pathname.includes('/lessons/')) {
      const item = pkg.items.find(item => item.id === url.pathname.split('/').at(-1));
      data = item ? publicItem(item) : {};
    } else if (url.pathname.endsWith('/settings')) data = {timezone:'UTC'};
    await route.fulfill({contentType:'application/json', body:JSON.stringify({data, meta})});
  });
});

test('expanded library supports pagination, shareable filters, and empty-state recovery', async ({page}) => {
  await page.goto('/learn');
  await expect(page.getByRole('heading', {name:'Build skills. Go deeper.'})).toBeVisible();
  await expect(page.getByLabel('Learning library overview')).toContainText('108');
  await expect(page.getByRole('link', {name:/JavaScript collections and lookup/})).toBeVisible();
  await page.getByRole('button', {name:'Load more chapters'}).click();
  await expect(page.getByRole('link', {name:/Performance diagnosis and operations/})).toBeVisible();
  await page.getByRole('button', {name:'Explore Interface craft'}).click();
  await expect(page).toHaveURL(/track=interface-craft/);
  await expect(page.getByRole('link', {name:/CSS layout foundations/})).toBeVisible();
  await expect(page.getByRole('link', {name:/JavaScript collections and lookup/})).toHaveCount(0);
  await page.getByLabel('Find a chapter').fill('responsive');
  await expect(page.getByLabel('Find a chapter')).toBeFocused();
  await expect(page.getByRole('link', {name:/CSS responsive reading/})).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Find a chapter')).toHaveValue('responsive');
  await expect(page.getByLabel('Track', {exact:true})).toHaveValue('interface-craft');
  await page.getByLabel('Find a chapter').fill('no-such-topic');
  await expect(page.getByRole('heading', {name:'No chapters match these filters.'})).toBeVisible();
  await page.getByRole('button', {name:'Show all chapters', exact:true}).click();
  await expect(page.getByLabel('Find a chapter')).toHaveValue('');
  await expect(page.getByLabel('Track', {exact:true})).toHaveValue('');
});

test('library reflows on mobile and opens an expansion chapter', async ({page}) => {
  await page.setViewportSize({width:360,height:780});
  await page.goto('/learn?track=javascript-depth');
  await expect(page.getByRole('button', {name:'Show all paths instead of JavaScript in depth'})).toHaveAttribute('aria-pressed','true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('link', {name:/JavaScript collections and lookup/}).click();
  await expect(page.getByRole('heading', {name:'JavaScript collections and lookup'})).toBeVisible();
  await expect(page.getByRole('link', {name:/Deduplicate with a Set/})).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
