/*
  NAMI Grants Dashboard v2: sample data.

  FICTIONAL. Every funder, amount, contact and person below is made up for practice and
  testing. None of it is a real NAMI award, contract, obligation or staff assignment.

  "Partner foundation news" is a feed link that will not load (example.org has no feed), so
  Phase 6 can show its "not loading" note. "Warmline Volunteer Training" carries a custom
  column (boardMeeting); three records carry the custom choice column reportCadence, and two
  the yes-or-no column boardApproved, so their filters have something to find.

  Dates are fixed the first time the sample loads in a browser and kept after that, so edits
  survive; "Start the sample over" rebuilds them around the new today.

  The three Milwaukee funding cycles in the Watch list are real funders named in the v2
  plan; their opening months are left blank for NAMI to fill in.
*/
(function (root) {
  'use strict';

  function build(today) {
    var base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    var Y = base.getFullYear();
    function d(days) {
      var x = new Date(base); x.setDate(x.getDate() + days);
      return x.getFullYear() + '-' + pad(x.getMonth() + 1) + '-' + pad(x.getDate());
    }
    function ymd(y, m, day) { return y + '-' + pad(m) + '-' + pad(day); }
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    var stamp = new Date(base).toISOString();
    var id = 0;
    function row(fields) { id += 1; return Object.assign({ id: id, created: stamp, modified: stamp }, fields); }

    var people = {
      morgan: 'Morgan Reyes (sample)',
      dana: 'Dana Whitfield (sample)',
      sam: 'Sam Okafor (sample)',
      lee: 'Lee Brandt (sample)',
      pat: 'Pat Lindqvist (sample)'
    };

    var records = [
      row({ name: 'Family Education Expansion', funder: 'Lakeshore Community Fund (sample)', recordType: 'Grant', grantType: 'Foundation', program: 'Family-to-Family', owner: people.morgan, status: 'Awarded', awardAmount: 45000, startDate: ymd(Y, 1, 1), endDate: ymd(Y, 12, 31), contactName: 'Renee Alvarez (sample)', contactEmail: 'renee@example.org', contactPhone: '414-555-0141', next: 'How many families finished the full eight sessions', comments: 'Funder likes a short story with each report.', links: 'https://example.org/lakeshore-guidelines', folderLink: 'https://example.sharepoint.com/sites/grants/Lakeshore', reportCadence: 'Every 6 months', boardApproved: true }),
      row({ name: 'Peer Support Line', funder: 'Lakeview County Human Services (sample)', recordType: 'County contract', grantType: 'County', program: 'Peer-to-Peer', owner: people.dana, status: 'Awarded', awardAmount: 120000, startDate: ymd(Y - 1, 7, 1), endDate: ymd(Y + 1, 6, 30), contactName: 'Contract office (sample)', contactEmail: 'contracts@example.gov', next: 'Monthly call counts and hours staffed', folderLink: 'https://example.sharepoint.com/sites/grants/County-Peer-Line', reportCadence: 'Monthly', boardApproved: true }),
      row({ name: 'Crisis Response Training', funder: 'Brookfield Hills County (sample)', recordType: 'County contract', grantType: 'County', program: 'Crisis education', owner: people.dana, status: 'Awarded', awardAmount: 36000, startDate: ymd(Y - 2, 3, 1), endDate: d(-20), next: 'Final attendance list', comments: 'Irregular payments; see award years.' }),
      row({ name: 'School Outreach Pilot', funder: 'Bright Path Foundation (sample)', recordType: 'Grant', grantType: 'Foundation', program: 'Ending the Silence', owner: people.sam, status: 'Awarded', awardAmount: 60000, startDate: ymd(Y, 9, 1), endDate: ymd(Y + 2, 8, 31), contactName: 'Jordan Pike (sample)', contactEmail: 'jordan@example.org', next: 'Schools reached each semester', reportCadence: 'Yearly', watchDate: d(200), watchNote: 'Renewal conversation before year two' }),
      row({ name: 'Warmline Volunteer Training', funder: 'Oak Street Fund (sample)', recordType: 'Grant', grantType: 'Foundation', program: 'Support groups', owner: people.lee, status: 'Awarded', awardAmount: 20000, startDate: d(40), endDate: d(400), next: 'Training dates once set', boardMeeting: 'Report at the next board meeting' }),
      row({ name: 'Support Group Facilitator Stipends', funder: 'Harbor Health Partners (sample)', recordType: 'Grant', grantType: 'Corporate', program: 'Support groups', owner: people.morgan, status: 'Applied', awardAmount: 15000, deadline: d(-30), next: 'Decision expected in about 6 weeks' }),
      row({ name: 'Peer Workforce Subaward', funder: 'State health department (sample)', recordType: 'Grant', grantType: 'State', program: 'Peer-to-Peer', owner: people.lee, status: 'Upcoming', awardAmount: 80000, deadline: d(9), next: 'Letters of support from two county partners' }),
      row({ name: 'Youth Mental Health First Aid', funder: 'Riverbend Community Foundation (sample)', recordType: 'Grant', grantType: 'Foundation', program: 'Crisis education', owner: people.sam, status: 'Upcoming', deadline: d(-2), comments: 'Apply-by date has passed; check if late entries are allowed.' }),
      row({ name: 'Federal peer workforce opportunity', funder: 'Federal agency (sample)', recordType: 'Grant', grantType: 'Federal', program: 'Peer-to-Peer', owner: people.lee, status: 'Potentials', deadline: d(45), links: 'https://www.grants.gov/', comments: 'Large and competitive; decide by next team meeting.' }),
      row({ name: 'Grocery round-up', funder: 'Neighborhood Market (sample)', recordType: 'Grant', grantType: 'Corporate', program: 'General operating', owner: people.pat, status: 'Potentials', watchDate: d(25), watchNote: 'Applications open each spring' }),
      row({ name: 'Family Night Events', funder: 'Cedar Valley Fund (sample)', recordType: 'Grant', grantType: 'Foundation', program: 'NAMI Basics', owner: people.pat, status: 'Potentials' }),
      row({ name: 'In Our Own Voice Presentations', funder: 'Northshore Rotary (sample)', recordType: 'Grant', grantType: 'Other', program: 'In Our Own Voice', owner: people.morgan, status: 'Archived', archiveReason: 'Closed', awardAmount: 5000, startDate: ymd(Y - 1, 1, 1), endDate: ymd(Y - 1, 12, 31) }),
      row({ name: 'Technology Upgrade', funder: 'Summit Tech Giving (sample)', recordType: 'Grant', grantType: 'Corporate', program: 'General operating', owner: people.lee, status: 'Archived', archiveReason: 'Declined', deadline: ymd(Y, 3, 15), watchDate: ymd(Y + 1, 2, 1), watchNote: 'Try again next cycle' }),
      row({ name: 'Rural Outreach', funder: 'Prairie Lands Trust (sample)', recordType: 'Grant', grantType: 'Foundation', program: 'Family-to-Family', owner: people.sam, status: 'Archived', archiveReason: 'Not pursued' }),
      row({ name: 'New idea, details later' })
    ];
    // The last record shows that only a name is needed: fallbacks fill status and record type.
    records[records.length - 1].status = 'Potentials';
    records[records.length - 1].recordType = 'Grant';
    records[records.length - 1].owner = people.pat;

    function rec(name) { for (var i = 0; i < records.length; i++) if (records[i].name === name) return records[i].id; return null; }

    var awardYears = [
      row({ record: rec('Crisis Response Training'), year: Y - 2, amount: 8000 }),
      row({ record: rec('Crisis Response Training'), year: Y - 1, amount: 18000 }),
      row({ record: rec('Crisis Response Training'), year: Y, amount: 10000 })
    ];

    var tasks = [
      row({ record: rec('Family Education Expansion'), title: '6-month report to Lakeshore', type: '6-month report', dueDate: d(6), assignedTo: people.morgan, steps: 'Pull class attendance\nWrite one family story\nSend to the funder', done: false }),
      row({ record: rec('Peer Support Line'), title: 'Monthly call summary', type: 'Other', dueDate: d(-3), assignedTo: people.dana, steps: 'Export call log\nFill county form', done: false }),
      row({ record: rec('School Outreach Pilot'), title: 'Thank-you letter to Bright Path', type: 'Thank-you letter', dueDate: d(12), assignedTo: people.sam, steps: 'Draft letter\nDirector signs\nMail', done: false }),
      row({ record: rec('In Our Own Voice Presentations'), title: '1-year report to Rotary', type: '1-year report', dueDate: d(-60), assignedTo: people.morgan, steps: 'Count presentations\nSend report', done: true }),
      row({ record: rec('Grocery round-up'), title: 'Review: grocery round-up opens soon', type: 'Review', dueDate: d(25), assignedTo: people.pat, steps: '', done: false })
    ];

    var progress = [
      row({ task: tasks[0].id, person: people.morgan, step: 'Pull class attendance', done: true, comment: 'Spring and summer classes pulled.', date: d(-4) }),
      row({ task: tasks[2].id, person: people.sam, step: 'Draft letter', done: true, comment: '', date: d(-1) })
    ];

    var watch = [
      row({ name: 'Greater Milwaukee Foundation cycles 1 to 3', kind: 'Cycle', opens: '', repeatsYearly: true, link: 'https://www.greatermilwaukeefoundation.org/', notes: 'Add the months each cycle opens.' }),
      row({ name: 'United Way MHCP Mental Health Improvement Fund', kind: 'Cycle', opens: '', repeatsYearly: true, link: '', notes: 'Add the month it opens.' }),
      row({ name: 'Impact100 Greater Milwaukee', kind: 'Cycle', opens: '', repeatsYearly: true, link: '', notes: 'Add the month it opens.' }),
      row({ name: 'Community bank giving round', kind: 'Custom', opens: String(base.getMonth() + 1), repeatsYearly: true, link: '', notes: 'Opens this month each year.' }),
      row({ name: 'Technology Upgrade retry', kind: 'Retry', opens: String(2), repeatsYearly: false, record: rec('Technology Upgrade'), notes: 'Declined this year; reapply next cycle.' })
    ];

    var feeds = [
      row({ name: 'Grants.gov: mental health and peer support', type: 'Grants.gov', source: 'mental health; peer support; crisis; suicide prevention; family support', on: true }),
      row({ name: 'Partner foundation news (sample)', type: 'Feed link', source: 'https://example.org/feed.xml', on: true }),
      row({ name: 'Wisconsin DHS funding opportunities', type: 'Quick link', source: 'https://www.dhs.wisconsin.gov/', on: true })
    ];

    var labels = [
      row({ key: 'status.Potentials', defaultText: 'Potentials', customText: '' }),
      row({ key: 'status.Upcoming', defaultText: 'Upcoming', customText: '' }),
      row({ key: 'status.Applied', defaultText: 'Applied', customText: '' }),
      row({ key: 'status.Awarded', defaultText: 'Awarded', customText: '' }),
      row({ key: 'status.Active', defaultText: 'Active', customText: '' }),
      row({ key: 'status.Archived', defaultText: 'Archived', customText: '' }),
      row({ key: 'tile.fundingWatch', defaultText: 'Funding Watch', customText: '' })
    ];

    var peopleList = [
      row({ person: people.morgan, email: 'morgan@example.org', role: 'Editor', programs: 'All' }),
      row({ person: people.dana, email: 'dana@example.org', role: 'Editor', programs: 'All' }),
      row({ person: people.lee, email: 'lee@example.org', role: 'Editor', programs: 'All' }),
      row({ person: people.sam, email: 'sam@example.org', role: 'Viewer', programs: 'Ending the Silence; Crisis education' }),
      row({ person: people.pat, email: 'pat@example.org', role: 'Viewer', programs: 'NAMI Basics; General operating' })
    ];

    var settings = [
      row({ key: 'programs', value: 'Family-to-Family; Peer-to-Peer; In Our Own Voice; Ending the Silence; NAMI Basics; Support groups; Crisis education; General operating' }),
      row({ key: 'grantTypes', value: 'Federal; State; County; Foundation; Corporate; Other' }),
      row({ key: 'fiscalYearStart', value: 'January' }),
      row({ key: 'defaultAwardView', value: 'Award year' }),
      row({ key: 'dueSoonDays', value: '14' }),
      row({ key: 'filters', value: 'time period; status; program; funder; grant type; owner; record type; apply-by range' }),
      row({ key: 'customColumns', value: 'boardMeeting|Board meeting|text||on; reportCadence|Report cadence|choice|Monthly, Every 6 months, Yearly|on; boardApproved|Board approved|yesno||on' }),
      row({ key: 'showStatusNotes', value: 'yes' }),
      row({ key: 'grantsGovKeywords', value: 'mental health; peer support; crisis; suicide prevention; family support' })
    ];

    return {
      records: records, awardYears: awardYears, tasks: tasks, progress: progress, watch: watch,
      feeds: feeds, labels: labels, people: peopleList, settings: settings
    };
  }

  var api = { build: build };
  root.NAMI = root.NAMI || {};
  root.NAMI.sample = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
