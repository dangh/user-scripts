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
  let batching = opts?.batching ?? false;

  let handled = new WeakSet();
  let handleSelected = async (mutations, observer) => {
    let addedNodes = [];

    container.querySelectorAll(selector).forEach(el => {
      if (!handled.has(el)) {
        handled.add(el);
        addedNodes.push(el);
      }
    });

    let stopped = false;
    let stop = () => {
      stopped = true;
      observer.disconnect();
    };

    if (batching) {
      if (addedNodes.length > 0) {
        try {
          await handle(addedNodes, stop);
        } catch (err) {
          console.error(err);
        }
      }
    } else {
      for (let el of addedNodes) {
        try {
          if (stopped) break;
          await handle(el, stop);
        } catch (err) {
          console.error(err);
        }
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

unsafeWindow.observeAddOnce = function observeAddOnce(selector, handle, opts) {
  let handleOnce = async (els, stop) => {
    stop();
    await handle(els);
  };
  observeAdd(selector, handleOnce, opts);
};
