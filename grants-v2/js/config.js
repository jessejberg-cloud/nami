/*
  NAMI Grants Dashboard v2: settings for this copy of the page.

  mode: 'sample'     fictional data in this browser, with a "Signed in as" list (the default)
        'microsoft'  sign in with NAMI Microsoft 365 accounts. Fill in clientId and tenantId from
                     the app registration NAMI's Microsoft admins make (see README, "Sign-in").
                     The data stays Sample data until SharePoint mode arrives in Phase 7.
*/
window.NAMI_CONFIG = {
  mode: 'sample',
  microsoft: {
    clientId: '',
    tenantId: '',
    redirectUri: '' // blank means this page's own address
  }
};
