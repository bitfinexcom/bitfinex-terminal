'use strict'

const dazaar = require('dazaar')
const terms = require('bitfinex-terminal-terms-of-use')

const Orderbook = require('bitfinex-terminal-order-book')

const card = require('../cards/paid/orderbooks/bitfinex.terminal.btcusd.orderbook.json')

const market = dazaar('dbs/terminal-orderbook-btcusd')
const buyer = market.buy(card, { sparse: false, terms })

buyer.ready(function () {
  const o = new Orderbook(buyer.feed)
  doQuery(o)
})

async function doQuery (o) {
  const s = o.createReadStream({ limit: 5 })

  for await (const data of s) {
    console.log('--->', data)
  }
}
