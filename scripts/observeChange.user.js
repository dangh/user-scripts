// ==UserScript==
// @name         util::observeChange
// @downloadURL  https://github.com/dangh/user-scripts/raw/master/scripts/observeChange.user.js
// @match        <all_urls>
// @version      0.0.1
// @run-at       document-start
// ==/UserScript==

unsafeWindow.observeChange = function observeChange(elements, handle, opts) {
  function nodeList(elements) {
    if (elements instanceof Node) return [elements];
    if (elements instanceof NodeList) return Array.from(elements);
    if (Array.isArray(elements)) return elements;
  }

  function createObserver(handle, opts) {
    let runImmediately = opts?.runImmediately ?? true;
    let container = opts?.container ?? document;
    if (container.tagName == 'IFRAME') container = container.contentDocument;
    let trackedValues = new WeakMap();
    let trackedAttributes = Object.keys(handle).flatMap(attr => attr.split(',')).filter(attr => (attr && (attr != 'textContent')));
    let observeOptions = {
      // default options
      subtree: false,
      childList: false,
      ...trackedAttributes.length > 0 && {
        attributes: true,
        attributeFilter: trackedAttributes,
        attributeOldValue: false,
      },
      ...handle['textContent'] != null && {
        characterData: true,
        characterDataOldValue: false,
      },
      // customized options
      ...opts,
    };

    let reconcileChanges = (el, attrs) => {
      console.group('Reconciling changes for element:', el, 'attributes:', attrs);
      let changedSet = new Map();
      if (!trackedValues.has(el)) trackedValues.set(el, new Map());
      for (let attr of attrs) {
        let oldValue = trackedValues.get(el).get(attr);
        let newValue;
        switch (attr) {
          case 'textContent':
            newValue = el.textContent;
            break;
          default:
            newValue = el.getAttribute(attr);
            break;
        }
        if (oldValue != newValue) {
          console.group('Change detected:', [attr]);
          let changeSet = Object.keys(handle).find(changeSet => changeSet.split(',').includes(attr));
          if (!changedSet.has(changeSet)) changedSet.set(changeSet, {});
          changedSet.get(changeSet)[attr] = { oldValue, newValue };
        } else {
          console.group('No change detected:', [attr]);
        }
        console.dir({ oldValue, newValue });
        console.groupEnd();
      }
      if (changedSet.size > 0) {
        for (let [changeSet, changes] of changedSet) {
          console.group('Handling changes:', [changeSet]);
          console.dir(changes);
          console.groupEnd();
          if (changeSet.includes(',')) {
            handle[changeSet].call(el, changes);
          } else {
            handle[changeSet].call(el, changes[changeSet].newValue, changes[changeSet].oldValue);
          }
        }
      }
      console.groupEnd();
    };

    let changeObserver = new MutationObserver(mutations => {
      let changes = new Map();
      for (let mutation of mutations) {
        if (!changes.has(mutation.target)) changes.set(mutation.target, new Set());
        switch (mutation.type) {
          case 'attributes':
            changes.get(mutation.target).add(mutation.attributeName);
            break;
          case 'characterData':
            changes.get(mutation.target).add('textContent');
            break;
        }
      }
      changes.forEach((attrs, el) => {
        reconcileChanges(el, attrs);
      });
    });

    function observeChange(elements) {
      for (let element of nodeList(elements)) {
        if (!trackedValues.has(element)) {
          changeObserver.observe(element, observeOptions);
          if (runImmediately) reconcileChanges(element, trackedAttributes);
        }
      }
      return function unobserve() {
        for (let element of nodeList(elements)) {
          trackedValues.delete(element);
        }
      };
    }

    let addObserver;
    let addedElements = new Set();
    function observeAdd(selector) {
      let reconcileExistence = () => {
        container.querySelectorAll(selector).forEach(element => {
          if (!trackedValues.has(element)) {
            console.debug('Tracking new element:', element);
            addedElements.add(element);
            observeChange(element);
          } else {
            // reconcile tracked elements
            console.debug('Reconciling existing element:', element);
            reconcileChanges(element, trackedAttributes);
          }
        });
      };

      if (!addObserver) addObserver = new MutationObserver(reconcileExistence);
      addObserver.observe(container, { subtree: true, childList: true });
      if (runImmediately) reconcileExistence();

      return function unobserve() {
        addObserver.disconnect();
        addedElements.forEach(element => {
          trackedValues.delete(element);
        });
      };
    }

    return function observe(elements) {
      if (typeof elements == 'string') return observeAdd(elements);
      else return observeChange(elements);
    };
  }

  if (nodeList(elements) || (typeof elements == 'string')) {
    return createObserver(handle, opts)(elements);
  } else {
    return createObserver(elements, handle);
  }
};
