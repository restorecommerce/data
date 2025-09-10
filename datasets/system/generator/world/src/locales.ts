import fs from 'node:fs';
import path from 'node:path';
import * as YAML from 'js-yaml';
import { Locale } from '@restorecommerce/rc-grpc-clients/dist/generated/io/restorecommerce/locale.js';
import { MainArgParser, meta, makeID } from './utils.js';
import { getLocalazyLanguages } from '@localazy/languages'; // ignore import error, works anyway!
// const ll = require('@localazy/languages');

export function listLocales(): Locale[] {
  return getLocalazyLanguages().map(
    (language) => ({
      id: makeID(language.name),
      name: language.name,
      value: language.locale,
      meta,
    })
  );
}

export function transform(args?: {
  output?: string,
  filename?: string,
}) {
  const rc_locales = listLocales();
  const output = path.join(path.normalize(args?.output), args?.filename ?? 'locales.yaml');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(
    output,
    '---\n' + rc_locales.map(c => YAML.dump(c)).join('---\n')
  );
  return output;
}

export function main(args?: any) {
  args ??= MainArgParser({
    description: 'Transforms world-countries languages to restorecommerce Locales YAML',
  }).parse_args();
  console.log('Transform Locales with args:', args);
  const output = transform(args);
  console.log('Locales transformed to:', output);
}

export default main;