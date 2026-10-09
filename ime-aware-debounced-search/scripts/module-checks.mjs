import assert from 'node:assert/strict';
import { createSearchController } from '../src/search-controller.js';
import { createFakeClock } from '../src/fake-clock.js';

export function runModuleChecks() {
  let count = 0;
  const equal = (label, actual, expected) => {
    assert.deepEqual(actual, expected);
    count++;
    console.log(`PASS module: ${label}`);
  };
  function fixture(mode = 'fixed') {
    const clock = createFakeClock();
    const searches = [];
    const submits = [];
    const controller = createSearchController({
      mode, ...clock, search: value => searches.push(value), submit: value => submits.push(value),
    });
    return { clock, searches, submits, controller };
  }
  {
    const { clock, searches, controller } = fixture();
    controller.input('a'); clock.tick(200); controller.input('ab'); clock.tick(299);
    equal('ordinary input debounce waits for the final quiet period', searches, []);
    clock.tick(1);
    equal('ordinary input searches the last value once', searches, ['ab']);
    controller.input('ab'); clock.tick(300);
    equal('an unchanged committed value is deduplicated', searches, ['ab']);
  }
  for (const mode of ['naive', 'gate-only', 'fixed']) {
    const { clock, searches, controller } = fixture(mode);
    controller.compositionStart(); controller.input('zhong', { isComposing: true }); clock.tick(1000);
    equal(`${mode}: a composition pause longer than debounce delay`, searches, mode === 'naive' ? ['zhong'] : []);
    equal(`${mode}: composition still updates the observed value`, controller.state.currentValue, 'zhong');
  }
  for (const mode of ['gate-only', 'fixed']) {
    const { clock, searches, controller } = fixture(mode);
    controller.input('old'); clock.tick(100); controller.compositionStart();
    controller.input('oldzhong', { isComposing: true }); clock.tick(500);
    equal(`${mode}: composition starts while an older timer is pending`, searches, mode === 'gate-only' ? ['old'] : []);
  }
  for (const order of ['input-before-end', 'input-after-end']) {
    const { clock, searches, controller } = fixture();
    controller.compositionStart(); controller.input('beijing', { isComposing: true });
    if (order === 'input-before-end') controller.input('北京', { isComposing: false });
    controller.compositionEnd('北京');
    if (order === 'input-after-end') controller.input('北京', { isComposing: false });
    clock.tick(300);
    equal(`${order}: a tested final input permutation searches only once`, searches, ['北京']);
    controller.input('北京'); clock.tick(300);
    equal(`${order}: a duplicate input after the timer also stays deduplicated`, searches, ['北京']);
  }
  {
    const { clock, searches, controller } = fixture();
    controller.input('已确认'); clock.tick(300);
    controller.compositionStart(); controller.input('已确认pin', { isComposing: true });
    controller.compositionEnd('已确认'); clock.tick(300);
    equal('cancelled composition restoring a searched term does not search an empty data payload', searches, ['已确认']);
  }
  {
    const { clock, searches, controller } = fixture();
    controller.input('prior'); clock.tick(100); controller.compositionStart();
    controller.input('priorpin', { isComposing: true });
    controller.compositionEnd('prior'); clock.tick(299);
    equal('cancelled composition restoring an unsent term still waits the full debounce delay', searches, []);
    clock.tick(1);
    equal('cancelled composition restores the old term that had not been searched yet', searches, ['prior']);
  }
  {
    const { clock, searches, controller } = fixture();
    controller.input('prior'); clock.tick(50);
    controller.input('composing-without-start', { isComposing: true }); clock.tick(500);
    equal('isComposing also gates input and cancels a stale timer', searches, []);
  }
  {
    const { clock, searches, submits, controller } = fixture();
    controller.compositionStart();
    equal('tracked composition suppresses Enter submission', controller.enter('候选'), false);
    controller.compositionEnd('候选');
    equal('keyboard event isComposing independently suppresses Enter', controller.enter('候选', { isComposing: true }), false);
    equal('suppressed Enter has not called submit', submits, []);
    equal('ordinary Enter is accepted', controller.enter('候选'), true);
    clock.tick(300);
    equal('ordinary Enter calls submit once', submits, ['候选']);
    equal('ordinary Enter cancels the redundant debounced search timer', searches, []);
  }
  {
    const { clock, searches, controller } = fixture();
    controller.input('clear-me'); controller.input(''); clock.tick(500);
    equal('empty value cancels a pending task', searches, []);
    equal('empty value leaves no pending timer', clock.pending, 0);
  }
  {
    const { clock, searches, controller } = fixture();
    controller.input('previous'); clock.tick(300);
    controller.input(''); clock.tick(300);
    controller.input('previous'); clock.tick(300);
    equal('clearing starts a new query session so re-entering the previous term searches again', searches, ['previous', 'previous']);
  }
  {
    const { clock, searches, controller } = fixture();
    controller.input('destroy-me'); controller.destroy(); clock.tick(500);
    equal('destroy cancels a pending search', searches, []);
    controller.input('after-destroy'); controller.compositionEnd('after-destroy'); clock.tick(500);
    equal('destroyed controller ignores later callbacks', searches, []);
    equal('destroy leaves no pending timer', clock.pending, 0);
  }
  return count;
}
