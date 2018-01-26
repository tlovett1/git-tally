# Git Tally

Git Tally is a simple command line utility for tallying author contributions for a given git repository.

## Installation

Install the package globall with npm:
```
npm install -g git-tally
```

## Usage

First navigate to a git repository via the command line:
```
cd my-repo
```

Next run the command:
```
git-tally
```

You will see a table like this:

```
┌──────────────────────────┬────────────────────────────┬───────┬─────────┬─────────────────────────────────────────┐
│ Name                     │ Email                      │ Added │ Removed │ Latest Commit                           │
├──────────────────────────┼────────────────────────────┼───────┼─────────┼─────────────────────────────────────────┤
│ Taylor Lovett            │ email@email.com            │ 85856 │ 96113   │ Wed Jan 24 2018 23:52:52 GMT-0500 (EST) │
├──────────────────────────┼────────────────────────────┼───────┼─────────┼─────────────────────────────────────────┤
│ Another Person           │ email2@email2.com          │ 6551  │ 5015    │ Sun Aug 24 2014 14:16:12 GMT-0400 (EDT) │
└──────────────────────────┴────────────────────────────┴───────┴─────────┴──────────────────────────────────────────
```



