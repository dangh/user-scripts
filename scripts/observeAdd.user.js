// ==UserScript==
// @name         util::observeAdd
// @downloadURL  https://github.com/dangh/user-scripts/raw/master/scripts/observeAdd.user.js
// @match        <all_urls>
// @version      0.0.2
// @run-at       document-start
// ==/UserScript==

unsafeWindow.observeAdd = function observeAdd(selector, handle, opts) {
  let container = opts?.container ?? document;
  if (container.tagName == 'IFRAME') container = container.contentDocument;
  let runImmediately = opts?.runImmediately ?? true;
  let batching = opts?.batching ?? false;

  let stopped = false;
  let stop = () => {
    stopped = true;
    observer.disconnect();
  };

  let handled = new WeakSet();
  let handleSelected = async (mutations, observer) => {
    let addedNodes = [];

    container.querySelectorAll(selector).forEach(el => {
      if (!handled.has(el)) {
        handled.add(el);
        addedNodes.push(el);
      }
    });

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

  return stop;
};

unsafeWindow.observeAddOnce = function observeAddOnce(selector, handle, opts) {
  let handleOnce = async (els, stop) => {
    stop();
    await handle(els);
  };
  return observeAdd(selector, handleOnce, opts);
};
