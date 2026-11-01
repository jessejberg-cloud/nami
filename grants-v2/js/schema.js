/*
  NAMI Grants Dashboard v2: the list schema.

  One entry per SharePoint list. Each column has:
    key      the name used in this page's code
    sp       the SharePoint internal column name (Title is SharePoint's built-in first column)
    label    the default text shown on screen (renamable later from the Labels list)
    type     text | note | choice | number | currency | date | email | phone | url | yesno | person | lookup | month
    choices  for choice columns: the default options (editable later from Settings)
    list     for lookup columns: the list it points to
    required true only where SPEC.md says so (Records: Name)

  Loaded as an ordinary script so the page opens straight from a folder.
*/
(function (root) {
  'use strict';

  var STATUS = ['Potentials', 'Upcoming', 'Applied', 'Awarded', 'Archived'];
  var STATUS_NOTES = {
    Potentials: "opportunities we're considering",
    Upcoming: 'decided to apply, apply-by date ahead',
    Applied: 'submitted, waiting to hear',
    Awarded: 'awarded',
    Active: 'awarded, currently running',
    Archived: 'finished: Closed, Declined or Not pursued'
  };

  var LISTS = [
    {
      key: 'records', sp: 'Records', label: 'Grants and contracts',
      columns: [
        { key: 'name', sp: 'Title', label: 'Name', type: 'text', required: true },
        { key: 'funder', sp: 'Funder', label: 'Funder', type: 'text' },
        { key: 'recordType', sp: 'RecordType', label: 'Record type', type: 'choice', choices: ['Grant', 'County contract'], fallback: 'Grant' },
        { key: 'grantType', sp: 'GrantType', label: 'Grant type', type: 'choice', choices: ['Federal', 'State', 'County', 'Foundation', 'Corporate', 'Other'] },
        { key: 'program', sp: 'Program', label: 'Program', type: 'choice', choicesFrom: 'programs' },
        { key: 'owner', sp: 'Owner', label: 'Owner', type: 'person', fallback: '@me' },
        { key: 'status', sp: 'Status', label: 'Status', type: 'choice', choices: STATUS, fallback: 'Potentials' },
        { key: 'archiveReason', sp: 'ArchiveReason', label: 'Archive reason', type: 'choice', choices: ['Closed', 'Declined', 'Not pursued'] },
        { key: 'awardAmount', sp: 'AwardAmount', label: 'Award amount', type: 'currency' },
        { key: 'startDate', sp: 'StartDate', label: 'Start date', type: 'date' },
        { key: 'endDate', sp: 'EndDate', label: 'End date', type: 'date' },
        { key: 'deadline', sp: 'Deadline', label: 'Apply by', type: 'date' },
        { key: 'contactName', sp: 'ContactName', label: 'Contact name', type: 'text' },
        { key: 'contactEmail', sp: 'ContactEmail', label: 'Contact email', type: 'email' },
        { key: 'contactPhone', sp: 'ContactPhone', label: 'Contact phone', type: 'phone' },
        { key: 'next', sp: 'Next', label: 'Next (what the funder wants to know)', type: 'note' },
        { key: 'comments', sp: 'Comments', label: 'Comments', type: 'note' },
        { key: 'links', sp: 'Links', label: 'Links', type: 'note' },
        { key: 'folderLink', sp: 'FolderLink', label: 'Folder link', type: 'url' },
        { key: 'watchDate', sp: 'WatchDate', label: 'Watch date', type: 'date' },
        { key: 'watchNote', sp: 'WatchNote', label: 'Watch note', type: 'note' }
      ]
    },
    {
      key: 'awardYears', sp: 'AwardYears', label: 'Award years',
      columns: [
        { key: 'record', sp: 'Record', label: 'Record', type: 'lookup', list: 'records' },
        { key: 'year', sp: 'Year', label: 'Year', type: 'number' },
        { key: 'amount', sp: 'Amount', label: 'Amount', type: 'currency' }
      ]
    },
    {
      key: 'tasks', sp: 'Tasks', label: 'Tasks',
      columns: [
        { key: 'record', sp: 'Record', label: 'Record', type: 'lookup', list: 'records' },
        { key: 'title', sp: 'Title', label: 'Title', type: 'text' },
        { key: 'type', sp: 'TaskType', label: 'Type', type: 'choice', choices: ['Thank-you letter', '6-month report', '1-year report', 'Review', 'Other'] },
        { key: 'dueDate', sp: 'DueDate', label: 'Due date', type: 'date' },
        { key: 'assignedTo', sp: 'AssignedTo', label: 'Assigned to', type: 'person' },
        { key: 'steps', sp: 'Steps', label: 'Steps (one per line)', type: 'note' },
        { key: 'done', sp: 'Done', label: 'Done', type: 'yesno' }
      ]
    },
    {
      key: 'progress', sp: 'Progress', label: 'Progress',
      columns: [
        { key: 'task', sp: 'Task', label: 'Task', type: 'lookup', list: 'tasks' },
        { key: 'person', sp: 'Person', label: 'Person', type: 'person' },
        { key: 'step', sp: 'Step', label: 'Step', type: 'text' },
        { key: 'done', sp: 'Done', label: 'Done', type: 'yesno' },
        { key: 'comment', sp: 'Comment', label: 'Comment', type: 'note' },
        { key: 'date', sp: 'EntryDate', label: 'Date', type: 'date' }
      ]
    },
    {
      key: 'watch', sp: 'Watch', label: 'Watch list',
      columns: [
        { key: 'name', sp: 'Title', label: 'Name', type: 'text' },
        { key: 'kind', sp: 'Kind', label: 'Kind', type: 'choice', choices: ['Cycle', 'Renewal', 'Retry', 'Custom'] },
        { key: 'opens', sp: 'OpensMonth', label: 'Opens (month)', type: 'month' },
        { key: 'repeatsYearly', sp: 'RepeatsYearly', label: 'Repeats yearly', type: 'yesno' },
        { key: 'link', sp: 'Link', label: 'Link', type: 'url' },
        { key: 'notes', sp: 'Notes', label: 'Notes', type: 'note' },
        { key: 'record', sp: 'LinkedRecord', label: 'Linked record', type: 'lookup', list: 'records' }
      ]
    },
    {
      key: 'feeds', sp: 'Feeds', label: 'Feeds',
      columns: [
        { key: 'name', sp: 'Title', label: 'Name', type: 'text' },
        { key: 'type', sp: 'FeedType', label: 'Type', type: 'choice', choices: ['Grants.gov', 'Feed link', 'Quick link'] },
        { key: 'source', sp: 'Source', label: 'Keywords or URL', type: 'note' },
        { key: 'on', sp: 'On', label: 'On', type: 'yesno' }
      ]
    },
    {
      key: 'labels', sp: 'Labels', label: 'Labels',
      columns: [
        { key: 'key', sp: 'Title', label: 'Key', type: 'text' },
        { key: 'defaultText', sp: 'DefaultText', label: 'Default text', type: 'text' },
        { key: 'customText', sp: 'CustomText', label: 'Custom text', type: 'text' }
      ]
    },
    {
      key: 'people', sp: 'People', label: 'People',
      columns: [
        { key: 'person', sp: 'Title', label: 'Person', type: 'person' },
        { key: 'email', sp: 'Email', label: 'Email', type: 'email' },
        { key: 'role', sp: 'Role', label: 'Role', type: 'choice', choices: ['Editor', 'Viewer'] },
        { key: 'programs', sp: 'Programs', label: 'Programs', type: 'note' }
      ]
    },
    {
      key: 'settings', sp: 'Settings', label: 'Settings',
      columns: [
        { key: 'key', sp: 'Title', label: 'Key', type: 'text' },
        { key: 'value', sp: 'Value', label: 'Value', type: 'note' }
      ]
    }
  ];

  function list(key) {
    for (var i = 0; i < LISTS.length; i++) if (LISTS[i].key === key) return LISTS[i];
    return null;
  }

  function column(listKey, colKey) {
    var l = list(listKey);
    if (!l) return null;
    for (var i = 0; i < l.columns.length; i++) if (l.columns[i].key === colKey) return l.columns[i];
    return null;
  }

  var api = { LISTS: LISTS, STATUS: STATUS, STATUS_NOTES: STATUS_NOTES, list: list, column: column };
  root.NAMI = root.NAMI || {};
  root.NAMI.schema = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
