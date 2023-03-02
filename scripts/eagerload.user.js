// ==UserScript==
// @name         util::eagerload
// @downloadURL  https://github.com/dangh/user-scripts/raw/master/scripts/eagerload.user.js
// @match        <all_urls>
// @version      0.0.1
// @run-at       document-start
// ==/UserScript==

unsafeWindow.eagerload = function eagerload(imageEl, opts) {
  let { maxLoading = 3, maxAttempts = 3, viewInterval = 500, retryAfter = 1000, debugLevel = 'debug' } = opts || {};
  let blankImage = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

  if (!unsafeWindow._eagerload) {
    let images = [];
    let stats = {
      get loading() {
        return images.reduce((count, img) => {
          if (['started', 'loading'].includes(img.state)) count += 1;
          return count;
        }, 0);
      },
    };

    let log = new Proxy({}, {
      get(cachedConsole, prop) {
        if (!(prop in cachedConsole)) {
          let levels = ['error', 'warn', 'info', 'log', 'debug'];
          if (levels.includes(prop)) {
            if (levels.indexOf(prop) <= levels.indexOf(debugLevel)) {
              cachedConsole[prop] = console[prop].bind(console, '[' + GM_info.script.name + ']');
            } else {
              cachedConsole[prop] = () => {};
            }
          } else {
            cachedConsole[prop] = console[prop];
          }
        }
        return cachedConsole[prop];
      },
    });

    let observer = new IntersectionObserver((entries) => {
      for (let entry of entries) {
        let imgEl = entry.target;
        let img = images.find((img) => img.el == imgEl);
        if (entry.isIntersecting) loader.send(img, 'VIEWPORT_INTERSECT');
        else loader.send(img, 'VIEWPORT_OUTERSECT');
      }
    });

    let loader = unsafeWindow.stateMachine({
      states: {
        initial: 'pending',
        pending: {
          entry: 'unload',
          on: {
            VIEWPORT_INTERSECT: 'viewing',
            LOAD_START: { target: 'started', cond: 'canStart' },
            LOAD_RECEIVE_DATA: { target: 'loading', cond: 'hasOriginalSource' },
            LOAD_COMPLETE: { target: 'loaded', cond: 'hasOriginalSource' },
            LOAD_ERROR: { target: 'failed', cond: 'hasOriginalSource' },
          },
        },
        viewing: {
          after: {
            [viewInterval]: 'started',
          },
          on: {
            VIEWPORT_OUTERSECT: 'pending',
          },
        },
        started: {
          entry: 'load',
          on: {
            LOAD_RECEIVE_DATA: { target: 'loading', cond: 'hasOriginalSource' },
            LOAD_COMPLETE: { target: 'loaded', cond: 'hasOriginalSource' },
            LOAD_ERROR: { target: 'failed', cond: 'hasOriginalSource' },
          },
        },
        loading: {
          on: {
            LOAD_COMPLETE: { target: 'loaded', cond: 'hasOriginalSource' },
            LOAD_ERROR: { target: 'failed', cond: 'hasOriginalSource' },
          },
        },
        failed: {
          after: {
            [retryAfter]: { target: 'pending', cond: 'canRetry' },
          },
        },
        loaded: {
          entry: 'loadNext',
        },
      },
      guards: {
        hasOriginalSource(image) {
          return image.el.src == image.el.dataset.src;
        },
        canStart(image, event) {
          if (event.force) return true;
          if (stats.loading < maxLoading) return true;
        },
        canRetry(image) {
          return image.attempts < maxAttempts;
        },
      },
      actions: {
        unload(image) {
          image.el.src = blankImage;
        },
        load(image) {
          image.el.src = image.el.dataset.src;
          image.el.loading = 'eager';

          if (!image.attempts) image.attempts = 0;
          image.attempts += 1;
        },
        loadNext() {
          let nextPending = images.find((img) => img.state == 'pending' && img.el.getBoundingClientRect().bottom >= 0);
          if (!nextPending) nextPending = images.find((img) => img.state == 'pending');
          if (nextPending) {
            log.debug('start next index:', images.indexOf(nextPending));
            this.send(nextPending, 'LOAD_START');
          }
        },
      },
      onStart(image) {
        let insertAfter = images.findLastIndex((img) => img.el.compareDocumentPosition(image.el) & Node.DOCUMENT_POSITION_FOLLOWING);
        log.debug('add image:', image.el.src, 'at index:', insertAfter + 1);
        images.splice(insertAfter + 1, 0, image);

        image.el.dataset.src = image.el.src;

        image.el.addEventListener('loadstart', () => this.send(image, 'LOAD_RECEIVE_DATA'));
        image.el.addEventListener('load', () => this.send(image, 'LOAD_COMPLETE'));
        image.el.addEventListener('error', () => this.send(image, 'LOAD_ERROR'));

        observer.observe(image.el);

        if (image.el.complete) this.send(image, 'LOAD_COMPLETE');
      },
      onTransition(image, transition, event) {
        log.debug(image.previousState, '->', event, '->', image.state);

        // report progress
        let cells = { pending: '🤍️', viewing: '💖', started: '💛', loading: '❤️', loaded: '💚', failed: '💔' };
        let progress = images.map((img) => cells[img.state]).join('');
        log.info(progress, 'loading:', stats.loading);
      },
    });

    unsafeWindow._eagerload = function track(imageEl, opts) {
      let image = images.find((img) => img.el == imageEl);
      if (image) {
        log.debug('image already tracked at index:', images.indexOf(image) + 1);
        return;
      }

      image = { el: imageEl };

      loader.start(image);

      if (opts?.immediate) {
        loader.send(image, { type: 'LOAD_START', force: true });
      }
    };
  }

  unsafeWindow._eagerload(imageEl, opts);
};
