import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { packageSchema, validatePackage, publicItem } from '../packages/contracts/src/content';

const pkg = packageSchema.parse(JSON.parse(readFileSync('curriculum/snapshot.json', 'utf8')));
it('publishes three times the chapter learning content with complete, unique relationships', () => {
  expect(validatePackage(pkg)).toMatchObject({ok: true});
  for (const [kind, count] of Object.entries({track:4, chapter:36, lesson:108, exercise:324, review_card:216, assessment:36, mission:3})) {
    expect(pkg.items.filter(item => item.kind === kind), kind).toHaveLength(count);
  }
  const chapters = pkg.items.filter(item => item.kind === 'chapter');
  const tracks = pkg.items.filter(item => item.kind === 'track');
  expect(tracks.flatMap(track => track.chapterIds).sort()).toEqual(chapters.map(chapter => chapter.id).sort());
  expect(new Set(pkg.items.filter(item => item.kind === 'lesson').map(item => item.title)).size).toBe(108);
  for (const chapter of chapters) {
    expect(tracks.find(track => track.id === chapter.trackId)?.chapterIds).toContain(chapter.id);
  }
});

it('retains existing identities and keeps expansion answer keys private', () => {
  expect(pkg.items.find(item => item.id === 'v1-l01')).toMatchObject({kind:'lesson', chapterId:'v1-ch01'});
  const newLessons = pkg.items.filter(item => item.kind === 'lesson' && Number(item.id.slice(4)) > 36);
  expect(newLessons).toHaveLength(72);
  const ids = new Set(newLessons.map(item => item.id));
  const exercises = pkg.items.filter(item => item.kind === 'exercise' && ids.has(item.lessonId));
  expect(exercises.filter(item => item.kind === 'exercise' && item.grading.kind === 'function-cases')).toHaveLength(12);
  for (const item of exercises) {
    const publicJson = JSON.stringify(publicItem(item));
    expect(publicJson).not.toContain('correctIds');
    expect(publicJson).not.toContain('modelAnswer');
    expect(publicJson).not.toContain('mutants');
    expect(publicJson).not.toContain('"solution"');
  }
});
