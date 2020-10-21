const fs = require('fs');
const { GraphQLProcessor, JobProcessor } = require('@restorecommerce/gql-bot');
const commander = require('commander');
const setCookieParser = require('set-cookie-parser');
const cookie = require('cookie');
const fetch = require('node-fetch');
const prompt = require('prompt');

const DEMO_DIR = 'seed_data';
const TEST_DIR = 'mock_data';

importData().then(() => {

}).catch((err) => { throw err; });

async function importData() {
  let job;
  let jobProcessor;
  let apiKey;
  let username;
  let password;
  let args;

  if (process.argv[0].endsWith('node') || process.argv[0].endsWith('node.exe')) {
    // called as "node import.js" => first argument is the node binary, discard
    args = process.argv.slice(1);
  } else {
    args = process.argv; // called as "import.js"
  }

  if (args.length < 2) {
    console.error('Error: Must supply API key or user + password'); // not sure why commander doesn't handle this
    process.exit(1);
  }

  commander
    .arguments('<apiKey or username> [password]')
    .option('-p, --production', 'Use production config instead of default config')
    .option('-d, --demo', 'Use live demo resources')
    .action((credential, passwd) => {
      if (passwd) {
        username = credential;
        password = passwd;
      } else {
        apiKey = credential;
      }
    })
    .parse(args);

  const resourcesDir = commander.demo ? DEMO_DIR : TEST_DIR;

  const configName = commander.production ? 'config_production.json' : 'config.json';
  const configs = JSON.parse(fs.readFileSync(configName));

  // Allow endpoint override via environment
  configs.entry = process.env.ENDPOINT || configs.entry;

  let sessionHeaders;

  if (username && password) {
    // name / passwd based auth
    configs.name = username;
    configs.password = password;
  } else {
    // add API key to headers
    configs.apiKey = apiKey;
  }

  const signInResult = await signIn(configs, apiKey != null);
  if ((apiKey && !signInResult.data.data.signInApiKey.error)
    || (password && !signInResult.data.data.signInUser.errors)) {
    // extracting headers to then pass session cookie
    sessionHeaders = signInResult.headers;
    const sessionCookies = sessionHeaders.get('set-cookie');

    const cookies = setCookieParser.splitCookiesString(sessionCookies);

    let jti;
    let jwt;
    for (let i = 0; i < cookies.length; i += 1) {
      const parsedCookie = setCookieParser.parse(cookies[i])[0];

      if (parsedCookie.name === 'restorecommerce_jti') {
        jti = parsedCookie.value;
      } else if (parsedCookie.name === 'restorecommerce_jwt') {
        jwt = parsedCookie;
      }
    }

    sessionHeaders = {
      cookie: cookie.serialize(jwt.name, jwt.value, jwt),
      'x-csrf-token': jti,
      'x-refresh-token': sessionHeaders.get('x-jwt')
    };

    configs.headers = { ...configs.headers, ...sessionHeaders };
  }

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

async function signIn(config, apiKeyExists) {
  let body;
  if (apiKeyExists) {
    body = JSON.stringify({
      query: `
        mutation {
          signInApiKey (input: {
            apiKey: "${config.apiKey}"
          }) {
            status, error {
              code, message
            }
          }
        }
        `
    });
  } else {
    body = JSON.stringify({
      query: `
        mutation {
          signInUser(input: {
            name: "${config.name}",
            password: "${config.password}"
          }) {
            error {
              code, message
            }
          }
        }
        `
    });
  }

  const response = await fetch(config.entry, {
    method: 'post',
    headers: { 'Content-Type': 'application/json', ...config.headers },
    body
  });
  return {
    headers: response.headers,
    data: await response.json()
  };
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
