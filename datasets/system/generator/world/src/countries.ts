import fs from 'node:fs';
import path from 'node:path';
import * as YAML from 'js-yaml';
import countries from 'world-countries';
import { rawTimeZones } from '@vvo/tzdb';
import { Country } from '@restorecommerce/rc-grpc-clients/dist/generated/io/restorecommerce/country';
import { MainArgParser, meta, makeID } from './utils';
 
export const EU = [
  'germany',
  'austria',
  'belgium',
  'bulgaria',
  'cyprus',
  'czechia',
  'denmark',
  'estonia',
  'greece',
  'spain',
  'finland',
  'france',
  'croatia',
  'hungary',
  'ireland',
  'italy',
  'lithuania',
  'luxembourg',
  'latvia',
  'malta',
  'netherlands',
  'poland',
  'portugal',
  'romania',
  'sweden',
  'slovenia',
  'slovakia',
];

export const EEA = [
  ...EU,
  'liechtenstein',
  'iceland',
  'norway',
];

export const EconomicAreas = {
  EU: EU,
  EEA: EEA,
};

export function listCountries(): Country[] {
  return countries.map(
    country => {
      const id = makeID(country.name.common);
      return {
        id,
        name: country.name.common,
        countryCode: country.cca2,
        countryCodeAlpha2: country.cca2,
        countryCodeAlpha3: country.cca3,
        geographicalName: country.name.official,
        economicAreas: Object.entries(EconomicAreas).filter(
          ([k, v]) => v?.includes(id)
        ).map(
          ([k, v]) => k
        ),
        timezoneIds: rawTimeZones.filter(
          tz => tz.countryCode === country.cca2
        ).map(
          tz => makeID(tz.name)
        ),
        meta,
      };
    }
  );
}

export function transform(args?: {
  output?: string,
  filename?: string,
}) {
  const rc_countries = listCountries();
  const output = path.join(path.normalize(args?.output), args?.filename ?? 'countries.yaml');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(
    output,
    '---\n' + rc_countries.map(c => YAML.dump(c)).join('---\n')
  );
  return output;
}

export function main(args: any) {
  args ??= MainArgParser({
    description: 'Transforms world-countries to restorecommerce Country YAML',
  }).parse_args();
  console.log('Transform Countries with args:', args);
  const output = transform(args);
  console.log('Countries transformed to:', output);
}

export default main;