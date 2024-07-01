#!/usr/bin/env node
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const {
  GraphQLProcessor,
  JobProcessor
} = require('@restorecommerce/gql-bot');
const { program } = require('commander');

const DB_IMPORT_CONFIG_NAME = process.env.DB_IMPORT_CONFIG_NAME ?? '.config.json';
const CONFIG = JSON.parse(fs.readFileSync(DB_IMPORT_CONFIG_NAME).toString())?.db_import;

async function commandDataImport(cmd) {
  CONFIG ?? exitWithError('error: invalid or missing config');
  const dataset = cmd.dataset
    ?? exitWithError('error: please select data set');
  const accessToken = cmd.token
    ?? exitWithError('error: please provide an access token');
  const jobs = (cmd.job?.length > 0 ? cmd.job : undefined)
    ?? exitWithError('error: please provide a job');

  jobs.forEach(job => {
    const filePath = getFullJobPath(dataset, job);
    try {
      fs.statSync(filePath);
    } catch (e) {
      exitWithError(`error: job '${job}' does not exist at path: ${filePath}`);
    }
  });

  CONFIG.headers = Object.assign(CONFIG.headers ?? {}, { 'Authorization': `Bearer ${accessToken}` });
  CONFIG.entry = cmd.url ?? CONFIG.entry

  const gqlProcessor = new GraphQLProcessor(CONFIG);

  /* eslint no-restricted-syntax: ["error", "FunctionExpression",
   "WithStatement", "BinaryExpression[operator='in']"] */
  for (const jobName of jobs) {
    const job = JSON.parse(fs.readFileSync(getFullJobPath(dataset, jobName), 'utf8'));
    job.options.processor = gqlProcessor;
    const jobProcessor = new JobProcessor(job);
    const jobResult = await jobProcessor.start(null, null, !!cmd.verbose, !!cmd.ignore);
    jobResult.on('progress', (task) => {
      console.log('Progress:', task.basename);
    });
    jobResult.on('done', () => {
      console.log('Import successfully');
    });
    jobResult.on('error', (err) => {
      console.error('Error:', err, JSON.stringify(err ?? '', null, 2));
    });
  }
}

function commandListJobs(cmd) {
  const dataset = cmd.dataset ?? exitWithError('Error: please select data set');
  const files = fs.readdirSync(path.join(CONFIG['data_directory'], dataset, CONFIG['job_directory']));
  const prefix = CONFIG['job_prefix'];
  files.forEach(file => {
    if (file.startsWith(prefix) && file.endsWith('.json')) {
      console.log(file.substring(prefix.length, file.length - 5));
    }
  });
}

function commandListDatasets(cmd) {
  const dirs = fs.readdirSync(CONFIG['data_directory']);
  dirs.forEach(dir => {
    console.log(path.basename(dir));
  });
}

function commandHashPassword(pw) {
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(pw, salt);
  console.log("Hash Password:", pw, "->", hash);
}

function commandValidateHash(pw, hash) {
  console.log("Input:", pw, hash);
  console.log("Validate Password:", bcrypt.compareSync(pw, hash));
}

async function importData() {
  program
    .command('import')
    .description('import data')
    .option('-d, --dataset <dataset>', 'select dataset domain')
    .option(
      '-j, --job <job...>',
      'list of jobs to process',
      process.env.DB_IMPORT_JOBS?.split(' ') ?? CONFIG?.jobs ?? []
    )
    .option(
      '-u, --url <entry>',
      'url to endpoint point',
      process.env.DB_IMPORT_ENTRY ?? CONFIG?.entry
    )
    .option(
      '-t, --token <access_token>',
      'access token to use for communications',
      process.env.ACCESS_TOKEN ?? CONFIG?.access_token
    )
    .option('-i, --ignore', 'ignore errors and don\'t stop', false)
    .option('-v, --verbose', 'verbose output', false)
    .action(commandDataImport);

  program
    .command('jobs')
    .description('list all available jobs')
    .option('-d, --dataset <dataset>', 'select dataset domain')
    .action(commandListJobs);
  
  program
    .command('list')
    .description('list all available datasets')
    .action(commandListDatasets);
  
  program
    .command('hash')
    .description('hash a password')
    .argument('<pw>', 'the password to be hashed')
    .action(commandHashPassword);
  
  program
    .command('validate')
    .description('validate a password')
    .argument('<pw>', 'password')
    .argument('<hash>', 'hash')
    .action(commandValidateHash);

  await program.parseAsync(process.argv);
}

function exitWithError(message) {
  console.error(message, '\n');
  console.log(program.helpInformation());
  process.exit(1);
}

function getFullJobPath(dataset, job) {
  return path.resolve(path.join(
    CONFIG?.data_directory,
    dataset,
    CONFIG?.job_directory,
    CONFIG?.job_prefix + job + '.json'
  ));
}

importData();
