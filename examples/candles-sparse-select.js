'use strict'

const dazaar = require('dazaar')
const swarm = require('dazaar/swarm')

const Hyperbee = require('hyperbee')
const keyEncoding = require('bitfinex-terminal-key-encoding')
const terms = require('bitfinex-terminal-terms-of-use')

const market = dazaar('dbs/sparse-candles')

const card = require('../cards/free/candles/bitfinex.terminal.btcusd.candles.json')
const buyer = market.buy(card, { sparse: true, terms })

buyer.on('feed', function () {
  console.log('got feed')

  const db = new Hyperbee(buyer.feed, {
    keyEncoding,
    valueEncoding: 'json'
  })

  doQuery(db)
})

function doQuery (db) {
  db.createReadStream({
    gte: { candle: '5m', timestamp: new Date('2018-10-10T09:00:00.000Z') },
    lte: { candle: '5m', timestamp: new Date('2019-10-10T09:00:00.000Z') },
    limit: 10,
    reverse: true
  }).on('data', (d) => {
    console.log(d)
  })
}

swarm(buyer)
setInterval(() => {
  if (!buyer.feed) return

  console.log('data feed length is', buyer.feed.length, 'elements')
}, 1000)
