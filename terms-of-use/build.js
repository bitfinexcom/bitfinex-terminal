const fs = require('fs')
const path = require('path')
const terms = fs.readFileSync(path.join(__dirname, 'README.md'), 'utf-8')
fs.writeFileSync(path.join(__dirname, 'index.js'), 'module.exports = ' + JSON.stringify(terms) + '\n')
