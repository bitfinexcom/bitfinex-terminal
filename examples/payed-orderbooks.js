'use strict'

const dazaar = require('dazaar')
const swarm = require('dazaar/swarm')
const Payment = require('@dazaar/payment-eth')
const terms = require('bitfinex-terminal-terms-of-use')

const Orderbook = require('bitfinex-terminal-order-book')

const card = require('../cards/paid/orderbooks/bitfinex.terminal.btcusd.orderbook.json')

const market = dazaar('dbs/terminal-orderbook-btcusd')
const buyer = market.buy(card, { sparse: false, terms })

buyer.on('feed', function () {
  console.log('got feed')

  const o = new Orderbook(buyer.feed)
  doQuery(o)
})

buyer.ready(function () {
  console.log('Pay to ' + Payment.tweak(buyer.key, card))
  console.log(buyer.key.toString('hex'))
  swarm(buyer)
})

async function doQuery (o) {
  const s = o.createReadStream({
    start: new Date().getTime() - (1000 * 60 * 5),
    live: true
  })

  // alternative: range query with max 5 results:
  // const start = new Date().getTime() - (1000 * 60 * 5)
  // const end = Date.now()
  // const s = o.createReadStream({ limit: 5, start, end  })

  for await (const data of s) {
    console.log('--->', data)
  }
}
