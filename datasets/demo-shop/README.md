# Demo-Shop Data Set for Restorecommerce

The data set comprises the following resources:

- Test users for back office and customers
- Master data such as VAT rates for Europe
- Shop catalog with thousands of products based on [a Flipkart data set](https://www.kaggle.com/pramod7/flipkart-data-insights)

The data is partially generated with a set of generator scripts which reside
under [generator](generator).

## Usage

This data set comes with a set of scripts which import JSON and YAML data.
Resources are imported using the [gql-bot](https://github.com/restorecommerce/gql-bot) which is an automated task processor with a GraphQL Client.
All data is imported via the GraphQL API exposed by the [facade-srv](https://github.com/restorecommerce/facade-srv).

All possible operations are exposed through JS scripts.
These scripts either execute GraphQL mutations/ queries through the `import.js` script.
The `import.js` also includes command-line options such as specifying if we wish
to import the data locally or into the production environment.

### Current supported jobs are

- master (imports resources `organizations`, `addresses`, `contact_points`, `shops`, `customers`)
- identity (imports `users`)
- extra (import resources )
- catalog (imports resources `price_group`, `manufacturer`, `product_category`, `product_prototype`, `product`)

> NOTE: Resources must be imported in a specific order!
> Master > Identity > Extra > Catalog.
>
> For the case when importing resources returns "Access denied", one way to fix
> this is to restart `facade-srv` in order to sync the api key with the other
> upstream services.

### Script usage

1. Extract the API-KEY from the logs of `facade-srv`.

2. Either export the API-KEY, paste it to an `.env` file or paste as command argument.

2. Generate catalog datasets using [`transform.js script`](./generator/catalog/transform.js):

   - `node ./transform.js`

3. Import datasets using [`import.js script`](./import.js):

   - `node ./import.js import -t <access_token> -d demo-shop -j <job>`

4. Examples:

   - `node ./import.js import -t <access_token>  -d demo-shop -j master`
   - `node ./import.js import -t <access_token>  -d demo-shop -j identity`
   - `node ./import.js import -t <access_token>  -d demo-shop -j catalog`

### Supported environment variables: `GQL_ENDPOINT`.

All flags are optional, and they can be listed by typing `node ./import.js -h`.
The API key can be obtained from the [`facade-srv`](https://github.com/restorecommerce/facade-srv/blob/master/cfg/config.json#L21) configuration.
The API key is generated during system startup from the `facade-srv` (Check the log message of facade-srv `Bootstrap API Key is`).

By default, the GraphQL importer uses the configuration file `config.json` to read data regarding endpoints for retrieving the API key
and executing mutations/ queries.

## Object Importer

To import the files, following settings needs to be configured in [config.json](cfg/config.json):
* The base directory for import, 
* GraphQL endpoint 
* Bucket name for the storage-server

Prerequisite: object importer should be build using `npm run build` command before importing objects.

```sh
# Run import in production-mode:
npm run import-objects -- --apiKey=<access_token> -- --NODE_ENV=local

# Run import in production-mode:
npm run import-objects -- --apiKey=<access_token> -- --NODE_ENV=production
# or:
npm run import-objects -- --apiKey=<access_token> # default is development
```