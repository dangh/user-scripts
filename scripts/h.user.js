// ==UserScript==
// @name         util::h
// @downloadURL  https://github.com/dangh/user-scripts/raw/master/scripts/h.user.js
// @match        <all_urls>
// @version      0.0.3
// @run-at       document-start
// ==/UserScript==

unsafeWindow.h = new Proxy(
  function h(tagName, props, ...children) {
    let element = document.createElement(tagName);
    if (props instanceof HTMLElement || typeof props == 'string') {
      children = [props, ...children];
    } else if (typeof props == 'object') {
      for (let [key, value] of Object.entries(props)) {
        if (value?.IM_A_SIGNAL) {
          let signal = value;
          signal.subscribe(value => {
            if (/^data[A-Z]/.test(key)) {
              key = key.replace(/^data./, (s) => s.slice(-1).toLowerCase());
              element.dataset[key] = value;
            } else {
              element[key] = value;
            }
          });
        } else if (typeof value == 'function') {
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
        } else if (key == 'innerHTML') {
          element.innerHTML = value;
        } else if (/^data[A-Z]/.test(key)) {
          key = key.replace(/^data./, (s) => s.slice(-1).toLowerCase());
          element.dataset[key] = value;
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
      if (tagName == 'createSignal') {
        return function createSignal(initialValue) {
          let _value = initialValue;
          let _subscribers = [];
          let signal = (...args) => {
            if (args.length == 1) {
              // setter
              let oldValue = _value;
              if (typeof args[0] == 'function')
                _value = args[0](oldValue);
              else
                _value = args[0];
              if (_value !== oldValue)
                _subscribers.forEach(f => f(_value, oldValue));
            } else {
              // getter
              return _value;
            }
          };
          signal.subscribe = function subscribe(f) {
            _subscribers.push(f);
            f(_value);
            return function unsubscribe() {
              _subscribers.splice(_subscribers.indexOf(f), 1);
            };
          };
          signal.IM_A_SIGNAL = true;
          return signal;
        };
      }
      return function(props, ...children) {
        return h(tagName, props, ...children);
      };
    },
  },
);
