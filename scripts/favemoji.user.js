// ==UserScript==
// @name         util::favemoji
// @downloadURL  https://github.com/dangh/user-scripts/raw/master/scripts/favemoji.user.js
// @match        <all_urls>
// @version      0.0.1
// @run-at       document-start
// ==/UserScript==

let originalLinks;
document.addEventListener('DOMContentLoaded', () => {
  originalLinks = [...document.head.querySelectorAll('link:is([rel="icon"], [rel="shortcut icon"])')];
});

unsafeWindow.favemoji = function favemoji(icon, badge) {
  let apply = (...links) => {
    // remove existing links
    document.head.querySelectorAll('link:is([rel="icon], [rel="shortcut icon"])').forEach(el => el.remove());
    // append new links
    document.head.append(...links);
  };

  if (!icon && !badge) {
    if (originalLinks.length > 0) {
      // restore original icons
      apply(...originalLinks);
    } else {
      // use domain favicon
      let link = document.createElement('link');
      link.rel = 'icon';
      link.href = '/favicon.ico';
      apply(link);
    }
  } else {
    // build favemoji
    let svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">';
    if (icon) {
      if (/\s*</m.test(icon)) {
        svg += icon;
      } else {
        svg += '<text y=".9em" font-size="90">' + icon + '</text>';
      }
    }
    if (badge) {
      if (/\s*</m.test(badge)) {
        svg += badge;
      } else {
        svg += '<text x="1em" y="2.1em" font-size="45">' + badge + '</text>';
      }
    }
    svg += '</svg>';
    svg = svg.replace(/[\r\n]g/, '');
    svg = svg.replace(/>\s+/g, '>');
    svg = svg.replace(/\s+</g, '<');
    svg = svg.replace(/[#]/g, encodeURIComponent);
    let link = document.createElement('link');
    link.rel = 'icon';
    link.href = 'data:image/svg+xml,' + svg;
    apply(link);
  }
};
