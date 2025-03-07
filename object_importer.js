
const FormData = require('formdata-node').FormData;
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');
const { program } = require('commander');

const CONFIG_NAME = process.env.CONFIG_NAME ?? path.join(__dirname, '.config.json');
const CONFIG = JSON.parse(fs.readFileSync(CONFIG_NAME).toString())?.object_import;

async function sendRequest(endpoint, file, bucketName, keyName, token) {
  const contentType = mime.lookup(keyName);
  const body = new FormData();
  const blob = await fs.openAsBlob(file, { type: contentType });
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
      input: {
        bucket: `${bucketName}`,
        key: `${keyName}`,
        options: {
          contentType: `${contentType}`
        }
      }
    }
  }));
  body.append('map', JSON.stringify({ fileVar: ['variables.input.object'] }));
  body.append('fileVar', blob);

  const headers = {
    Authorization: `Bearer ${token}`,
    'Apollo-Require-Preflight': true,
  };

  return fetch(endpoint, { method: 'POST', body, headers });
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

async function commandObjectImporter(args) {
  console.log('Objects-Import started');
  console.log(`Base directory is: \`${args.base_dir}\``);

  const contentArr = CONFIG?.content;
  if (!Array.isArray(contentArr)) {
    console.error('No sources (`content` parameter) defined for object directory or wrong format. Import is interrupted.');
    return;
  }

  for (const sourceDef of contentArr) {
    const dir = sourceDef.dir;
    const bucketName = sourceDef.bucket_name;
    if (dir && bucketName) {
      const fullPath =  path.join(__dirname, args.base_dir, dir);
      if (!fs.existsSync(fullPath)) {
        console.error(`Directory: \`${fullPath}\` does not exist, skipping this directory.`);
        continue;
      }

      console.log(`Data from \`${fullPath}\` is going to be loaded into bucket \`${bucketName}\`.`);

      const files = [];
      // recursively read the files from the directory and upload file
      getFiles(fullPath, files);
      const token = args.token;
      const endpoint = args.url;
      for (const file of files) {
        // To upload removing the base directory name as key
        const keyName = file.substring(fullPath.length + 1, file.length + 1);
        await sendRequest(
          endpoint, file, bucketName, keyName, token
        ).then(
          (response) => console.log('Upload Status:', keyName, response.status, response.statusText)
        );
      }
    }
  }
}

async function main() {
  program
    .description('import objects')
    .option(
      '-u, --url <endpoint>',
      'url to endpoint point',
      process.env.OBJECT_IMPORT_ENTRY ?? CONFIG?.endpoint
    )
    .option(
      '-t, --token <access_token>',
      'access token to use for communications',
      process.env.ACCESS_TOKEN ?? CONFIG?.access_token
    )
    .option(
      '-b, --base_dir <base_dir>',
      'base directory for object import',
      process.env.OBJECT_IMPORT_BASE_DIR ?? CONFIG?.base_dir
    )
    .action(commandObjectImporter);

  await program.parseAsync(process.argv);
}

main();