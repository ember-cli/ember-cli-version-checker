'use strict';

const paths = [
  'src',
  'tests',
  'index.js',
  '.eslintrc.js'
];

require('mocha-eslint')(paths, {
  timeout: 10000,
  slow: 1000,
});
