require('dotenv').config();
const fs = require('fs');
const path = require('path');
const {
  GraphQLProcessor,
  JobProcessor
} = require('@restorecommerce/gql-bot');
const { program } = require('commander');

const CONFIG_NAME = process.env.CONFIG_NAME ?? '.config.json';
const CONFIG = JSON.parse(fs.readFileSync(CONFIG_NAME).toString());

async function commandDataImport(cmd) {
  const dataset = cmd.dataset ?? exitWithError('error: please choose data set');
  const accessToken = cmd.token
    ?? process.env.ACCESS_TOKEN
    ?? exitWithError('error: please provide an access token');

  const jobs = (cmd.job?.length > 0 ? cmd.job : undefined)
    ?? process.env.JOBS?.split(',')
    ?? exitWithError('error: please provide a job');

  jobs.forEach(job => {
    const filePath = getFullJobPath(dataset, job);
    try {
      fs.statSync(filePath);
    } catch (e) {
      exitWithError(`error: job '${job}' does not exist at path: ${filePath}`);
    }
  });

  const config = {
    ...CONFIG
  };

  /*
  const protocol = cmd.protocol ?? config.protocol ?? 'http'
  const host = cmd.host ?? config.host;
  const port = cmd.port ?? config.port;
  config.entry = `${protocol}://${host}:${port}${config.endpoint}`;
  */

  if (accessToken) {
    config.headers = Object.assign({}, config.headers, { 'Authorization': `Bearer ${accessToken}` });
  }

  const gqlProcessor = new GraphQLProcessor(config);

  /* eslint no-restricted-syntax: ["error", "FunctionExpression",
   "WithStatement", "BinaryExpression[operator='in']"] */
  for (const jobName of jobs) {
    const job = JSON.parse(fs.readFileSync(getFullJobPath(dataset, jobName), 'utf8'));
    job.options.processor = gqlProcessor;
    const jobProcessor = new JobProcessor(job);
    const jobResult = await jobProcessor.start(null, null, !!cmd.verbose, !!cmd.ignore);
    jobResult.on('progress', (task) => {
      console.log('Progress :', task.basename);
    });
    jobResult.on('done', () => {
      console.log('Resources imported successfully');
    });
    jobResult.on('error', (err) => {
      console.error('Error :', err, JSON.stringify(err ?? '', null, 2));
    });
  }
}

function commandListJobs(cmd) {
  const dataset = cmd.dataset ?? exitWithError('error: please choose data set');
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

async function importData() {
  program
    .command('import')
    .description('import data')
    .option('-d, --dataset <dataset>', 'select dataset domain')
    .option('-t, --token <access_token>', 'access token to use for communications')
    .option('-u, --url <entry>', 'url to entry point', undefined)
    .option('-j, --job <job>', 'list of jobs to process', (v, p) => p.concat(v), [])
    .option('-i, --ignore', 'ignore errors and don\'t stop', false)
    .option('-v, --verbose', 'verbose output', false)
    .action(commandDataImport);

  program
    .command('jobs')
    .description('list all available jobs')
    .option('-d, --dataset <dataset>', 'select dataset domain')
    .action(commandListJobs);
  
  program
    .command('datasets')
    .description('list all available datasets')
    .action(commandListDatasets);

  await program.parseAsync(process.argv);
}

function exitWithError(message) {
  console.error(message, '\n');
  console.log(program.helpInformation());
  process.exit(1);
}

function getFullJobPath(dataset, job) {
  return path.resolve(path.join(CONFIG['data_directory'], dataset, CONFIG['job_directory'], CONFIG['job_prefix'] + job + '.json'));
}

importData();
