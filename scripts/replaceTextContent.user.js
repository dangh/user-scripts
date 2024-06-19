// ==UserScript==
// @name         util::replaceTextContent
// @downloadURL  https://github.com/dangh/user-scripts/raw/master/scripts/replaceTextContent.user.js
// @match        <all_urls>
// @version      0.0.1
// @run-at       document-start
// ==/UserScript==

unsafeWindow.replaceTextContent = function replaceTextContent(container, pattern, replacer) {
  //collect all text nodes
  let treeWalker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let allTextNodes = [];
  let currentNode = treeWalker.nextNode();
  while (currentNode) {
    allTextNodes.push(currentNode);
    currentNode = treeWalker.nextNode();
  }
  //replace text nodes content
  for (let el of allTextNodes) {
    let html = el.textContent.replaceAll(pattern, match => {
      let id = match.replace(/[^\w_-]/g, '');
      if (!id) return match;

      let attr = 'ts-replacer-' + id;
      let replaced = el.parentNode.closest(`[${attr}]`) != null;
      if (replaced) return match;

      let content = replacer;
      if (typeof replacer == 'function') content = replacer(match, el);
      return `<span ${attr}>${content}</span>`;
    });
    if (html != el.textContent) {
      let span = document.createElement('span');
      span.innerHTML = html;
      el.replaceWith(...span.childNodes);
    }
  }
};
