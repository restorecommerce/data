const csv = require('csv-parser');
const fs = require('fs');
const hash = require('object-hash');
const uuid = require('uuid');
const yaml = require('js-yaml');
const _ = require('lodash');

const priceGroups = {
  0: {
    name: 'PG1',
    description: 'Dummy price group 1',
    meta: {
      modifiedBy: '',
      owners: [
        {
          id: 'urn:restorecommerce:acs:names:ownerIndicatoryEntity',
          value: 'urn:restorecommerce:acs:model:organization.Organization',
          attributes: [
            {
              id: 'urn:restorecommerce:acs:names:ownerInstance',
              value: 'r-ug'
            }
          ]

        }
      ]
    }
  },
  1: {
    name: 'PG2',
    description: 'Dummy price group 2',
    meta: {
      modifiedBy: '',
      owners: [
        {
          id: 'urn:restorecommerce:acs:names:ownerIndicatoryEntity',
          value: 'urn:restorecommerce:acs:model:organization.Organization',
          attributes: [
            {
              id: 'urn:restorecommerce:acs:names:ownerInstance',
              value: 'r-ug'
            }
          ]
        }
      ]
    }
  },
  2: {
    name: 'PG3',
    description: 'Dummy price group 3',
    meta: {
      modifiedBy: '',
      owners: [
        {
          id: 'urn:restorecommerce:acs:names:ownerIndicatoryEntity',
          value: 'urn:restorecommerce:acs:model:organization.Organization',
          attributes: [
            {
              id: 'urn:restorecommerce:acs:names:ownerInstance',
              value: 'r-ug'
            }
          ]
        }
      ]
    }
  }
}; // no data available

const prodCategories = {};
const prodPrototypes = {};
const manufacturers = {};
const products = {};

const resources = [
  {
    dataset: priceGroups,
    filename: 'createPriceGroups'
  },
  {
    dataset: manufacturers,
    filename: 'createManufacturers'
  },
  {
    dataset: prodCategories,
    filename: 'createProductCategories'
  },
  {
    dataset: prodPrototypes,
    filename: 'createProductPrototypes'
  }
];

function makeUUID() {
  return uuid.v4().replace(/-/g, '');
}

function parseInputLine(csvLine) {
  // sanity check
  if (
    !csvLine['retail_price'] ||
    !csvLine['brand'] ||
    !csvLine['product_specifications'] ||
    csvLine['product_specifications'] === '{"product_specification"=>nil}'
  ) {
    return;
  }

  const brandEntry = csvLine.brand;
  const brandHash = hash(brandEntry);

  if (!manufacturers[brandHash]) {
    manufacturers[brandHash] = {
      name: brandEntry,
      description: 'Dummy description for manufacturer ' + brandEntry,
      meta: {
        modifiedBy: '',
        owners: [
          {
            id: 'urn:restorecommerce:acs:names:ownerIndicatoryEntity',
            value: 'urn:restorecommerce:acs:model:organization.Organization',
            attributes: [
              {
                id: 'urn:restorecommerce:acs:names:ownerInstance',
                value: 'r-ug'
              }
            ]
          }
        ]
      }
    };
  }

  // remove quotes and brackets first
  const categoryTree = csvLine.product_category_tree.slice(2, -2).split(' >> ');

  const imagesData = csvLine.image
    .slice(1, -1)
    .split(', ')
    .map((imgUrlRaw) => imgUrlRaw.slice(1, -1)) // remove quotes
    .map((imgUrl) => {
      // image types: specifying url and filename should be sufficient
      return {
        id: makeUUID(),
        url: imgUrl,
        filename: imgUrl.split('/').slice(-1)[0],
        caption: 'test',
        contentType: 'test',
        width: 123,
        height: 123,
        length: 123
      };
    });

  // no category image available, so just use one from the first product that fits
  // (only a single image per category for whatever reason)
  const categoryImgData = imagesData[0];

  // use last category as product identifier, second-to-last as product prototype identifier
  // ignore data if only a single value present (category or prototype needed)

  if (categoryTree.length > 1) {
    const sliceFromEnd = Math.min(categoryTree.length - 1, 2);

    var lastCategory = null;

    for (const index in categoryTree.slice(0, -sliceFromEnd)) {
      const categoryLevelHash = hash(categoryTree[index]);

      if (!prodCategories[categoryLevelHash]) {
        const priceGroupIdStr = String(Math.floor(Math.random() * 3));
        prodCategories[categoryLevelHash] = {
          name: categoryTree[index],
          description: 'Dummy description for category ' + categoryTree[index],
          image: categoryImgData,
          priceGroupId: priceGroupIdStr.toString(),
          meta: {
            modifiedBy: '',
            owners: [
              {
                id: 'urn:restorecommerce:acs:names:ownerIndicatoryEntity',
                value: 'urn:restorecommerce:acs:model:organization.Organization',
                attributes: [
                  {
                    id: 'urn:restorecommerce:acs:names:ownerInstance',
                    value: 'r-ug'
                  }
                ]
              }
            ]
          }
        };
        if (lastCategory != null) {
          prodCategories[categoryLevelHash]['parent'] = { parentId: hash(lastCategory) };
        }
      }

      lastCategory = categoryTree[index];
    }

    let prototypeCatHash;

    if (categoryTree.length > 2) {
      const prototypeCat = categoryTree[categoryTree.length - 2];
      prototypeCatHash = hash(prototypeCat);

      if (!prodPrototypes[prototypeCatHash]) {
        prodPrototypes[prototypeCatHash] = {
          name: prototypeCat,
          description: 'Dummy description for prototype ' + prototypeCat,
          categoryId: hash(categoryTree[categoryTree.length - 3]),
          version: 'test',
          meta: {
            modifiedBy: '',
            owners: [
              {
                id: 'urn:restorecommerce:acs:names:ownerIndicatoryEntity',
                value: 'urn:restorecommerce:acs:model:organization.Organization',
                attributes: [
                  {
                    id: 'urn:restorecommerce:acs:names:ownerInstance',
                    value: 'r-ug'
                  }
                ]
              }
            ]
          }
        };
      }
    }

    const productEntry = csvLine.product_name;
    const productHash = hash(productEntry);

    if (!products[productHash]) {
      // need to create product before adding variant

      products[productHash] = {
        product: {
          // id: productHash,
          name: productEntry,
          description: 'Dummy description for product ' + productEntry,
          manufacturerId: brandHash,
          taricCode: uuid.v4(), // no data available
          physical: {
            variants: []
          },
          taxIds: [makeUUID()],
          gtin: makeUUID()
        },
        meta: {
          modifiedBy: '',
          owners: [
            {
              id: 'urn:restorecommerce:acs:names:ownerIndicatoryEntity',
              value: 'urn:restorecommerce:acs:model:organization.Organization',
              attributes: [
                {
                  id: 'urn:restorecommerce:acs:names:ownerInstance',
                  value: 'r-ug'
                }
              ]
            }
          ]
        },
        active: Math.random() >= 0.2
      };

      if (categoryTree.length > 2) {
        products[productHash].product.prototypeId = prototypeCatHash;
      } else {
        products[productHash].product.categoryId = hash(categoryTree[0]);
      }
    }
    // raw attribute list has the form {"product_specification"=>[{"key"=>"a","value"=>"b"}, {"key"=>"c","value"=>"d"}]}
    const variantAttributes = csvLine['product_specifications']
      .slice(28, -3)
      .split('}, {')
      .map((spec) => {
        // id, value are string
        let id, value, unitCode = '';

        const elems = spec.split('", "');

        id = elems.length === 1 ? uuid.v4() : elems[0].split('"=>"')[1];
        value = elems[elems.length - 1].split('"=>"')[1].slice(0, -1)[0];
        if (!value) {
          value = 'm';
        }

        return { id, value, unitCode };
      });

    // // values must be of string type, so we replace all numbers with a string
    // // to avoid GQL type error.
    // for (let i in variantAttributes) {
    //   let vi = variantAttributes[i];
    //   for (let i in vi) {
    //     let viValues = vi['values'];
    //     for (let i in viValues) {
    //       let value = viValues[i];
    //       if (isNaN(value) === false) {
    //         viValues[i] = value + 'm';
    //       }
    //     }
    //   }
    // }

    products[productHash]['product']['physical']['variants'].push({
      id: csvLine['uniq_id'],
      name: categoryTree[categoryTree.length - 1],
      description: csvLine['description'],
      stockLevel: Math.floor(Math.random() * 10000),
      price: {
        regularPrice: parseFloat(csvLine['retail_price']),
        sale: Math.random() < 0.25,
        salePrice: parseFloat(csvLine['discounted_price'])
      },
      stockKeepingUnit: csvLine['pid'],
      images: imagesData,
      properties: variantAttributes
    });
  }
}

function writeYAML(list_meta) {
  const outputDir = '../../data/catalog/';
  const dataset = list_meta.dataset;
  const filename = list_meta.filename;
  let item_list = [];
  for (let datasetIndex in dataset) {
    let newObj = {
      // add placeholder to replace later with separator between all documents
      separator: 'xxx',
      id: datasetIndex
    };
    let item = dataset[datasetIndex];
    _.merge(newObj, item);
    item_list.push(newObj);
  }
  fs.mkdirSync(outputDir, { recursive: true });
  let filePath = outputDir + filename + '.yaml';
  let stream = yaml.safeDump(item_list);

  // replace placeholder with '---' required by yaml-document-stream
  stream = stream.replace(/- separator: xxx/g, '---');
  fs.writeFileSync(filePath, stream);
}

function createFiles() {
  fs.createReadStream('flipkart_com-ecommerce_sample.csv')
    .pipe(csv())
    .on('data', parseInputLine)
    .on('end', () => {
      for (let resource of resources) {
        writeYAML(resource);
      }
      writeYAML({
        dataset: products,
        filename: 'createProducts'
      });
    });
}
createFiles(false);
