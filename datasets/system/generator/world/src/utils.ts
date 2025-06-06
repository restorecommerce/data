import path from 'node:path';
import { ArgumentParser, ArgumentParserOptions } from 'argparse';
import { Meta } from '@restorecommerce/rc-grpc-clients/dist/generated/io/restorecommerce/meta';

export const meta: Meta = {
  owners: [
    {
      id: 'urn:restorecommerce:acs:names:ownerIndicatoryEntity',
      value: 'urn:restorecommerce:acs:model:organization.Organization',
      attributes: [
        {
          id: 'urn:restorecommerce:acs:names:ownerInstance',
          value: 'system'
        }
      ]
    },
  ]
};

export function MainArgParser (options?: ArgumentParserOptions) {
  const parser = new ArgumentParser(options);
  parser.add_argument('--output', '-o', {
    help: 'output directory',
    type: 'string',
    default: path.normalize(`${__dirname}/../../../data/generated/world/`),
  });
  return parser;
};

export const makeID = (name: string) => name
  .toLowerCase()
  .replaceAll(/[\s\/\(\)]/g, '_')
  .normalize('NFKD')
  .replaceAll(/[^\w]/g, '');