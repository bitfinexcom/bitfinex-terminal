'use strict'

const dazaar = require('dazaar')
const swarm = require('dazaar/swarm')
const Hyperbee = require('hyperbee')
const Payment = require('@dazaar/payment-lightning')
const { keyEncoding, valueEncoding } = require('bitfinex-terminal-funding-book-encoding')

const terms = require('bitfinex-terminal-terms-of-use')

const card = require('../cards/paid/funding/bitfinex.terminal.funding.books.json')

const market = dazaar('dbs/terminal-fundingbook-usd-lnd')
const buyer = market.buy(card, { sparse: true, terms })

buyer.ready(function () {
  console.log('ready')

  const payment = new Payment(buyer)
  payment.requestInvoice(100, function (err, invoice) {
    if (err) console.log(err)
    console.log(invoice)
  })

  swarm(buyer)
})

buyer.on('feed', function () {
  const db = new Hyperbee(buyer.feed, {
    keyEncoding,
    valueEncoding
  })

  doQuery(db)
})

function doQuery (db) {
  db.sub('USD').createReadStream({
    limit: 10,
    reverse: true
  }).on('data', (d) => {
    console.log(JSON.stringify(d, null, 2))
  })
}
