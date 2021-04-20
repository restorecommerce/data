require('dotenv')
  .config();

const fs = require('fs');
const path = require('path');
const {
  GraphQLProcessor,
  JobProcessor
} = require('@restorecommerce/gql-bot');
const { program } = require('commander');

const CONFIG_NAME = process.env.CONFIG_NAME || '.config.json';

const defaultConfig = JSON.parse(fs.readFileSync(CONFIG_NAME)
  .toString());

async function commandDataImport(cmd) {
  const accessToken = cmd.token || process.env.ACCESS_TOKEN;
  if (!accessToken) {
    exitWithError('error: please provide an access token');
  }

  const dataSource = cmd.source || process.env.DATA_SOURCE;
  if (!dataSource) {
    exitWithError('error: please provide a data source');
  }

  const jobs = (cmd.job && cmd.job.length > 0 ? cmd.job : undefined) || (process.env.JOBS ? process.env.JOBS.split(',') : undefined);
  if (!jobs) {
    exitWithError('error: please provide a job');
  }

  jobs.forEach(job => {
    const filePath = getFullJobPath(job);
    try {
      fs.statSync(filePath);
    } catch (e) {
      exitWithError(`error: job '${job}' does not exist at path: ${filePath}`);
    }
  });

  jobs.forEach(job => {
    const filePath = getFullJobPath(job);
    try {
      fs.statSync(filePath);
    } catch (e) {
      exitWithError(`error: job '${job}' does not exist at path: ${filePath}`);
    }
  });

  const realConfig = {
    ...defaultConfig
  };

  const host = cmd.host || realConfig.host;
  const port = cmd.port || realConfig.port;

  realConfig.entry = `http://${host}:${port}${realConfig.endpoint}`;

  if (accessToken) {
    realConfig.headers = Object.assign({}, realConfig.headers, { 'Authorization': `Bearer ${accessToken}` });
  }

  const gqlProcessor = new GraphQLProcessor(realConfig);

  /* eslint no-restricted-syntax: ["error", "FunctionExpression",
   "WithStatement", "BinaryExpression[operator='in']"] */
  for (const jobName of jobs) {
    const job = JSON.parse(fs.readFileSync(getFullJobPath(jobName), 'utf8'));
    job.tasks = job.tasks.map((task) => {
      task.src += dataSource;
      return task;
    });

    job.options.processor = gqlProcessor;

    const jobProcessor = new JobProcessor(job);

    const jobResult = await jobProcessor.start();
    jobResult.on('progress', (task) => {
      console.log('Progress :', task.basename);
    });

    jobResult.on('done', () => {
      console.log('Resources imported successfully');
    });
  }
}

function commandDataGenerate(cmd) {
  // TODO
}

function commandListJobs(cmd) {
  const files = fs.readdirSync(defaultConfig['job_directory']);
  const prefix = defaultConfig['job_prefix'];
  files.forEach(file => {
    if (file.startsWith(prefix) && file.endsWith('.json')) {
      console.log(file.substring(prefix.length, file.length - 5));
    }
  });
}

async function importData() {
  program
    .command('import')
    .description('import data')
    .option('-t, --token <access_token>', 'access token to use for communications')
    .option('-h, --host <hostname>', 'target hostname', undefined)
    .option('-p, --port <port>', 'target port', undefined)
    .option('-s, --source <data_source>', 'data source to import from', 'seed_data')
    .option('-j, --job <job>', 'list of jobs to process', (v, p) => p.concat(v), [])
    .action(commandDataImport);

  program
    .command('generate')
    .description('generate datasets')
    .action(commandDataGenerate);

  program
    .command('jobs')
    .description('list all available jobs')
    .action(commandListJobs);

  await program.parseAsync(process.argv);
}

function exitWithError(message) {
  console.error(message, '\n');
  console.log(program.helpInformation());
  process.exit(1);
}

function getFullJobPath(job) {
  return path.resolve(path.join(defaultConfig['job_directory'], defaultConfig['job_prefix'] + job + '.json'));
}

importData();
