
import { FormData } from 'formdata-node';
import * as fs from 'fs';
import * as readline from 'readline';

const CONFIG_NAME = process.env.CONFIG_NAME || '.config.json';
const defaultConfig = JSON.parse(fs.readFileSync(CONFIG_NAME)
  .toString());
const realConfig = {
  ...defaultConfig
};

const availableEnvironments = [
  'local',
  'production'
];

export const getNodeEnv = (): string => {
  let resultEnvironment = 'local';
  if (!!realConfig['NODE_ENV'] && availableEnvironments.indexOf(realConfig['NODE_ENV']) >= 0) {
    resultEnvironment = realConfig['NODE_ENV'];
  }
  return resultEnvironment;
};

const baseDir = realConfig?.objectImport?.baseDir;
const NODE_ENV = getNodeEnv();
const facadeGqlEndpoint = realConfig?.objectImport?.endpoint[NODE_ENV];

async function sendRequest(file: string, bucketName: string, keyName: string, orgKey: string, contentType?: string): Promise<any> {
  const body = new FormData();
  body.append('operations', JSON.stringify({
    query: `mutation Ostorage($input: IIoRestorecommerceOstorageObject!) 
      { ostorage { object { Put(input: $input) { details { response { payload { url, bucket } status { code, message } } operationStatus { code, message } } } } } }`,
    variables: { "input": { "object": null, "bucket": `${bucketName}`, "key": `${keyName}`, "options": { "contentType": `${contentType}` } } }
  }));
  body.append('map', JSON.stringify({ fileVar: ['variables.input.object'] }));
  body.append('fileVar', {
    [Symbol.toStringTag]: 'File',
    stream: () => {
      return fs.createReadStream(file);
    }
  });

  // add authorization header with apiKey
  const apiKey = realConfig?.apiKey;
  let headers: any = {
    Authorization: 'Bearer ' + `${apiKey}`,
    'Content-Type': 'multipart/form-data',
    'Apollo-Require-Preflight': true
  };

  return fetch(facadeGqlEndpoint, { method: 'POST', body, headers });
}

function getFiles(path, files) {
  fs.readdirSync(path).forEach(function (file) {
    let subpath = path + '/' + file;
    if (fs.lstatSync(subpath).isDirectory()) {
      getFiles(subpath, files);
    } else {
      files.push(path + '/' + file);
    }
  });
}

async function runObjectImporter() {
  console.log('Objects-Import started');

  console.log(`Base directory is: \`${baseDir}\``);

  // prompt for prod import
  if (realConfig?.NODE_ENV?.toString()?.toLowerCase() === 'production') {
    await new Promise<void>(resolve => {
      readline.createInterface({
        input: process.stdin,
        output: process.stdout
      }).question('\x1b[31mYOU ARE ABOUT TO PERFORM AN IMPORT IN PRODUCTION, DO YOU REALLY WANT TO CONTINUE? [y/n]:\x1b[0m ', (response) => {
        if (response !== 'y') {
          console.log('Setup aborted');
          process.exit(1);
        }
        resolve();
      });
    });
  }

  const contentArr = realConfig?.objectImport?.content;
  if (!contentArr || !Array.isArray(contentArr)) {
    console.log('No sources (`content` parameter) defined for object directory or wrong format. Import is interrupted.');
    return;
  }

  for (let sourceDef of contentArr) {
    let dir = sourceDef.dir;
    let bucketName = sourceDef.bucketName;
    if (dir && bucketName) {
      let fullPath = baseDir + '/' + dir;
      if (!fs.existsSync(fullPath)) {
        console.warn(`Directory: \`${fullPath}\` does not exist, skipping this directory.`);
        continue;
      }

      console.warn(`Data from \`${fullPath}\` is going to be loaded into bucket \`${bucketName}\`.`);

      let files = [];
      // recursively read the files from the directory and upload file
      getFiles(fullPath, files);

      for (let file of files) {
        let contentType;
        // To upload removing the base directory name as key
        let keyName = file.substring(fullPath.length + 1, file.length + 1);
        // since orgKey is mandatory for GQL request
        let orgKey = '';
        // set content type for svg - image/svg+xml
        if (keyName.endsWith('svg')) {
          contentType = 'image/svg+xml';
        }
        await sendRequest(file, bucketName, keyName, orgKey, contentType).then((response) => { console.log('Upload Status:', file, response.status) });
      }
    }
  }
  process.exit();
}

// proivde apiKey as command line flag
runObjectImporter();
