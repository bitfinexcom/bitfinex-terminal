'use strict'

const dazaar = require('dazaar')
const swarm = require('dazaar/swarm')

const Hyperbee = require('hyperbee')
const { keyEncoding, valueEncoding } = require('bitfinex-terminal-funding-encoding')
const terms = require('bitfinex-terminal-terms-of-use')

const market = dazaar('dbs/funding-stats')

const card = require('../cards/free/funding-stats/bitfinex.terminal.funding.stats.json')
const buyer = market.buy(card, { sparse: true, terms })

buyer.on('feed', function () {
  console.log('got feed')

  const db = new Hyperbee(buyer.feed, {
    keyEncoding,
    valueEncoding
  })

  doQuery(db)
})

function doQuery (db) {
  db.sub('USD').createReadStream({
    gte: new Date('2021-01-03T09:00:00.000Z'),
    lte: new Date('2021-01-05T09:00:00.000Z'),
    limit: 3,
    reverse: true
  }).on('data', (d) => {
    console.log(d)
  })
}

swarm(buyer)
