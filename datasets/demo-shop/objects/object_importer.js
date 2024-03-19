
const FormData = require('formdata-node').FormData;
const fs = require('fs');
const readline = require('readline');
const path = require('path');

const CONFIG_NAME = process.env.CONFIG_NAME ?? path.join(__dirname, '.config.json');
const defaultConfig = JSON.parse(fs.readFileSync(CONFIG_NAME).toString());
const realConfig = {
  ...defaultConfig
};

const baseDir = realConfig?.object_import?.base_dir;
const facadeGqlEndpoint = realConfig?.object_import?.endpoint;

async function sendRequest(file, bucketName, keyName, orgKey, contentType) {
  const body = new FormData();
  body.append('operations', JSON.stringify({
    query: `mutation Ostorage($input: IIoRestorecommerceOstorageObject!) {
       ostorage {
        object {
          Put(input: $input) {
            details {
              response {
                payload { url, bucket }
                status { code, message }
              }
              operationStatus { code, message }
            }
          }
        }
      }
    }`,
    variables: {
      "input": {
        "object": null,
        "bucket": `${bucketName}`,
        "key": `${keyName}`,
        "options": {
          "contentType": `${contentType}`
        }
      }
    }
  }));
  body.append('map', JSON.stringify({ fileVar: ['variables.input.object'] }));
  body.append('file', fs.createReadStream(file));

  // add authorization header with apiKey
  const apiKey = process.env.ACCESS_TOKEN ?? realConfig?.api_key;
  const headers = {
    Authorization: 'Bearer ' + `${apiKey}`,
    'Apollo-Require-Preflight': true
  };

  return fetch(facadeGqlEndpoint, { method: 'POST', body, headers });
}

function getFiles(dir, files) {
  fs.readdirSync(dir).forEach(function (file) {
    const subpath = path.join(dir, file);
    if (fs.lstatSync(subpath).isDirectory()) {
      getFiles(subpath, files);
    } else {
      files.push(subpath);
    }
  });
}

async function runObjectImporter() {
  console.log('Objects-Import started');
  console.log(`Base directory is: \`${baseDir}\``);

  // prompt for prod import
  if (realConfig?.NODE_ENV?.toString()?.toLowerCase() === 'production') {
    await new Promise(resolve => {
      readline.createInterface({
        input: process.stdin,
        output: process.stdout
      }).question('\x1b[31mYOU ARE ABOUT TO PERFORM AN IMPORT IN PRODUCTION, DO YOU REALLY WANT TO CONTINUE? [y/n]:\x1b[0m ', (response) => {
        if (response !== 'y') {
          console.error('Setup aborted');
          process.exit(1);
        }
        resolve();
      });
    });
  }

  const contentArr = realConfig?.object_import?.content;
  if (!contentArr || !Array.isArray(contentArr)) {
    console.error('No sources (`content` parameter) defined for object directory or wrong format. Import is interrupted.');
    return;
  }

  for (let sourceDef of contentArr) {
    let dir = sourceDef.dir;
    let bucketName = sourceDef.bucket_name;
    if (dir && bucketName) {
      let fullPath =  path.join(__dirname, baseDir, dir);
      if (!fs.existsSync(fullPath)) {
        console.error(`Directory: \`${fullPath}\` does not exist, skipping this directory.`);
        continue;
      }

      console.log(`Data from \`${fullPath}\` is going to be loaded into bucket \`${bucketName}\`.`);

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
        await sendRequest(
          file, bucketName, keyName, orgKey, contentType
        ).then(
          (response) => { console.log('Upload Status:', file, response.status) }
        );
      }
    }
  }
  process.exit();
}

runObjectImporter();
