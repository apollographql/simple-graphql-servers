const fetch = require('node-fetch');

const toCamel = (s) => {
  return s.replace(/([-_][a-z])/gi, ($1) => {
    return $1.toUpperCase().replace('-', '').replace('_', '');
  });
};

const snakeToCamel = (object) => {
  const newObj = {};
  Object.entries(object).forEach(([key, value]) => {
    newObj[toCamel(key)] =
      value instanceof Array
        ? value.map((item) => snakeToCamel(item))
        : !!value && typeof value === 'object'
        ? snakeToCamel(value)
        : value;
  });
  return newObj;
};

const kelvinToFahrenheit = (kelvin) =>
  kelvin ? (1.8 * (kelvin - 273) + 32).toFixed(0) : undefined;

const delayFetch = (url, options) =>
  new Promise((resolve) => {
    setTimeout(() => {
      resolve(fetch(url, options));
    }, options.delay);
  });

exports.snakeToCamel = snakeToCamel;
exports.kelvinToFahrenheit = kelvinToFahrenheit;
exports.delayFetch = delayFetch;
