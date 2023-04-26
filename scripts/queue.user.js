// ==UserScript==
// @name         util::queue
// @downloadURL  https://github.com/dangh/user-scripts/raw/master/scripts/queue.user.js
// @match        <all_urls>
// @version      0.0.1
// @run-at       document-start
// ==/UserScript==

unsafeWindow.queue = function queue(name, capacity = 1, opts) {
  // start queue when added task
  let autorun = opts?.autorun ?? true;

  let debug = console.debug.bind(console, 'oh shit ‼️ [queue:' + name + ']');

  let tasks = [];
  let state = 'stopped'; // running | stopped
  let running = new Set();

  let reportProgress = () => {
    let cells = { pending: '⚪️', running: '🟡', success: '🟢', failed: '🔴' };
    let progress = tasks.map(task => cells[task.state]).join('');
    debug(progress);
  };

  let add = (key, run) => {
    tasks.push({ key, run, state: 'pending' });
    reportProgress();
    if (autorun) start();
    next();
  };

  let next = () => {
    if (state != 'running') return;

    while (running.size < capacity) {
      let task = tasks.find(task => task.state == 'pending');
      if (!task) break;

      task.state = 'running';
      reportProgress();
      running.add(task);
      Promise.resolve(task.run())
        .then(() => {
          task.state = 'success';
        })
        .catch(() => {
          task.state = 'failed';
        })
        .finally(() => {
          reportProgress();
          running.delete(task);
          next();
        });
    }
  };

  let start = () => {
    if (state == 'running') return;

    state = 'running';
    next();
  };

  let stop = () => {
    if (state == 'stopped') return;

    state = 'stopped';
  };

  return {
    add,
    start,
    stop,
  };
};
