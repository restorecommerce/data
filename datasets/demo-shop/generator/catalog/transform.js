#!/usr/bin/env node

const csv = require('csv-parser');
const fs = require('fs');
const hash = require('object-hash');
const yaml = require('js-yaml');
const { randomUUID } = require('crypto');

const FILE_SLICE = 500;

const SHOP_IDS = [
  'restorecommerce-demo-shop-000',
];

const meta = {
  modifiedBy: '',
  owners: [
    {
      id: 'urn:restorecommerce:acs:names:ownerIndicatoryEntity',
      value: 'urn:restorecommerce:acs:model:organization.Organization',
      attributes: [
        {
          id: 'urn:restorecommerce:acs:names:ownerInstance',
          value: 'restorecommecre-demo-shop-000-organization'
        }
      ]
    }
  ]
};

const priceGroups = [
  {
    id: 'PG1',
    name: 'PG1',
    description: 'Dummy price group 1',
    meta
  },
  {
    id: 'PG2',
    name: 'PG2',
    description: 'Dummy price group 2',
    meta
  },
  {
    id: 'PG3',
    name: 'PG3',
    description: 'Dummy price group 3',
    meta
  }
]; // no data available

const prodCategories = {};
const prodPrototypes = {};
const manufacturers = {};
const products = {};

const resources = [
  {
    dataset: priceGroups,
    filename: 'price_groups'
  },
  {
    dataset: manufacturers,
    filename: 'manufacturers'
  },
  {
    dataset: prodCategories,
    filename: 'product_categories'
  },
  {
    dataset: prodPrototypes,
    filename: 'product_prototypes'
  },
  {
    dataset: products,
    filename: 'products'
  }
];

function makeUUID() {
  return randomUUID().replace(/-/g, '');
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
      id: brandHash,
      name: brandEntry,
      description: 'Dummy description for manufacturer ' + brandEntry,
      meta
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
        prodCategories[categoryLevelHash] = {
          id: categoryLevelHash,
          name: categoryTree[index],
          description: 'Dummy description for category ' + categoryTree[index],
          image: categoryImgData,
          priceGroupId: priceGroups[Math.floor(Math.random() * priceGroups.length)]?.id,
          meta
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
          id: prototypeCatHash,
          name: prototypeCat,
          description: 'Dummy description for prototype ' + prototypeCat,
          categoryId: hash(categoryTree[categoryTree.length - 3]),
          version: 'test',
          meta
        };
      }
    }

    const productEntry = csvLine.product_name;
    const productHash = hash(productEntry);

    if (!products[productHash]) {
      // need to create product before adding variant

      products[productHash] = {
        id: productHash,
        shopId: SHOP_IDS[0],
        product: {
          name: productEntry,
          description: 'Dummy description for product ' + productEntry,
          manufacturerId: brandHash,
          physical: {
            variants: []
          },
          taxIds: ['germany-standard-rate'],
          gtin: makeUUID()
        },
        active: Math.random() >= 0.2,
        meta
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

        id = elems.length === 1 ? makeUUID() : elems[0].split('"=>"')[1];
        value = elems[elems.length - 1].split('"=>"')[1].slice(0, -1)[0];
        if (!value) {
          value = 'm';
        }

        return { id, value, unitCode };
      });

    products[productHash].product.physical.variants.push({
      id: csvLine['uniq_id'],
      name: categoryTree[categoryTree.length - 1],
      description: csvLine['description'],
      stockLevel: Math.floor(Math.random() * 10000),
      price: {
        regularPrice: parseFloat(csvLine['retail_price']) / 100.,
        sale: Math.random() < 0.25,
        salePrice: parseFloat(csvLine['discounted_price']) / 100.,
      },
      stockKeepingUnit: csvLine['pid'],
      images: imagesData,
      properties: variantAttributes
    });
  }
}

function dumpYAMLs(prefix, docs) {
  docs = Object.values(docs);
  for (let i = 0; i < docs.length / FILE_SLICE; ++i) {
    const filename = `${prefix}.${i.toString().padStart(3, '0')}.yaml`;
    console.log(filename);
    fs.writeFileSync(
      filename,
      '---\n' +
        docs
          .slice(i * FILE_SLICE, (i + 1) * FILE_SLICE)
          .map((d) => yaml.dump(d))
          .join('---\n')
    );
  }
}

function main() {
  fs.createReadStream(`${__dirname}/flipkart_com-ecommerce_sample.csv`)
    .pipe(csv())
    .on('data', parseInputLine)
    .on('end', () => {
      const outputDir = `${__dirname}/../../data/generated/catalog/`;
      fs.mkdirSync(outputDir, { recursive: true });
      for (let resource of resources) {
        const dataset = resource.dataset;
        dumpYAMLs(outputDir + resource.filename, dataset);
      }
    });
}

main();