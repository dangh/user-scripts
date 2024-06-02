// ==UserScript==
// @name         util::waitFor
// @downloadURL  https://github.com/dangh/user-scripts/raw/master/scripts/waitFor.user.js
// @match        <all_urls>
// @version      0.0.2
// @run-at       document-start
// ==/UserScript==

unsafeWindow.waitFor = function waitFor(selector, opts) {
  return new Promise(resolve => {
    let container = opts?.container ?? document;
    if (container?.tagName == 'IFRAME') container = container.contentDocument;
    let interval = opts?.interval || 100;
    let test = opts?.test ?? (el => true);

    let timer, stopObserver;

    stopObserver = unsafeWindow.observeAdd(selector, el => {
      if (!test(el)) return;
      stopObserver();
      clearInterval(timer);
      resolve(el);
    }, opts);

    timer = setInterval(() => {
      let el = container.querySelector(selector);
      if (el) {
        if (!test(el)) return;
        stopObserver();
        clearInterval(timer);
        resolve(el);
      }
    }, interval);
  });
};
