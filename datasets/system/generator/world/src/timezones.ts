import fs from 'node:fs';
import path from 'node:path';
import * as YAML from 'js-yaml';
import { rawTimeZones } from '@vvo/tzdb';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import tz from 'dayjs/plugin/timezone';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import { Timezone } from '@restorecommerce/rc-grpc-clients/dist/generated/io/restorecommerce/timezone';
import { MainArgParser, meta, makeID } from './utils';
dayjs.extend(utc);
dayjs.extend(tz);
dayjs.extend(advancedFormat);

export function listTimezones(): Timezone[] {
  return rawTimeZones.map(
    tz => {
      const winter = dayjs.tz('2025-01-15', tz.name);
      const summer = dayjs.tz('2025-06-15', tz.name);
      return {
        id: makeID(tz.name),
        name: tz.name,
        description: tz.rawFormat,
        value: tz.alternativeName,
        abbreviationStd: winter.format('z'),
        abbreviationDst: summer.format('z'),
        offsetStd: {
          hours: Math.floor(tz.rawOffsetInMinutes / 60),
          minutes: tz.rawOffsetInMinutes % 60,
        },
        offsetDst: {
          hours: Math.floor(summer.utcOffset() / 60),
          minutes: summer.utcOffset() % 60,
        },
        /*countryIds: wc.filter(
          c => c.cca2 === tz.countryCode 
        ).map(
          c => makeID(c.name.common)
        ),*/
        meta,
      };
    }
  );
}

export function transform(args?: {
  output?: string,
  filename?: string,
}) {
  const rc_timezones = listTimezones();
  const output = path.join(path.normalize(args?.output), args?.filename ?? 'timezones.yaml');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(
    output,
    '---\n' + rc_timezones.map(tz => YAML.dump(tz)).join('---\n')
  );
  return output;
}

export function main(args: any) {
  args ??= MainArgParser({
    description: 'Transforms @vvo/tzdb to restorecommerce Timezone YAML',
  }).parse_args();
  console.log('Transform Timezones with args:', args);
  const output = transform(args);
  console.log('Timezones transformed to:', output);
}

export default main;