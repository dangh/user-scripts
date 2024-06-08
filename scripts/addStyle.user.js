// ==UserScript==
// @name         util::addStyle
// @downloadURL  https://github.com/dangh/user-scripts/raw/master/scripts/addStyle.user.js
// @match        <all_urls>
// @version      0.0.1
// @run-at       document-start
// ==/UserScript==

unsafeWindow.addStyle = function addStyle(css, opts) {
  let container = opts?.container || document.head;
  if (container.tagName == 'IFRAME') container = container.contentDocument.head;

  let style = document.createElement('style');
  style.textContent = css;
  container.append(style);

  return style;
};
