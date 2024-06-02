// ==UserScript==
// @name         util::waitFor
// @downloadURL  https://github.com/dangh/user-scripts/raw/master/scripts/waitFor.user.js
// @match        <all_urls>
// @version      0.0.1
// @run-at       document-start
// ==/UserScript==

unsafeWindow.waitFor = function waitFor(selector, opts) {
  return new Promise(resolve => {
    let container = opts?.container ?? document;
    let interval = opts?.interval || 100;

    if (container?.tagName == 'IFRAME') container = container.contentDocument;

    let timer, stopObserver;

    stopObserver = unsafeWindow.observeAdd(selector, el => {
      stopObserver();
      clearInterval(timer);
      resolve(el);
    }, opts);

    timer = setInterval(() => {
      let el = container.querySelector(selector);
      if (el) {
        stopObserver();
        clearInterval(timer);
        resolve(el);
      }
    }, interval);
  });
};
