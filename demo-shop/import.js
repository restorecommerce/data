require('dotenv').config();

const fs = require('fs');
const { GraphQLProcessor, JobProcessor } = require('@restorecommerce/gql-bot');
const commander = require('commander');
const prompt = require('prompt');

const DATA_DIR = 'mock_data';

const gqlEndpoint = process.env.GQL_ENDPOINT;

importData().then(() => {

}).catch((err) => { throw err; });

async function importData() {
  let job;
  let jobProcessor;
  let accessToken;
  let args;

  if (process.argv[0].endsWith('node') || process.argv[0].endsWith('node.exe')) {
    // called as "node import.js" => first argument is the node binary, discard
    args = process.argv.slice(1);
  } else {
    args = process.argv; // called as "import.js"
  }

  if (args.length < 2) {
    console.error('Error: Must supply an access token'); // not sure why commander doesn't handle this
    process.exit(1);
  }

  commander
    .arguments('<access token>')
    .action((credential) => {
      accessToken = credential;
    })
    .parse(args);

  const resourcesDir = DATA_DIR;

  const configName = '.config.json';
  const configs = JSON.parse(fs.readFileSync(configName));

  configs.accessToken = accessToken;

  const jobs = JSON.parse(fs.readFileSync('jobs.json'));
  const jobName = await promptJobs(jobs);

  const jobPath = jobs[jobName];
  if (jobPath) {
    const gqlProcessor = new GraphQLProcessor(configs);

    job = JSON.parse(fs.readFileSync(jobPath, 'utf8'));
    job.tasks = job.tasks.map((task) => {
      task.src += resourcesDir;
      return task;
    });

    job.options.processor = gqlProcessor;

    jobProcessor = new JobProcessor(job);

    const jobResult = await jobProcessor.start();
    jobResult.on('progress', (task) => {
      console.log('Progress :', task.name);
    });

    jobResult.on('done', () => {
      // console.log('Resources imported successfully');
    });
  } else {
    console.error(`Job ${jobName} is not configured!`);
  }
}

async function promptJobs(jobs) {
  const validJobNames = Object.keys(jobs);

  console.log('Please choose an option number');
  validJobNames.forEach((jobName, i) => {
    console.log(`${i + 1}: ${jobName}`);
  });

  return new Promise((resolve, reject) => {
    prompt.get(['option'], (err, result) => {
      if (err) {
        console.log('Error occurred', err);
        reject(err);
      }

      console.log('Received option', result.option, ':', validJobNames[result.option - 1]);
      resolve(validJobNames[result.option - 1]);
    });
  });
}
