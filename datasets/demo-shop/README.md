# Demo-Shop Data Set for Restorecommerce

The data set comprises the following resources:

- Test users for back office and customers
- Master data such as VAT rates for Europe
- Shop catalog with thousands of products based on [a Flipkart data set](https://www.kaggle.com/pramod7/flipkart-data-insights)

The data is partially generated with a set of generator scripts which reside
under [generator](generator).

> NOTE: Please import dataset [System](../system) before [Demo Shop](../demo-shop).

## Usage

This data set comes with a set of scripts which import JSON and YAML data.
Resources are imported using the [gql-bot](https://github.com/restorecommerce/gql-bot) which is an automated task processor with a GraphQL Client.
All data is imported via the GraphQL API exposed by the [facade-srv](https://github.com/restorecommerce/facade-srv).

All possible operations are exposed through JS scripts.
These scripts either execute GraphQL mutations/ queries through the `import.js` script.
The `import.js` also includes command-line options such as specifying if we wish
to import the data locally or into the production environment.

### Current supported jobs are

- master (imports `organizations`, `addresses`, `contact_points`, `shops`, `customers`)
- identity (imports `users`)
- catalog (imports `price_group`, `manufacturer`, `product_category`, `product_prototype`, `product`)
- samples (imports `orders`)

> NOTE: Resources should be imported in a specific order!
> Master > Identity > Catalog.
>
> For the case when importing resources returns "Access denied", one way to fix
> this is to restart `facade-srv` in order to sync the api key with the other
> upstream services.

### Script usage

1. Extract the API-KEY from the logs of `facade-srv`.

2. Either export the API-KEY, paste it to an `.env` file or paste as command argument.

3. Generate catalog datasets using [`transform.js script`](./generator/catalog/transform.js):

   - `node ./transform.js`

4. Import datasets using [`import.js script`](./import.js):

   - `node ./import.js import -t <access_token> -d demo-shop -j <job>`

5. Examples:

   - `node ./import.js import -t <access_token>  -d demo-shop -j master`
   - `node ./import.js import -t <access_token>  -d demo-shop -j identity`
   - `node ./import.js import -t <access_token>  -d demo-shop -j catalog`
   - `node ./import.js import -t <access_token>  -d demo-shop -j samples`

### Supported environment variables: `GQL_ENDPOINT`.

All flags are optional, and they can be listed by typing `node ./import.js -h`.
The API key can be obtained from the [`facade-srv`](https://github.com/restorecommerce/facade-srv/blob/master/cfg/config.json#L21) configuration.
The API key is generated during system startup from the `facade-srv` (Check the log message of facade-srv `Bootstrap API Key is`).
In case `facade-srv` is a local container use the following command to extract the `Bootstrap API-KEY`:

```sh
npm run env:token
```

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
npm run import:demoshop:objects -- --apiKey=<access_token> -- --NODE_ENV=local

# Run import in production-mode:
npm run import:demoshop:objects -- --apiKey=<access_token> -- --NODE_ENV=production
# or:
npm run import:demoshop:objects -- --apiKey=<access_token> # default is development
```

## Login

For login as any existing user of this dataset, the credentials are as follows:

**Root Admin** (all permission in domain)
```
User:       root.admin@restorecommerce.io
Password:   CNQJrH%KAayeDpf3h
```

**Shop Admin 000** (all permission in shop)
```
User:       shop000.admin000@restorecommerce.io
Password:   CNQJrH%KAayeDpf3h
```

**Sales 000** (permission to maintain shop)
```
User:       shop000.sales000@restorecommerce.io
Password:   CNQJrH%KAayeDpf3h
```

**Moderator 000** (permission to maintain customer organization 000)
```
User:       customer000.moderator000@restorecommerce.io
Password:   CNQJrH%KAayeDpf3h
```

**Moderator 001** (permission to maintain customer organization 001)
```
User:       customer001.moderator000@restorecommerce.io
Password:   CNQJrH%KAayeDpf3h
```

**Member 000** (permission to make orders for organization 000)
```
User:       customer000.member000@restorecommerce.io
Password:   CNQJrH%KAayeDpf3h
```

**Member 001** (permission to make orders for organization 001)
```
User:       customer001.member000@restorecommerce.io
Password:   CNQJrH%KAayeDpf3h
```

**User 000** (permission to make orders as individual)
```
User:       customer002.user000@restorecommerce.io
Password:   CNQJrH%KAayeDpf3h
```