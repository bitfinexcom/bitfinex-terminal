'use strict'

const dazaar = require('dazaar')
const swarm = require('dazaar/swarm')
const Hyperbee = require('hyperbee')
const keyEncoding = require('bitfinex-terminal-key-encoding')

const { SYMBOLS, TIME_FRAMES } = require('bfx-hf-util')
const EMAStrategy = require('bfx-hf-strategy/examples/ema_cross')

const terms = require('bitfinex-terminal-terms-of-use')

const execDazaar = require('bfx-hf-strategy-dazaar')

const { WSv2 } = require('bitfinex-api-node')
const { Order } = require('bfx-api-node-models')

const apiKey = 'SECRET'
const apiSecret = 'SECRETSECRET'
const ws = new WSv2({
  apiKey,
  apiSecret
})

const market = {
  symbol: SYMBOLS.BTC_USD,
  tf: TIME_FRAMES.ONE_MINUTE
}

const strat = EMAStrategy(market)

const dmarket = dazaar('dbs/terminal-live') // stores received data in `dbs/terminal-live`

const card = require('../cards/free/candles/bitfinex.terminal.btcusd.candles.json')
const buyer = dmarket.buy(card, { sparse: true, terms })

buyer.on('feed', function () {
  console.log('got feed')

  const db = new Hyperbee(buyer.feed, {
    keyEncoding,
    valueEncoding: 'json'
  })

  runStrategy(db)
})

swarm(buyer)

async function runStrategy (db) {
  await ws.open()
  await ws.auth()

  const { exec, stream } = await execDazaar(strat, market, db, {
    submitOrder,
    simulateFill: true,
    includeTrades: false,
    seedCandleCount: 120
  })

  for await (const data of stream) {
    const { key, value } = data
    await exec(key, value)
  }
}

async function submitOrder (strategyState = {}, order = {}) {
  const _o = {
    cid: Date.now(),
    ...order
  }

  console.log('submitting order', _o)

  const o = new Order(_o, ws)
  o.registerListeners()

  o.on('update', () => {
    console.log(`order updated: ${o.serialize()}`)
  })

  const res = await o.submit()
  return res
}
