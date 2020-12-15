'use strict'

process.env.DEBUG = process.env.DEBUG || 'bfx:*'

const dazaar = require('dazaar')
const swarm = require('dazaar/swarm')
const Hyperbee = require('hyperbee')
const keyEncoding = require('bitfinex-terminal-key-encoding')

const HFBT = require('bfx-hf-backtest')
const { SYMBOLS, TIME_FRAMES } = require('bfx-hf-util')
const EMAStrategy = require('bfx-hf-strategy/examples/ema_cross')

const terms = require('bitfinex-terminal-terms-of-use')

const get24HoursAgo = (date) => {
  const res = date.getTime() - (1 * 86400 * 1000)

  return new Date(res)
}

const market = {
  symbol: SYMBOLS.BTC_USD,
  tf: TIME_FRAMES.FIVE_MINUTES
}

const strat = EMAStrategy(market)

const dmarket = dazaar('dbs/terminal-backtest')

const card = require('../cards/free-candles/bitfinex.terminal.btcusd.candles.json')
const buyer = dmarket.buy(card, { sparse: true, terms })

buyer.on('feed', async function () {
  console.log('got feed')

  const db = new Hyperbee(buyer.feed, {
    keyEncoding,
    valueEncoding: 'json'
  })

  await runTest(db)
})

async function runTest (db) {
  const from = get24HoursAgo(new Date())
  const to = new Date()

  const { exec, onEnd } = await HFBT.execStream(strat, market, {
    from,
    to
  })

  const stream = db.createReadStream({
    gte: { candle: TIME_FRAMES.FIVE_MINUTES, timestamp: from },
    lte: { candle: TIME_FRAMES.FIVE_MINUTES, timestamp: to }
  })

  let btState
  for await (const data of stream) {
    const { key, value } = data
    btState = await exec(key, value)
  }

  await onEnd(btState)
}

swarm(buyer)
