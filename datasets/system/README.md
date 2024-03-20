# System Data Set for Restorecommerce

The data set comprises the following resources:

- System relevant enumerations
- Basic access control rules, policies and roles
- Tech users
- Unit codes, countries, timezones, taxes, etc.

The data is partially generated with a set of generator scripts which reside
under [generator](generator).

## Usage

This data set comes with a set of scripts which import JSON and YAML data.
Resources are imported using the [gql-bot](https://github.com/restorecommerce/gql-bot) which is an automated task processor with a GraphQL Client.
All data is imported via the GraphQL API exposed by the [facade-srv](https://github.com/restorecommerce/facade-srv).

All possible operations are exposed through JS scripts.
These scripts either execute GraphQL mutations/ queries through the `dataset.js` script.
The `dataset.js` also includes command-line options such as specifying if we wish
to import the data locally or into the production environment.

### Current supported jobs are

- master (imports resources `commands` `contact_points_types`, `countries`, `locales`, `organizations`, `tax_types`, `taxes`, `timezones`)
- identity (imports `users`, `roles`)
- rules (imports `policies`, `policy_sets`, `rules`)
- extra (imports resources `unit_codes`)

> NOTE: Resources must be imported in a specific order!
> Master > Identity > Extra.
>
> For the case when importing resources returns "Access denied", one way to fix
> this is to restart `facade-srv` in order to sync the api key with the other
> upstream services.

### Script usage

1. Extract the API-KEY from the logs of `facade-srv`.

2. Either export the API-KEY, paste it to an `.env` file or paste as command argument.

2. Generate catalog datasets using [`transform.js script`](./generator/catalog/transform.js):

   - `node ./transform.js`

3. Import datasets using [`dataset.js script`](./import.js):

   - `node ./dataset.js import -t <access_token> -d system -j <job>`

4. Examples:

   - `node ./dataset.js import -t <access_token> -d system -j master`
   - `node ./dataset.js import -t <access_token> -d system -j identity`
   - `node ./dataset.js import -t <access_token> -d system -j extra`

### Supported environment variables: `GQL_ENDPOINT`.

All flags are optional, and they can be listed by typing `node ./dataset.js -h`.
The API key can be obtained from the [`facade-srv`](https://github.com/restorecommerce/facade-srv/blob/master/cfg/config.json#L21) configuration.
The API key is generated during system startup from the `facade-srv` (Check the log message of facade-srv `Bootstrap API Key is`).
In case `facade-srv` is a local container use the following command to extract the `Bootstrap API-KEY`:

```sh
npm run env:token
```

By default, the GraphQL importer uses the configuration file `config.json` to read data regarding endpoints for retrieving the API key
and executing mutations/ queries.

## Login

For login as any existing user of this dataset, the credentials are as follows:

**Tech User** (Superadmin)
```
User:       tech-user@restorecommerce.io
Password:   CNQJrH%KAayeDpf3h
```
