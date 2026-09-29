import { chapter, identity, pick, explain, recall, transfer } from './helpers.mjs';
import javascript from './expansion-javascript.mjs';
import interfaces from './expansion-interfaces.mjs';
import engineering from './expansion-engineering.mjs';
import coding from './expansion-coding.mjs';

// Each lesson supplies its own explanation, example, misconception, decision,
// and applied task. Shared code only assembles the existing content contract.
const tracks = [
  ['javascript-depth', 'JavaScript in depth', 'Build reliable transformations, model state, and reason about asynchronous work.', javascript, 'v1-ch05'],
  ['interface-craft', 'Interface craft', 'Build responsive, accessible interfaces with deliberate React state and browser behavior.', interfaces, 'v1-ch08'],
  ['engineering-practice', 'Engineering practice', 'Make data contracts, tests, delivery, and production diagnosis part of everyday development.', engineering, 'v1-ch12'],
];
function decision(spec, index, label = 'Choose the behavior') {
  const [, , , , , question, answer, wrong, reason] = spec;
  const correct = index % 3;
  const options = [...wrong]; options.splice(correct, 0, answer);
  const feedback = options.map((option) => option === answer ? reason : `This does not satisfy the stated contract. ${reason}`);
  return pick(label, question, options, correct, feedback,
    [spec[4], 'Trace the example against the stated contract.', reason], 'code-reading', 'apply');
}
function lesson(spec, index, reference) {
  const [title, concept, body, example, mistake, , answer, , reason, task, model] = spec;
  return {
    title, concept, body, example, minutes: 10,
    objectives: [`Apply ${title.toLowerCase()} to a concrete implementation.`, `Diagnose and test the boundary: ${mistake}`],
    mistakes: [mistake], summary: reason, references: [reference],
    exercises: [
      decision(spec, index),
      coding.get(concept) ?? explain('Apply it: ' + title, task,
        ['Explain the behavior required by this scenario.', 'Include a concrete edge case and its expected result.'], model,
        [mistake, 'Write the expected result before choosing an implementation.', model], 'local-task'),
      explain('Review it: ' + title, `A teammate proposes this shortcut: “${mistake}”\n\nUsing the worked example from ${title}, explain the failure, propose a correction, and describe a regression check.`,
        ['Identify the incorrect assumption and an observable failure.', 'Describe a correction and a regression check.'], `${reason} ${model}`,
        [answer, reason, model]),
    ],
    cards: [
      recall(title + ': recall', `What rule prevents this mistake in ${title.toLowerCase()}: “${mistake}”?`, reason, body),
      transfer(title + ': transfer', task + '\n\nWhich starting rule should guide your solution?',
        index % 2 ? [mistake, reason] : [reason, mistake], index % 2 ? 1 : 0,
        index % 2 ? [`That repeats the failure: ${mistake}`, model] : [model, `That repeats the failure: ${mistake}`]),
    ],
  };
}
export default function expansion() {
  const result = [];
  let sequence = 13;
  for (const [trackId, title, description, chapters, prerequisite] of tracks) {
    const chapterIds = [];
    for (const [name, summary, reference, specs, checks] of chapters) {
      const lessons = specs.map((spec, index) => lesson(spec, sequence + index, reference));
      const placement = checks.map(([objective, prompt, answer, wrong, explanation], index) => {
        const correct = (sequence + index) % 3;
        const options = [...wrong]; options.splice(correct, 0, answer);
        return { objective, exercise: pick('Transfer check ' + (index + 1), prompt, options, correct,
          options.map(value => value === answer ? explanation : 'Reconsider the contract. ' + explanation),
          ['Identify the relevant boundary.', 'Compare the possible observable outcomes.', explanation], 'choice', index > 2 ? 'transfer' : 'apply') };
      });
      const items = chapter(sequence, name, summary, lessons, placement);
      const current = items[0];
      current.trackId = trackId;
      current.prerequisiteIds = chapterIds.length ? [chapterIds.at(-1)] : [prerequisite];
      chapterIds.push(current.id);
      result.push(...items);
      sequence++;
    }
    result.push({ ...identity(trackId, title, trackId), kind: 'track', chapterIds,
      bodyMarkdown: description, description,
      targetOutcomes: chapters.map(([name, summary]) => name + ': ' + summary) });
  }
  return result;
}
