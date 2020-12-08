const csv = require('csv-parser');
const fs = require('fs');
const hash = require('object-hash');
const uuid = require('uuid');
const JSON = require('JSON');
const prettier = require('prettier');

const priceGroups = {
  0: { name: 'PG1', description: 'Dummy price group 1' },
  1: { name: 'PG2', description: 'Dummy price group 2' },
  2: { name: 'PG3', description: 'Dummy price group 3' },
}; // no data available

const prodCategories = {};
const prodPrototypes = {};
const manufacturers = {};
const products = {};

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

    //var curLevel = prodCategories;
    var lastCategory = null;

    for (const index in categoryTree.slice(0, -sliceFromEnd)) {
      const categoryLevelHash = hash(categoryTree[index]);

      //if (!curLevel['categories'][categoryLevelHash]) {
      if (!prodCategories[categoryLevelHash]) {
        const priceGroupId = String(Math.floor(Math.random() * 3));
        //curLevel['categories'][categoryLevelHash] = {
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

      //curLevel = curLevel['categories'][categoryLevelHash];
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

    //console.log(csvLine['uniq_id']);
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
  const dataset = list_meta.dataset;
  const mutation = list_meta.mutation;
  const filename = list_meta.filename;

  const rawOutput = { resource_list: [] };

  for (let datumId in dataset) {
    let datum = dataset[datumId];
    datum['id'] = datumId;
    rawOutput['resource_list'].push(datum);
  }

  rawOutput.mutation = mutation;

  const jsonOutput = JSON.stringify(rawOutput);
  // somehow the formatted string can't be written? (0 byte file output)
  // const prettierOutput = prettier.format(jsonOutput, { parser: 'json' });
  const outputDir = '../../data/catalog/';
  fs.mkdirSync(outputDir, { recursive: true });
  fs.createWriteStream(outputDir + filename + '.json')
    .write(jsonOutput);
}

const outputs = [
  {
    'dataset': priceGroups,
    'mutation': "mutation { createPriceGroups(input: { listOfPriceGroups: ${resource_list} }) " +
      "{details {id}, error{code, message}} }",
    'filename': "createPriceGroups"
  },
  {
    'dataset': manufacturers,
    'mutation': "mutation { createManufactures(input: { listOfManufactures: ${resource_list} }) " +
      "{details {id}, error{code, message}} }",
    'filename': "createManufacturers"
  },
  {
    'dataset': prodCategories,
    'mutation': "mutation { createProductCategory(input: { listOfProductCategory: ${resource_list} }) " +
      "{details {id}, error{code, message}} }",
    'filename': "createProductCategories"
  },
  {
    'dataset': prodPrototypes,
    'mutation': "mutation { createProductPrototype(input: { listOfProductPrototypesTypes: ${resource_list} }) " +
      "{details {id}, error{code, message}} }",
    'filename': "createProductPrototypes"
  },
];

fs.createReadStream('flipkart_com-ecommerce_sample.csv')
  .pipe(csv())
  .on('data', parseInputLine)
  .on('end', () => {
    for (let listMeta of outputs) {
      writeJSON(listMeta);
    }

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
          'dataset': thisDataSlice,
          'mutation': "mutation { createProducts(input: { listOfProducts: ${resource_list} }) " +
            "{details {id}, error{code, message}} }",
          'filename': filename
        });
      }
    } else {
      writeJSON({
        'dataset': products,
        'mutation': "mutation { createProducts(input: { listOfProducts: ${resource_list} }) " +
          "{details {id}, error{code, message}} }",
        'filename': "createProducts"
      });
    }
  });
