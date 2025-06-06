import fs from 'node:fs';
import path from 'node:path';
import * as YAML from 'js-yaml';
import cc from 'currency-list';
import wc from 'world-countries';
import { Currency } from '@restorecommerce/rc-grpc-clients/dist/generated/io/restorecommerce/currency';
import { MainArgParser, meta, makeID } from './utils';

export function listCurrency(): Currency[] {
  const currencies = cc.currencyList['en'];
  return Object.values(currencies).map(
    currency => ({
      id: makeID(currency.name),
      name: currency.name,
      symbol: currency.symbol,
      code: currency.code,
      precision: currency.decimal_digits,
      countryIds: wc.filter(
        c => c.currencies?.[currency.code] 
      ).map(
        c => makeID(c.name.common)
      ),
      meta,
    })
  );
}
  
export function transform(args?: {
  output?: string,
  filename?: string,
}) {
  const rc_countries = listCurrency();
  const output = path.join(path.normalize(args?.output), args?.filename ?? 'currencies.yaml');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(
    output,
    rc_countries.map(c => YAML.dump(c)).join('---\n')
  );
  return output;
}

export function main(args: any) {
  args ??= MainArgParser({
    description: 'Transforms currency-list to restorecommerce Currency YAML',
  }).parse_args();
  console.log('Transform Currencies with args:', args);
  const output = transform(args);
  console.log('Currencies transformed to:', output);
}

export default main;