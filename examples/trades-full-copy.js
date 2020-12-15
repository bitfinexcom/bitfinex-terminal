'use strict'

const dazaar = require('dazaar')
const swarm = require('dazaar/swarm')

const Hyperbee = require('hyperbee')
const keyEncoding = require('bitfinex-terminal-key-encoding')
const terms = require('bitfinex-terminal-terms-of-use')

const market = dazaar('dbs/full-trades')

const card = require('../cards/free/trades/bitfinex.terminal.btcusd.trades.json')
const buyer = market.buy(card, { sparse: false, terms })

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
    limit: 10
  }).on('data', (d) => {
    console.log(d)
  })
}

swarm(buyer)
setInterval(() => {
  if (!buyer.feed) return

  console.log('data feed length is', buyer.feed.length, 'elements')
}, 1000)
