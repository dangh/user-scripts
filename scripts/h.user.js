// ==UserScript==
// @name         util::h
// @downloadURL  https://github.com/dangh/user-scripts/raw/master/scripts/h.user.js
// @match        <all_urls>
// @version      0.0.2
// @run-at       document-start
// ==/UserScript==

unsafeWindow.h = new Proxy(
  function h(tagName, props, ...children) {
    let element = document.createElement(tagName);
    if (props instanceof HTMLElement || typeof props == 'string') {
      children = [props, ...children];
    } else if (typeof props == 'object') {
      for (let [key, value] of Object.entries(props)) {
        if (typeof value == 'function') {
          if (key.startsWith('once')) {
            let eventType = key.replace(/^once/, '').toLowerCase();
            let listener = (event) => {
              element.removeEventListener(eventType, listener);
              value.call(element, event);
            };
            element.addEventListener(eventType, listener);
          } else {
            let eventType = key.replace(/^on/, '').toLowerCase();
            element.addEventListener(eventType, value);
          }
        } else if (/^data[A-Z]/.test(key)) {
          key = key.replace(/^data./, (s) => s.slice(-1).toLowerCase());
          element.dataset[key] = value;
        } else if (key == 'innerHTML') {
          element.innerHTML = value;
        } else {
          element[key] = value;
        }
      }
    }
    element.append(...children.filter(Boolean).flat(Infinity));
    return element;
  },
  {
    get(h, tagName) {
      return function(props, ...children) {
        return h(tagName, props, ...children);
      };
    },
  },
);
