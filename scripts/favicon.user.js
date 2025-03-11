// ==UserScript==
// @name         util::favicon
// @downloadURL  https://github.com/dangh/user-scripts/raw/master/scripts/favicon.user.js
// @match        <all_urls>
// @version      0.0.1
// @run-at       document-start
// ==/UserScript==

let timer;

unsafeWindow.favicon = function favicon(svg, opts) {
  if (svg) {
    switch (svg) {
      case 'progress': svg = progress(opts); break;
      case 'emoji': svg = emoji(opts); break;
    }
    let link = document.querySelector('link[favicon]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      link.setAttribute('favicon', true);
    }
    svg = svg.replace(/[\r\n]g/, '');
    svg = svg.replace(/>\s+/g, '>');
    svg = svg.replace(/\s+</g, '<');
    svg = svg.replace(/[#]/g, encodeURIComponent);
    link.href = 'data:image/svg+xml,' + svg;
    link.remove();
    document.head.append(link);

    if (opts?.resetAfter > 0) {
      clearTimeout(timer);
      timer = setTimeout(() => {
        unsafeWindow.favicon(null);
      }, opts.resetAfter);
    }
  } else {
    document.querySelector('link[favicon]')?.remove();
    document.head.querySelectorAll('link:is([rel~="icon"])').forEach(link => {
      link.remove();
      document.head.append(link);
    });
  }
};

unsafeWindow.favemoji = function favemoji(icon, badge) {
  if (!icon) unsafeWindow.favicon(null);
  else unsafeWindow.favicon('emoji', { icon, badge });
};

function progress(opts) {
  let percent = opts.percent ?? 0;
  let width = opts.width ?? 6;
  let trackColor = opts.trackColor;
  let progressColor = opts.progressColor ?? '#60e6a8';
  let shape = opts.shape ?? 'butt';
  let text = opts.text ?? 'percent';
  if (text == 'percent') text = Math.trunc(percent * 100);

  let size = 32, center = size / 2, radius = (size - width) / 2;
  let circumference = 2 * Math.PI * radius;
  let offset = circumference * (1 - percent);
  let track = '';
  if(trackColor) track = `<circle r="${radius}" cx="${center}" cy="${center}" fill="transparent" stroke="${trackColor}" stroke-width="${width}"></circle>`;
  if(text) text = `<text x="50%" y="50%" font-size="9" fill="#6bdba7" dominant-baseline="middle" text-anchor="middle">${opts.text}</text>`;
  let svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      ${track}
      <circle id="progress" r="${radius}" cx="${center}" cy="${center}" fill="transparent" stroke="${progressColor}" stroke-linecap="${shape}" stroke-width="${width}" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" transform="rotate(-90)" transform-origin="center"></circle>
      ${text}
    </svg>
  `;
  return svg;
}

function emoji(opts) {
  let { icon = '', badge = '' } = opts;
  if (icon) icon = `<text y=".9em" font-size="90">${icon}</text>`;
  if (badge) badge = `<text x="1em" y="2.1em" font-size="45">${badge}</text>`;
  let svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      ${icon}
      ${badge}
    </svg>
  `;
  return svg;
}
