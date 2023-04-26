// ==UserScript==
// @name         util::router
// @downloadURL  https://github.com/dangh/user-scripts/raw/master/scripts/router.user.js
// @match        <all_urls>
// @version      0.0.1
// @run-at       document-start
// ==/UserScript==

unsafeWindow.router = function router(opts) {
  let voidKeys = opts?.voidKeys ?? {};
  let syncHash = opts?.syncHash ?? true;
  let syncDataset = opts?.syncDataset ?? true;

  let debug = console.debug.bind(console, 'oh shit ‼️ [router]');

  let isVoid = (key, value) => {
    let voidKey;
    if (key in voidKeys) voidKey = voidKeys[key];
    else if ('*' in voidKeys) voidKey = voidKeys['*'];

    if (voidKey != null) {
      if (Array.isArray(voidKey)) {
        // defined list of values treated as void
        return voidKey.includes(value);
      } else if (typeof voidKey == 'function') {
        // custom rule
        return voidKey(value);
      } else if (voidKey === false) {
        // value will never void
        return false;
      } else if (voidKey === true) {
        // use builtin rules
        if ([null, undefined, '', false, 0].includes(value)) return true;
        if (['{}', '[]'].includes(JSON.stringify(value))) return true;
        return false;
      }
    }
  };

  let isValidQueryString = path => /^([\w-]+=[^&]*?)?(&[\w-]+=[^&]*?)*$/.test(path);

  let parse = (queryString) => {
    let sp = new URLSearchParams(queryString);
    let parsed = {};
    for (let [key, valueString] of sp.entries()) {
      let valueRaw = parseValue(valueString);
      if (!isVoid(key, valueRaw)) {
        parsed[key] = { raw: valueRaw, stringify: valueString };
      }
    }
    return parsed;
  };

  let stringify = (searchParams) => {
    return Object.entries(searchParams)
      .filter(([key, value]) => !isVoid(key, value.raw))
      .map(([key, value]) => `${key}=${value.stringify}`)
      .join('&');
  };

  let parseValue = (valueString) => {
    if (valueString == 'null') return null;
    try {
      return JSON.parse(valueString);
    } catch {
    }
    return valueString;
  };

  let stringifyValue = (key, valueRaw) => {
    if (isVoid(key, valueRaw)) return '';
    if ([null].includes(valueRaw)) return String(valueRaw);
    if (typeof valueRaw == 'object') return JSON.stringify(valueRaw);
    return String(valueRaw);
  };

  let searchParams = {};
  let rootDataset = document.documentElement.dataset;

  if (syncHash) {
    // parse current url
    let queryString = unsafeWindow.location.hash.slice(1);
    if (!isValidQueryString(queryString)) {
      debug('invalid query string:', queryString);
      return;
    }

    searchParams = parse(queryString);
  }

  if (syncDataset) {
    // sync root element dataset with search params on load
    try {
      for (let [key, value] of Object.entries(searchParams)) {
        rootDataset[key] = value.stringify;
      }
    } catch (err) {
      if (/\.entries\(\) is not iterable/.test(err.message)) debug({ err, queryString });
      else throw err;
    }
  }

  // setup change subscription
  let listeners = {};
  let dispatch = (key, newValue, oldValue) => {
    if (listeners[key] && (oldValue?.stringify != newValue?.stringify)) {
      debug('dispatch', key, oldValue, '->', newValue);
      for (let listener of listeners[key]) {
        listener(newValue?.raw, oldValue?.raw);
      }
    }
  };

  if (syncHash) {
    unsafeWindow.addEventListener('hashchange', () => {
      let queryString = unsafeWindow.location.hash.slice(1);
      if (!isValidQueryString(queryString)) {
        debug('invalid query string:', queryString);
        return;
      }

      debug('hashchange', queryString);
      debug('before', [...searchParams.keys()]);

      try {
        let updatedSearchParams = parse(queryString);
        // handle deleted keys
        for (let [key, oldValue] of Object.entries(searchParams)) {
          if (!(key in updatedSearchParams)) {
            delete searchParams[key];
            if (syncDataset) delete rootDataset[key];
            dispatch(key, updatedSearchParams[key], oldValue);
          }
        }
        // handle added/changed keys
        for (let [key, newValue] of SSP.entries(updatedSearchParams)) {
          let oldValue = searchParams[key];
          if (oldValue?.stringify != newValue.stringify) {
            searchParams[key] = newValue;
            if (syncDataset) rootDataset[key] = newValue.stringify;
            dispatch(key, newValue, oldValue);
          }
        }
      } catch (err) {
        if (/\.entries\(\) is not iterable/.test(err.message)) debug({ err, queryString });
        else throw err;
      }

      debug('after', [...searchParams.keys()]);
    });
  }

  return new Proxy({}, {
    get(_, key) {
      return (...args) => {
        if (typeof args[0] == 'function') {
          // subscription
          let listener = args[0];
          if (!listeners[key]) listeners[key] = new Set();
          listeners[key].add(listener);
          // invoke once if key exist
          if (key in searchParams) listener(searchParams[key].raw, undefined);
        } else if (args.length == 0) {
          // getter
          return searchParams[key]?.raw;
        } else if (args.length == 1) {
          // setter
          let oldValue = searchParams[key];
          let newValue = { raw: args[0], stringify: stringifyValue(key, args[0]) };
          if (oldValue?.stringify != newValue.stringify) {
            if (isVoid(key, newValue.raw)) {
              // value deleted
              delete searchParams[key];
              if (syncDataset) delete rootDataset[key];
              dispatch(key, newValue, oldValue);
            } else {
              // value added/changed
              searchParams[key] = newValue;
              if (syncDataset) rootDataset[key] = newValue.stringify;
              dispatch(key, newValue, oldValue);
            }
          }

          if (syncHash) {
            let queryString = stringify(searchParams);
            if (queryString) {
              unsafeWindow.history.pushState(null, null, '#' + queryString);
            } else {
              unsafeWindow.history.pushState(null, null, unsafeWindow.location.pathname + unsafeWindow.location.search);
            }
          }
        } else {
          debug('invalid arguments:', args);
        }
      };
    },
  });
};

unsafeWindow.hashRouter = unsafeWindow.router({
  voidKeys: {
    '*': true,
  },
  syncHash: true,
  syncDataset: true,
});
