# Execute your Trading Strategy with the Honey Framework and Bitfinex Terminal

Recently [we learned how backtesting a strategy can work with Bitfinex Terminal data streams](./backtesting-with-hf.md). In its core, the data streams are free Dazaar feeds shared over a P2P technology similar to BitTorrent. But unlike BitTorrent, the data can be cryptographically verified and is streamable. We can request frames of a dataset right from the middle or decide to just follow a live stream with the latest additions. Of course, downloading the whole dataset is possible too.

In this article, we will use data that is streamed on Bitfinex Terminal to execute a live strategy. For demonstration purposes, the generated trading signals are sent to the Bitfinex Websocket API. In practice, however, we can do anything with them. Even if you want to power on a coffee machine with a Raspberry Pi every time your strategy would trade, you could do so!

For our tutorial, we are using a popular strategy, the EMA Cross Strategy. It emits a trading signal when two EMA indicators cross each other. The EMA Cross strategy is included as one of the examples in the [bfx-hf-strategy](https://github.com/bitfinexcom/bfx-hf-strategy) library.

## Let's start

To begin we have to install the required dependencies:

```
npm install dazaar hyperbee bitfinex-terminal-key-encoding bfx-hf-util bfx-hf-strategy bfx-hf-strategy-dazaar  \
  bitfinex-api-node bfx-api-node-models bitfinex-terminal-terms-of-use
```

We also need to create a file, which will contain the code we write, let's call it `exec-strategy.js`:

```
touch exec-strategy.js
```

Now we can load the required dependencies. Readers of our backtesting tutorial will spot a few similarities:

```js

const dazaar = require('dazaar')
const swarm = require('dazaar/swarm')
const Hyperbee = require('hyperbee')
const keyEncoding = require('bitfinex-terminal-key-encoding')
const terms = require('bitfinex-terminal-terms-of-use')

const { SYMBOLS, TIME_FRAMES } = require('bfx-hf-util')
const EMAStrategy = require('bfx-hf-strategy/examples/ema_cross')
const execDazaar = require('bfx-hf-strategy-dazaar')
```

We also load and initialise the Bitfinex Websocket client. To make it work, you have to replace the placeholders with your credentials:

```js
const { WSv2 } = require('bitfinex-api-node')
const { Order } = require('bfx-api-node-models')

const apiKey = 'SECRET'
const apiSecret = 'SECRETSECRET'
const ws = new WSv2({
  apiKey,
  apiSecret
})
```


Next we initialise our strategy:

```js
const market = {
  symbol: SYMBOLS.BTC_USD,
  tf: TIME_FRAMES.ONE_MINUTE
}

const strat = EMAStrategy(market)
```

And initialise Dazaar:

```js
const dmarket = dazaar('dbs/terminal-live') // stores received data in `dbs/terminal-live`
```

With `wget` we can pull the Dazaar Card for the data feed we want to consume. An overview of data feeds can be found [here](../cards).

```
wget https://raw.githubusercontent.com/bitfinexcom/bitfinex-terminal/master/cards/free/candles/bitfinex.terminal.btcusd.candles.json
```

That card is loaded into Dazaar and the Terms of Services are agreed by loading them into Dazaar after we have read them:

```js
const card = require('./bitfinex.terminal.btcusd.candles.json')
const buyer = dmarket.buy(card, { sparse: true, terms })
```

And if Dazaar emits a `feed` event, we set up Hyperbee and call a function called `runStrategy`:

```js
buyer.on('feed', function () {
  console.log('got feed')

  const db = new Hyperbee(buyer.feed, {
    keyEncoding,
    valueEncoding: 'json'
  })

  runStrategy(db)
})
```

So far, most of our setup is similar to the setup we used for backtests in the [last article](./backtesting-with-hf.md). Now we have to define the function `runStrategy`, which is enabling us to do something with the trading signals from our strategy:

```js
async function runStrategy (db) {

}
```

The function `runStrategy` will set up the logic that runs our strategy on each received candle. First, we open the Websocket to the Bitfinex API.


```js
await ws.open()
await ws.auth()
```

We also set up the data stream. We call `execDazaar` with our strategy, the defined market and the Hyperbee database. As options, we pass in `submitOrder`, a custom function we will write in a bit. `submitOrder` will be called for every trading signal that is emitted from our strategy. The `simulateFill` option allows us to not wait for the order to be fully filled by the exchange, which is useful for our tutorial. The built-in `submitOrder`-function in the Honey Framework also submits orders by WebSocket and is waiting for an order to be filled before continuing. In production, you may want to use the built-in one, depending on your strategy and use case. We also seed the strategy state, we use a count of 120 candles.


```js
const { exec, stream } = await execDazaar(strat, market, db, {
  submitOrder,
  simulateFill: true,
  includeTrades: false,
  seedCandleCount: 120
})
```

`execDazaar` returns a stream and a function called `exec`. We are calling `exec` on every entry that is sent in the stream:

```js
for await (const data of stream) {
  const { key, value } = data
  await exec(key, value)
}
```

Our function `runStrategy` is now complete, here is the full function:

```js
async function runStrategy (db) {
  await ws.open()
  await ws.auth()

  const { exec, stream } = await execDazaar(strat, market, db, {
    submitOrder,
    simulateFill: true,
    includeTrades: false,
    seedCandleCount: 10
  })

  for await (const data of stream) {
    const { key, value } = data
    await exec(key, value)
  }
}
```

We still have to define the function `submitOrder`. For every signal emitted from our EMA Cross strategy, `submitOrder` is called with the current state of the strategy and the order data. In our case, we take the order data and send it to Bitfinex. We write a simplified version of the


```js
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
```

To start everything, we have to connect to the network, which will trigger a `feed` event:

```js
swarm(buyer)
```

When we run the file now, it will take the last 120 candles and pre-seed our strategy algorithm with it. Then it will follow the live stream of new candles coming in and run our strategy on it. In case a trading signal is generated, it is submitted to the Bitfinex API. You can find the full file we wrote in this article [here](../examples/exec-strategy.js).

And that's it! In this article, we’ve learned how we can take a Honey Framework strategy, feed in data from Bitfinex Terminal, and submit the trading signals for trading. With the help of custom `submitOrder` functions, we can build custom functionality our trading strategy acts upon. We hope you enjoyed the article.

PS: [Bitfinex is hiring!](https://bitfinex.recruitee.com/) :)
