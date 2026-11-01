/*
  NAMI Grants Dashboard v2: settings for this copy of the page.

  mode: 'sample'     fictional data in this browser, with a "Signed in as" list (the default)
        'microsoft'  sign in with NAMI Microsoft 365 accounts. Fill in clientId and tenantId from
                     the app registration NAMI's Microsoft admins make (see README, "Sign-in").
                     The data stays Sample data until SharePoint mode arrives in Phase 7.
  feeds.endpoint     see below
*/
window.NAMI_CONFIG = {
  mode: 'sample',
  microsoft: {
    clientId: '',
    tenantId: '',
    redirectUri: '' // blank means this page's own address
  },
  feeds: {
    // Where Funding Watch asks for Grants.gov and feed results. Blank means the feed function
    // that comes with this page on Netlify; opened straight from a folder, it shows sample results.
    // 'sample' always shows sample results.
    endpoint: ''
  }
};
