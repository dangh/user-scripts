// ==UserScript==
// @name         util::broadcast
// @downloadURL  https://github.com/dangh/user-scripts/raw/master/scripts/broadcast.user.js
// @match        <all_urls>
// @version      0.0.1
// @run-at       document-start
// ==/UserScript==

let channels = new Map();

unsafeWindow.broadcast = function broadcast(name, msg) {
  if (!channels.has(name)) channels.set(name, new BroadcastChannel(name));
  let channel = channels.get(name);

  if (typeof msg == 'function') {
    // subscription
    let listener;
    let unsubscribe = () => channel.removeEventListener('message', listener);
    listener = evt => msg(evt.data, unsubscribe);
    channel.addEventListener('message', listener);
    return unsubscribe;
  } else {
    channel.postMessage(msg);
  }
};
