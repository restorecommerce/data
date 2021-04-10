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

Current supported jobs are:

- identity (imports `users`, `roles`, `rules`, `policies` and `policy_sets`)
- master (imports master data resources `country`, `time_zone`, `locale`, `tax_types` and `commands`)
- extra (import resources `organizations`, `addresses`, `contact_point_types`, `contact_points`, `fulfillment_couriers` and `manufacturers`)

Script usage:

```sh
node import.js import -t <access_token> -j <job>
```

Supported environment variables:

```sh
GQL_ENDPOINT
```

All flags are optional and they can be listed by typing `node import.js -h`.
The API key can be obtained from the [`facade-srv`](https://github.com/restorecommerce/facade-srv)'s logs.

By default, the GraphQL importer uses the configuration file `config.json` to read data regarding endpoints for retrieving the API key
and executing mutations/ queries.
