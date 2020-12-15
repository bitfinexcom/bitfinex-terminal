# Bitfinex Terminal

Bitfinex Terminal offers market data as live data streams and is built on top of [Dazaar](https://github.com/bitfinexcom/dazaar). It offers first class support for Algo Traders by offering market data over a distributed database to everyone.

The market data streams are free and allow algo traders and data scientists easy and fast access to our historical trading data. Trading data is easy to download and replicate. It is shared on a P2P network - like BitTorrent - but with a database interface. Also, unlike with BitTorrent, you won't have to download everything until you can use it, streaming time ranges is supported. And if you decide to download more data, e.g. from an earlier timeframe, it will of course preserve the data ordered, in a nice B-Tree, for fast access.

## Table of Contents

  1. [How to use it?](#howtouse)
  1. [Support for Algo Traders](#firstclass)
  1. [Example: Get a Full Snapshot of the BTCUSD trades, and keep following new updates](#example-trades)
  1. [Example: Query Candles Data](#example-candles)
  1. [Tutorial: Backtest your Trading Strategies with Bitfinex Terminal & Honey Framework](./articles/backtesting-with-hf.md)
  1. [Tutorial: Execute your Trading Strategy with the Honey Framework and Bitfinex Terminal](./articles/execute-strategy-hf.md)
  1. [Article: Learn more about Dazaar](https://blog.dazaar.com/2020/09/12/introducing-dazaar/)

<a id="howtouse" />

## How to use it?

Every data stream in Bitfinex Terminal and also Dazaar has a unique `id` on the network. Imagine it like the url of the data stream. You can directly use ids or you can use Dazaar Cards, which are [available for download](./cards). We have prepared a few examples that will show how to use it.

<a id="firstclass" />

## First class support for Algo Traders

Bitfinex Terminal is also supported by the [Honey Framework](https://honey.bitfinex.com/). You can easily backtest your Honey Framework Strategies on Bitfinex Terminal with the [Honey Framework backtesting tools](./articles/backtesting-with-hf.md). And you can also decide to trade on your own or to sell the trading signals on the Dazaar network with [bfx-hf-strategy-dazaar](https://github.com/bitfinexcom/bfx-hf-strategy-dazaar).

## Examples

<a id="example-trades" />

Also make sure to check our [tutorial material](#tutorials) :)

### Example: Get a Full Snapshot of the BTCUSD trades, and keep following new updates

In our first example we will prepare a full copy of the Bitfinex trades data. We also want to keep following new updates that come in. We will walk through a small set of code, as if we were writing it. The full example can be found at [examples/trades-full-copy.js](examples/trades-full-copy.js).

As a first step we have to require our dependencies, one of it are the terms of service that we can read at [https://github.com/bitfinexcom/bitfinex-terminal/tree/master/terms-of-use](https://github.com/bitfinexcom/bitfinex-terminal/tree/master/terms-of-use):

```js
const dazaar = require('dazaar')
const swarm = require('dazaar/swarm')

const Hyperbee = require('hyperbee')
const keyEncoding = require('bitfinex-terminal-key-encoding')
const terms = require('bitfinex-terminal-terms-of-use')
```

And we create a Dazaar market. Our data will be stored at `dbs/full-trades`

```js
const market = dazaar('dbs/full-trades')
```

Then we download the [Dazaar Card for the stream](./cards/free/trades/bitfinex.terminal.btcusd.trades.json) and load it. The option `live: true` keeps the connection open, so we keep listening for updates after the data is fully synced. If we would set `sparse` to `true`, we would just download requested data that we request in a query. This way, we make a full copy. We also accept the Bitfinex Terminal terms of use by loading them into Dazaar, after we have read them:

```js
const card = require('../cards/free/trades/bitfinex.terminal.btcusd.trades.json')
const buyer = dmarket.buy(card, { live: true, sparse: false, terms })
```

In the next step a lot happens. We register an event listener for the `feed` event. When it is emitted, we know that the feed is ready for consuming. We also set up a `Hyperbee` instance, which will provide us a nice interface to access the data. We pass the `db` instance to a function called `doQuery` which we will highlight next.

```js
buyer.on('feed', function () {
  console.log('got feed')

  const db = new Hyperbee(buyer.feed, {
    keyEncoding,
    valueEncoding: 'json'
  })

  doQuery(db)
})
```

The function `doQuery` will make a request for us. It will request the required data prioritized and print it to our console. We select all trades with a timestamp larger than October 2018, 9:00 UTC and `2019`. We also limit the results to `10`:

```js
function doQuery (db) {
  db.createReadStream({
    gte: { timestamp: new Date('2018-10-10T09:00:00.000Z') },
    lte: { timestamp: new Date('2019-10-10T09:00:00.000Z') },
    limit: 10
  }).on('data', (d) => {
    console.log(d)
  })
}
```


To start everything, we have to join the P2P swarm:

```js
swarm(buyer)
```

And for demonstration purposes we also log the downloaded elements, so we can see the progress:

```js
setInterval(() => {
  if (!buyer.feed) return

  console.log('data feed length is', buyer.feed.length, 'elements')
}, 1000)
```

This example code will download the whole BTCUSD trades dataset from Bitfinex Terminal. If the connection is reset, it will just resume where it stopped. We also make a request for a timerange and print it to the console. The timerange is prioritized and downloaded first. When all downloading is finished, we keep the socket open to receive the latest updates. That is a lot that is done for us behind the scenes.

<a id="example-candles" />

### Example: Query Candles Data

Querying Candle data is as easy as getting historical trade data. All candle data is consolidated into one database, and we just have to select our candle type.

The full example can be found at [examples/candles-sparse-select.js](examples/candles-sparse-select.js). Our setup is similar to the trades example, we require our dependencies and set up a database that is stored on disk:

```js
const dazaar = require('dazaar')
const swarm = require('dazaar/swarm')

const Hyperbee = require('hyperbee')
const keyEncoding = require('bitfinex-terminal-key-encoding')

const market = dazaar('dbs/sparse-candles')
```

This time we load a [Dazaar Card for candles](./cards/free/candles/bitfinex.terminal.btcusd.candles.json). We also enable the `sparse` mode, that means, just the data we directly request is downloaded. We also accept the Bitfinex Terminal terms of use by loading module for it into Dazaar:

```js
const card = require('../cards/free/candles/bitfinex.terminal.btcusd.candles.json')
const terms = require('bitfinex-terminal-terms-of-use')
const buyer = dmarket.buy(card, { sparse: true, terms })
```

Our event listener looks exactly the same as the one from the previous example:

```js
buyer.on('feed', function () {
  console.log('got feed')

  const db = new Hyperbee(buyer.feed, {
    keyEncoding,
    valueEncoding: 'json'
  })

  doQuery(db)
})
```

For our query we define a timeframe and the candle type. We also reverse the results, so we should get the newest entries first:

```js
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
```

In this example we did a sparse-enabled select on the data, so just the data we selected is downloaded. The full example can be found in [examples/candles-sparse-select.js](examples/candles-sparse-select.js).

## Tutorials

<a id="tutorials" />

Our Tutorials can be found in the folder [articles](./articles).

 - [Tutorial: Backtest your Trading Strategies with Bitfinex Terminal & Honey Framework](./articles/backtesting-with-hf.md)
 - [Tutorial: Execute your Trading Strategy with the Honey Framework and Bitfinex Terminal](./articles/execute-strategy-hf.md)

## Articles

<a id="articles" />

 - [Introducing Dazaar](https://blog.dazaar.com/2020/09/12/introducing-dazaar/)
