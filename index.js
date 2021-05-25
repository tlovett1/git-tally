#!/usr/bin/env node

const program = require('commander');
const fs = require('fs');
const path = require('path');
const child_process = require('child_process');
const colors = require('colors');
const Table = require('cli-table');
const json2csv = require('json2csv');

const testGitPromise = (pathOrGit) => {
  return new Promise((resolve, reject) => {
    const testGit = child_process.spawn('git', ['status'], { cwd: pathOrGit });

    testGit.on('close', (code) => {
      if (0 !== code) {
        console.log('Not a git repository.'.red);
        process.exit(1);
      }

      resolve();
    });
  });
}

const statsPromise = () => {
  return new Promise((resolve, reject) => {
    let statsString = '';

    const stats = child_process.spawn('git', ['log', '--numstat', '--pretty=format:@@@COMMIT@@@<%an> <%ae> <%at>@', '--no-merges']);

    stats.stdout.on('data', (data) => {
      statsString += data.toString();
    });

    stats.stderr.on('data', (data) => {
      console.log(data.toString());
    });

    stats.on('close', (code) => {
      if (0 !== code) {
        console.log('Git stats failed');
        process.exit(1);
      }

      resolve(statsString);
    });
  });
}

const cloneToTemp = (address) => {
  return new Promise((resolve, reject) => {
    const tmpDir = 'tmp-repo' + Date.now();

    const clone = child_process.spawn('git', ['clone', address, tmpDir]);

    clone.on('close', (code) => {
      if (0 !== code) {
        console.log('Git clone failed');
        process.exit(1);
      }

      const onClose = () => {
        fs.rmdirSync(path.resolve('./' + tmpDir), { recursive: true });
      };

      process.on('exit', onClose);
      process.on('SIGINT', onClose);

      resolve(tmpDir);
    });
  });
}

const run = async (pathOrGitHub, options) => {

  let workingDir = '.';

  if (pathOrGitHub) {
    workingDir = pathOrGitHub;
  }

  if (workingDir.match(/(http:|git@github)/i)) {
    workingDir = './' + await cloneToTemp(workingDir);
  }

  workingDir = path.resolve(workingDir);

  await testGitPromise(workingDir);

  let statsString = await statsPromise();
  const tally = {};

  const commits = statsString.split('@@@COMMIT@@');

  commits.forEach((commit) => {
    lines = commit.split("\n");

    if (1 > lines.length || !lines[0].match(/^@<.*?> <.*?> <.*?>@$/)) {
      return;
    }

    let name = lines[0].replace(/^@<(.*?)> <.*?> <.*?>@$/, '$1');
    let email = lines[0].replace(/^@<.*?> <(.*?)> <.*?>@$/, '$1');
    let date = lines[0].replace(/^@<.*?> <.*?> <(.*?)>@$/, '$1');

    if (!email && options.requireEmail) {
      return;
    }

    let key = name + ' ' + email;

    if (!tally[key]) {
      tally[key] = {
        name: name,
        email: email,
        added: 0,
        removed: 0,
        latestCommit: date,
      };
    }

    if (date > tally[key].latestCommit) {
      tally[key].latestCommit = date;
    }

    lines.shift();

    lines.forEach((line) => {
      if (!line.match(/^[0-9]+\t[0-9]+\t.*$/)) {
        return;
      }

      let added = line.replace(/^([0-9]+)\t[0-9]+\t.*$/, '$1');
      let removed = line.replace(/^[0-9]+\t([0-9]+)\t.*$/, '$1');

      tally[key].added += parseInt(added);
      tally[key].removed += parseInt(removed);
    });
  });

  if (Object.keys(tally).length < 1) {
    console.log('No authors found.'.red);
    process.exit(1);
  }

  let orderedTally = [];

  /**
   * Sort
   */
  for (author in tally) {
    let inserted = false;

    for (let i = 0; i < orderedTally.length; i++) {
      if (tally[author].added + tally[author].removed >= orderedTally[i].added + orderedTally[i].removed) {
        orderedTally.splice(i, 0, tally[author]);
        inserted = true;
        break;
      }
    }

    if (!inserted) {
      orderedTally.push(tally[author]);
    }
  }

  if (options.asc) {
    orderedTally = orderedTally.reverse();
  }

  if (options.emailOnly) {
    orderedTally.forEach((author) => {
      console.log(author.email);
    });
  } else {
    const table = new Table({
      head: ['Name', 'Email', 'Added', 'Removed', 'Latest Commit']
    });

    orderedTally.forEach((author) => {
      let date = new Date(author.latestCommit * 1000);
      author.latestCommit = date.toString();
      table.push(Object.keys(author).map((key) => author[key]));
    });

    console.log(table.toString());
  }

  if (options.csvOutput) {
    let fields = ['name', 'email'];

    if (options.emailOnly) {
      fields = ['email'];
    }

    const csv = json2csv({ data: orderedTally, fields: ['name', 'email'] });

    console.log(options.csvOutput);

    if (true === options.csvOutput) {
      options.csvOutput = 'output.csv'
    }

    fs.writeFile(options.csvOutput, csv, function(err) {
      if (err) {
        throw err;
      }

      console.log(('csv saved to ' + options.csvOutput).green);
    });
  }
}

(async () => {
  program
    .version('1.0.0')
    .arguments('[path-or-github-repo]', 'Can be a path or a GitHub repository URL')
    .option('--email-only', 'Only output email')
    .option('--asc', 'Show results in ascending order')
    .option('--csv-output [value]', 'Save data to csv file. output.csv by default.')
    .action(run);

  await program.parseAsync(process.argv);
})();
