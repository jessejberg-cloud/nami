/*
  NAMI Grants Dashboard v2: signing in.

  Two kinds behind one interface, picked by js/config.js:
    sample     no sign-in; a "Signed in as" list switches between the sample people, so editors
               and viewers can both be tried. The choice is kept in this browser.
    microsoft  NAMI's Microsoft 365 accounts through Microsoft's sign-in library (MSAL), loaded
               only in this mode. Needs an app registration (clientId, tenantId) from NAMI's
               Microsoft admins; until then this mode is untested.

  auth.start()      Promise; the signed-in { name, email }, or null when nobody is signed in
  auth.signIn()     sends the person to Microsoft's sign-in page (microsoft) or picks a person (sample)
  auth.signOut()
  auth.token()      Promise; an access token for Microsoft Graph (microsoft only; SharePoint mode uses it)
*/
(function (root) {
  'use strict';

  var PERSON_KEY = 'nami-grants-v2-sample-person';
  // Delegated permissions: people only ever reach what SharePoint already lets them reach.
  // Sites.Manage.All lets an editor's "Set up the lists" and "Your own fields" make lists and columns.
  var SCOPES = ['User.Read', 'Sites.ReadWrite.All', 'Sites.Manage.All'];
  var MSAL_URL = 'https://alcdn.msauth.net/browser/2.38.3/js/msal-browser.min.js';

  function createSampleAuth(options) {
    var storage = options.storage;
    var people = options.people; // function returning the People rows
    function read() { try { return storage.getItem(PERSON_KEY); } catch (e) { return null; } }
    function pick(name) {
      var rows = people();
      var row = rows.filter(function (p) { return p.person === name; })[0] || rows.filter(function (p) { return p.role === 'Editor'; })[0] || rows[0];
      return row ? { name: row.person, email: row.email } : null;
    }
    return {
      mode: 'sample',
      start: function () { return Promise.resolve(pick(read())); },
      signIn: function (name) { try { storage.setItem(PERSON_KEY, name); } catch (e) { /* fine without */ } return Promise.resolve(pick(name)); },
      signOut: function () { return Promise.resolve(null); },
      token: function () { return Promise.reject(new Error('Sample mode has no Microsoft sign-in.')); }
    };
  }

  function createMicrosoftAuth(cfg) {
    var app = null;
    function loadLibrary() {
      if (root.msal) return Promise.resolve();
      return new Promise(function (resolve, reject) {
        var s = document.createElement('script');
        s.src = cfg.msalUrl || MSAL_URL;
        s.onload = resolve;
        s.onerror = function () { reject(new Error('The Microsoft sign-in page could not be reached.')); };
        document.head.appendChild(s);
      });
    }
    function request() { return { scopes: SCOPES }; }
    // The address Microsoft sends people back to. It must match the app registration exactly;
    // set it in js/config.js (for example https://nami-grants.netlify.app/) rather than rely on this guess.
    function redirectUri() { return cfg.redirectUri || (location.origin + location.pathname.replace(/index\.html$/, '')); }
    function person(acc) { return acc ? { name: acc.name || acc.username, email: acc.username } : null; }
    return {
      mode: 'microsoft',
      start: function () {
        if (!cfg.clientId || !cfg.tenantId) { var e = new Error('Microsoft sign-in is not set up yet (js/config.js).'); e.notSetUp = true; return Promise.reject(e); }
        return loadLibrary().then(function () {
          app = new root.msal.PublicClientApplication({
            auth: { clientId: cfg.clientId, authority: 'https://login.microsoftonline.com/' + cfg.tenantId, redirectUri: redirectUri() },
            cache: { cacheLocation: 'localStorage' }
          });
          return app.handleRedirectPromise();
        }).then(function (res) {
          var acc = (res && res.account) || app.getActiveAccount() || app.getAllAccounts()[0] || null;
          if (acc) app.setActiveAccount(acc);
          return person(acc);
        });
      },
      signIn: function () { return app ? app.loginRedirect(request()) : Promise.reject(new Error('Sign-in is not ready.')); },
      signOut: function () {
        if (!app) return Promise.resolve();
        return app.logoutRedirect({ account: app.getActiveAccount(), postLogoutRedirectUri: redirectUri() });
      },
      // Resolves to a token. When Microsoft needs the person again, the page goes to sign in and
      // this never resolves, so nothing is sent without a token.
      token: function () {
        var never = new Promise(function () {});
        if (!app) return Promise.reject(new Error('Sign-in is not ready.'));
        var account = app.getActiveAccount();
        if (!account) { app.loginRedirect(request()); return never; }
        return app.acquireTokenSilent(Object.assign({ account: account }, request()))
          .then(function (r) { return r.accessToken; })
          .catch(function (e) {
            if (root.msal && e instanceof root.msal.InteractionRequiredAuthError) { app.acquireTokenRedirect(request()); return never; }
            throw e;
          });
      }
    };
  }

  function createAuth(cfg, options) {
    cfg = cfg || {};
    return cfg.mode === 'microsoft' ? createMicrosoftAuth(cfg.microsoft || {}) : createSampleAuth(options);
  }

  var api = { createAuth: createAuth, createSampleAuth: createSampleAuth, createMicrosoftAuth: createMicrosoftAuth, SCOPES: SCOPES, PERSON_KEY: PERSON_KEY };
  root.NAMI = root.NAMI || {};
  root.NAMI.auth = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
