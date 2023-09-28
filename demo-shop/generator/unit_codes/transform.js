const xlsx = require('node-xlsx');
const fs = require('fs');
const yaml = require('js-yaml');

const headerMapping = {
  groupnumber: 'groupNumber',
  sector: 'sector',
  groupid: 'groupId',
  quantity: 'quantity',
  'level/category': 'levelCategory',
  commoncode: 'commonCode',
  name: 'name',
  conversionfactor: 'conversionFactor',
  symbol: 'symbol',
  description: 'description',
  status: 'status',
};

const statusMapping = {
  X: 'MARKED_AS_DELETED',
  '+': 'ADDED',
  '#': 'CHANGED_NAME',
  ':': 'CHANGED_CHARACTERISTIC',
  D: 'DEPRECATED',
  '=': 'REINSTATED',
};

const sectorMapping = {
  'Space and Time': 'SPACE_AND_TIME',
  'Periodic and related phenomena': 'PERIODIC_AND_RELATED_PHASES',
  Mechanics: 'MECHANICS',
  Heat: 'HEAT',
  'Electricity and Magnetism': 'ELECTRICITY_AND_MAGNETISM',
  'Light and Related Electromagnetic Radiations': 'LIGHT_AND_RELATED_ELECTROMAGNETIC_RADIATIONS',
  Acoustics: 'ACOUSTICS',
  'Physical Chemistry and Molecular Physics': 'PHYSICAL_CHEMISTRY_AND_MOLECULAR_PHYSICS',
  'Atomic and Nuclear Physics': 'ATOMIC_AND_NUCLEAR_PHYSICS',
  'Nuclear Reactions and Ionizing Radiations': 'NUCLEAR_REACTIONS_AND_IONIZING_RADIATIONS',
  'Characteristic Numbers (dimensionless parameters)': 'CHARACTERISTIC_NUMBERS',
  'Solid State Physics': 'SOLID_STATE_PHYSICS',
  Miscellaneous: 'MISCELLANEOUS',
};

const workSheetsFromFile = xlsx.parse(`${__dirname}/rec20_Rev15e-2020.xls`);

const codes = {};

for (let i = 1; i < 3; i += 1) {
  const headerOrder = {};
  for (let j = 0; j < workSheetsFromFile[i].data[0].length; j++) {
    const m = headerMapping[workSheetsFromFile[i].data[0][j].replaceAll(/[\n\r\s]/g, '').toLowerCase()];
    if (m) {
      headerOrder[j] = m;
    }
  }

  for (let j = 1; j < workSheetsFromFile[i].data.length; j++) {
    const val = workSheetsFromFile[i].data[j];
    const code = {};
    for (let k = 0; k < val.length; k++) {
      if (val[k] !== undefined && val[k] !== null) {
        if (k in headerOrder) {
          code[headerOrder[k]] = val[k].toString();
        }
      }
    }

    if (code.commonCode in codes) {
      continue;
    }

    if ('status' in code) {
      code.status = statusMapping[code.status];
    }

    if ('sector' in code) {
      code.sector = sectorMapping[code.sector];
    }

    code.id = 'unit_code-' + code.commonCode;

    code.meta = {
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      modifiedBy: '',
      owners: [
        {
          id: 'urn:restorecommerce:acs:names:ownerIndicatoryEntity',
          value: 'urn:restorecommerce:acs:model:organization.Organization'
        },
        {
          id: 'urn:restorecommerce:acs:names:ownerInstance',
          value: 'test-organization-1'
        }
      ]
    };

    codes[code.commonCode] = code;
  }
}

const values = Object.values(codes);
values.sort((a, b) => a.id.localeCompare(b.id));

const outDir = `${__dirname}/../../data/seed_data/`;
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(`${outDir}unit_codes.yaml`, values.map(yaml.dump).join('\n---\n'));
