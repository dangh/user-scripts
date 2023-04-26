// ==UserScript==
// @name         util::observeAdd
// @downloadURL  https://github.com/dangh/user-scripts/raw/master/scripts/observeAdd.user.js
// @match        <all_urls>
// @version      0.0.1
// @run-at       document-start
// ==/UserScript==

unsafeWindow.observeAdd = function observeAdd(selector, handle, opts) {
  let container = opts?.container ?? document;
  let runImmediately = opts?.runImmediately ?? true;

  let handled = new WeakSet();
  let handleSelected = (mutations, observer) => {
    let addedNodes = [];

    container.querySelectorAll(selector).forEach(el => {
      if (!handled.has(el)) {
        handled.add(el);
        addedNodes.push(el);
      }
    });

    if (addedNodes.length > 0) {
      try {
        let stop = () => observer.disconnect();
        handle(addedNodes, stop);
      } catch (err) {
        console.error(err);
      }
    }
  };

  let observer = new MutationObserver(handleSelected);
  observer.observe(container, {
    childList: true,
    subtree: true,
  });

  if (runImmediately) {
    // run once at start
    handleSelected(null, observer);
  }
};
