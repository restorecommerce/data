const csv = require('csv-parser');
const fs = require('fs');
const hash = require('object-hash');
const uuid = require('uuid');
const yaml = require('js-yaml');
const _ = require('lodash');

const priceGroups = {
  0: { name: 'PG1', description: 'Dummy price group 1' },
  1: { name: 'PG2', description: 'Dummy price group 2' },
  2: { name: 'PG3', description: 'Dummy price group 3' },
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
  },
];

function parseInputLine(csvLine) {
  // sanity check
  if (!csvLine['retail_price']
    || !csvLine['brand']
    || !csvLine['product_specifications']
    || csvLine['product_specifications'] === "{\"product_specification\"=>nil}") {
    return;
  }

  const brandEntry = csvLine.brand;
  const brandHash = hash(brandEntry);

  if (!manufacturers[brandHash]) {
    manufacturers[brandHash] = {
      'name': brandEntry,
      'description': 'Dummy description for manufacturer ' + brandEntry
    };
  }

  // remove quotes and brackets first
  const categoryTree = csvLine.product_category_tree.slice(2, -2).split(' >> ');

  const imagesData = csvLine.image
    .slice(1, -1)
    .split(', ')
    .map(imgUrlRaw => imgUrlRaw.slice(1, -1)) // remove quotes
    .map(imgUrl => {
      // image types: specifying url and filename should be sufficient
      return {
        url: imgUrl,
        filename: imgUrl.split('/').slice(-1)[0]
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
        const priceGroupId = String(Math.floor(Math.random() * 3));
        prodCategories[categoryLevelHash] = {
          'name': categoryTree[index],
          'description': "Dummy description for category " + categoryTree[index],
          'image': categoryImgData,
          'price_group_id': priceGroupId,
        }

        if (lastCategory != null) {
          prodCategories[categoryLevelHash]['parent'] = { 'parent_id': hash(lastCategory) };
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
          category_id: hash(categoryTree[categoryTree.length - 3])
        };
      }
    }

    const productEntry = csvLine.product_name;
    const productHash = hash(productEntry);

    if (!products[productHash]) {
      // need to create product before adding variant

      products[productHash] = {
        product: {
          id: productHash,
          name: productEntry,
          description: "Dummy description for product " + productEntry,
          manufacturer_id: brandHash,
          taric_code: uuid.v4(), // no data available
          variants: []
          // todo: tax types
        },
        active: Math.random() >= 0.2
      };

      if (categoryTree.length > 2) {
        products[productHash].product.prototype = { id: prototypeCatHash };
      } else {
        products[productHash].product.category = { id: hash(categoryTree[0]) };
      }
    }

    // raw attribute list has the form {"product_specification"=>[{"key"=>"a","value"=>"b"}, {"key"=>"c","value"=>"d"}]}

    const variantAttributes = csvLine['product_specifications'].slice(28, -3).split('}, {').map(spec => {
      let key, values;

      const elems = spec.split('\", \"');

      // some elements are value-only
      if (elems.length === 1) {
        key = uuid.v4();
      } else {
        key = elems[0].split('\"=>\"')[1];
      }

      values = elems[elems.length - 1].split('\"=>\"')[1].slice(0, -1);

      return { key, values: values.split(', ') };
    });

    products[productHash]['product']['variants'].push({
      'id': csvLine['uniq_id'],
      'name': categoryTree[categoryTree.length - 1],
      'description': csvLine['description'],
      'stock_level': Math.floor(Math.random() * 10000),
      'price': parseFloat(csvLine['retail_price']),
      'sale': Math.random() < 0.25,
      'sale_price': parseFloat(csvLine['discounted_price']),
      'stock_keeping_unit': csvLine['pid'],
      'image': imagesData,
      'attributes': variantAttributes
    });
  }
}

function writeJSON(list_meta) {
  const outputDir = '../../data/catalog/';
  const dataset = list_meta.dataset;
  const filename = list_meta.filename;
  let item_list = [];

  for (let datasetIndex in dataset) {
    let newObj = {
      id: datasetIndex
    };
    let item = dataset[datasetIndex];
    _.merge(newObj, item);
    item_list.push(newObj);
  }
  fs.mkdirSync(outputDir, { recursive: true });
  let filePath = outputDir + filename + '.yml';
  fs.writeFileSync(filePath, yaml.safeDump({ items: item_list }));
}

function createFiles(splitFile) {
  fs.createReadStream('flipkart_com-ecommerce_sample.csv')
    .pipe(csv())
    .on('data', parseInputLine)
    .on('end', () => {

      for (let resource of resources) {
        writeJSON(resource);
      }

      if (splitFile) {
        numProducts = Object.keys(products).length;

        if (numProducts > 1000) { // split up mutation if very large
          const numSlices = 200;
          const defaultSliceSize = Math.floor(numProducts / numSlices);
          const productKeys = Object.keys(products);

          let curKey = 0;

          for (let i = 0; i < numSlices; i++) {
            const thisDataSlice = {};
            let sliceSize;

            if (i === numSlices - 1) {
              sliceSize = numProducts - (numSlices - 1) * defaultSliceSize;
            } else {
              sliceSize = defaultSliceSize;
            }

            for (let count = 0; count < sliceSize; count++) {
              thisDataSlice[productKeys[curKey]] = products[productKeys[curKey]];
              curKey++;
            }

            let filename;

            if (i < 10) {
              filename = 'Products00' + String(i);
            } else if (i < 100) {
              filename = 'Products0' + String(i);
            } else {
              filename = 'Products' + String(i);
            }

            writeJSON({
              dataset: thisDataSlice,
              filename: filename
            });
          }
        } else {
          writeJSON({
            dataset: products,
            filename: 'createProducts'
          });
        }
      } else {
        writeJSON({
          dataset: products,
          filename: 'createProducts'
        });
      }
    });
}

createFiles(false);
