#!/usr/bin/env node
const countries = require('./bin/countries');
const timezones = require('./bin/timezones');
const currencies = require('./bin/currencies');
countries.default();
timezones.default();
currencies.default();