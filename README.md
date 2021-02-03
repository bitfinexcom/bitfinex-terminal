# Bitfinex Terminal

Bitfinex Terminal offers market data as live data streams and is built on top of [Dazaar](https://github.com/bitfinexcom/dazaar). It offers first class support for Algo Traders by offering market data over a distributed database to everyone.

There are free and paid market data streams available. They give algo traders and data scientists easy and fast access to our historical trading data. Trading data is easy to download and replicate. It is shared on a P2P network - like BitTorrent - but with a database interface. Also, unlike with BitTorrent, you won't have to download everything until you can use it, streaming time ranges is supported. And if you decide to download more data, e.g. from an earlier timeframe, it will of course preserve the data ordered. Free data comes in a nice B-Tree and orderbooks in compressed append-only logs, both guarantee fast access.

Our paid streams give access to historical orderbook data. Bitfinex Terminal Orderbooks contain the snapshotted data of all Bitfinex orderbooks.
Every five seconds the orderbook data is recorded, which gives an insight into important characterisitcs of the market, i.e. liquidity over time.
The data is compressed using an effective algorithm, which allows for fast data transfer and small storage footprints.

## Table of Contents

  1. [How to use it?](#howtouse)
  1. [Support for Algo Traders](#firstclass)
  1. [Example: Get a Full Snapshot of the Free BTCUSD trades, and keep following new updates](#example-trades)
  1. [Example: Query Free Candles Data](#example-candles)
  1. [Example: Access the Paid Orderbooks with USDT](#example-orderbooks-usdt)
  1. [Example: Access the Paid Orderbooks with LND](#example-orderbooks-lnd)
  1. [Example: Query Local Orderbook Data](#example-orderbooks-local)
  1. [Example: Download and Query Historical Funding Stats](#example-funding-stats)
  1. [Tutorial: Backtest your Trading Strategies with Bitfinex Terminal & Honey Framework](./articles/backtesting-with-hf.md)
  1. [Tutorial: Execute your Trading Strategy with the Honey Framework and Bitfinex Terminal](./articles/execute-strategy-hf.md)
  1. [Article: Learn more about Dazaar](https://blog.dazaar.com/2020/09/12/introducing-dazaar/)
  1. [Video: Screencast for Free Data Streams](./img/video-free-streams.gif)

<a id="howtouse" />

## How to use it?

Every data stream in Bitfinex Terminal and also Dazaar has a unique `id` on the network. Imagine it like the url of the data stream. You can directly use ids or you can use Dazaar Cards, which are [available for download](./cards). We have prepared a few examples that will show how to use it. Bitfinex Terminal currently offers a mix of free and paid data streams:

 - Historical Candles Data (free)
 - Historical Trades Data (free)
 - Historical Funding Stats Data (free)
 - Historical Orderbooks Data (paid)

Paid streams will require you to send a specific amount of crypto currency to a defined address. Dazaar will start replicating the whole dataset in the background unless sparse-mode is enabled. That means your database query is resolved with a high priority, while it additionally downloads the whole dataset in the background. For a guided example, [see this short how-to guide.](#example-orderbooks)

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

The function `doQuery` will make a request for us. It will request the required data prioritized and print it to our console. We select all trades with a timestamp larger than October 2018, 9:00 UTC and `2019`. We also limit the results to `10`. The SQL equivalent to this query would be:

```
SELECT * from trades
WHERE timestamp >= 2018-10-10T09:00:00.000Z
  AND timestamp <= 2019-10-10T09:00:00.000Z
LIMIT 10
```

This is our query:

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

For our query we define a timeframe and the candle type. We also reverse the results, so we should get the newest entries first. The equivalent SQL query is:

```
SELECT * from candles
WHERE candle = '5m'
 AND timestamp >= 2018-10-10T09:00:00.000Z
 AND timestamp <= 2019-10-10T09:00:00.000Z
LIMIT 10
ORDER BY timestamp DESC
```

Here is our query:

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

<a id="example-orderbooks-usdt" />

### Example: Access the Paid Orderbooks with USDT

Similar to paying for time in other cloud computing services you pay Bitfinex Terminal streams on an hourly basis.

As a first step we need to download the Dazaar Card for the stream we are interested in. In this how-to-guide we'll fetch data from the BTCUSD orderbook stream. A final note: please follow the code tutorial and code example first before making any payments, as payment time starts counting as soon as the payment is done.

```
wget https://github.com/bitfinexcom/bitfinex-terminal/tree/master/cards/paid/orderbooks/bitfinex.terminal.btcusd.orderbook.json
```

To access the data we need to install several modules:

```
npm install dazaar @dazaar/payment-eth \
  bitfinex-terminal-order-book bitfinex-terminal-terms-of-use
```

One particular module we install is the terms of use module. You can read the terms of use here: [https://github.com/bitfinexcom/bitfinex-terminal/tree/master/terms-of-use](https://github.com/bitfinexcom/bitfinex-terminal/tree/master/terms-of-use). Later we will pass that module to the dazaar market to accept the terms.

We create a file called `test-orderbooks.js` and load the modules we just installed with npm:

```js
const dazaar = require('dazaar')
const swarm = require('dazaar/swarm')
const Payment = require('@dazaar/payment-eth')
const terms = require('bitfinex-terminal-terms-of-use')

const Orderbook = require('bitfinex-terminal-order-book')
```

We also load the Dazaar Card of of the data stream:

```js
const card = require('./bitfinex.terminal.btcusd.orderbook.json')
```

When we open the file `bitfinex.terminal.btcusd.orderbook.json` we can see the Dazaar Card. The `id` field refers to the data stream, and the payment section gives instructions for payment. You can see that it requires 2 cents USDT for one hour of access:

```
  "amount": 0.02,
  "unit": "hours",
  "interval": 1
```


Similar to Free Bitfinex Terminal data we set up a database and load the card. We also accept the terms of use by passing them as an argument:

```js
const market = dazaar('./dbs/terminal-orderbook-btcusd')
const buyer = market.buy(card, { sparse: false, terms })
```

When our local client is bootstrapped, we print the payment informations to the console:

```js
buyer.ready(function () {
  console.log('Pay to ' + Payment.tweak(buyer.key, card))

  swarm(buyer)
})
```

It will print something like `Pay to 0xaf2333...` to the console. When we pay 2 cents USDT to that address, we get one hour of access to the stream and our replication starts. But for now, we just continue to write our example program.

When we made the payment, as soon as our payment is received, the feed event is triggered, and we start replicating the data. In case we have already payed, the `feed` event is triggered, too. For example purposes, we also do a database query with the orderbook query api:

```js
buyer.on('feed', function () {
  console.log('got feed')

  const o = new Orderbook(buyer.feed)
  doQuery(o)
})
```

Our query function will fetch the entries of the last 5 minutes. It is the equivalent to the SQL query `SELECT * from <table> WHERE timestamp > $TIMESTAMP_5_MINUTES_AGO`. The option `live` keeps the stream open, so each new entry is printed to the console:

```js
async function doQuery (o) {
  const start = new Date().getTime() - (1000 * 60 * 5)

  const s = o.createReadStream({ start, live: true })

  for await (const data of s) {
    console.log('--->', data)
  }
}
```

When we now start or program with `node test-orderbooks.js` it will print an ETH address to the console. When we pay 0.02 USDT to it, the streaming of data will start. Additionally older data is replicated in the background, for later use. When we want to consume more data, we can pay any time. If we pay before the hour ends, it will be added on top of our available time.

The full code example can be found in [examples/payed-orderbooks.js](examples/payed-orderbooks.js).

<a id="example-orderbooks-lnd" />

### Example: Access the Paid Orderbooks with Lightning

Next to USDT and LEO, payments with Bitcoin via Lightning are possible. The current fee is 100 satoshi per hour per dataset, as we will see soon. Let's get started.

Similar to the previous example we downlaod the Dazaar Card of the data stream we are interested in. For our example we'll use the BTCUSD orderbooks Dazzar Card again:

```
wget https://github.com/bitfinexcom/bitfinex-terminal/tree/master/cards/paid/orderbooks/bitfinex.terminal.btcusd.orderbook.json
```

When we open the file `bitfinex.terminal.btcusd.orderbook.json` we see the different pricings. One section refers to BTC, it mentions an amount of 100 satoshi per hour:

```
{
  "method": "Lightning",
  "currency": "SATS",
  "amount": 100,
  "unit": "hours",
  "interval": 1,
  "minSeconds": 1
}
```

With that in mind we can start to code and install the required dependencies. To pay with Lighning, we have to use the `@dazaar/payment-lightning` module:

```
npm install dazaar @dazaar/payment-lightning  \
  bitfinex-terminal-order-book bitfinex-terminal-terms-of-use \
  hyperbee
```

In our code, we load our dependencies.

```js
const dazaar = require('dazaar')
const swarm = require('dazaar/swarm')
const Payment = require('@dazaar/payment-lightning')
const terms = require('bitfinex-terminal-terms-of-use')
const Orderbook = require('bitfinex-terminal-order-book')
```

One important module is the terms of use module `bitfinex-terminal-terms-of-use`. You can read the terms of use here: [https://github.com/bitfinexcom/bitfinex-terminal/tree/master/terms-of-use](https://github.com/bitfinexcom/bitfinex-terminal/tree/master/terms-of-use). If you agree with the terms, we can continue to code and pass the module content later to the Dazaar market.

We also have to load our Dazaar Card:

```js
const card = require('./bitfinex.terminal.btcusd.orderbook.json')
```

Similar to the previous examples, we set up a database:

```js
const market = dazaar('dbs/terminal-orderbook-btcusd-lnd')
```

And we also initiate the Dazaar market. Please note that you have to insert the terms of use here, if you agree with them:

```js
const buyer = market.buy(card, { sparse: false, terms })
```

When our market setup from above is finished, the `ready` function is called as a callback. In the next step we request an invoice for `100 satoshi`, which will give us an hour to access and download data. The invoice is printed to the console, and can be paid with any Lightning wallet:

```js
buyer.ready(function () {
  console.log('ready')

  const payment = new Payment(buyer)
  payment.requestInvoice(100, function (err, invoice) {
    if (err) console.log(err)
    console.log(invoice)
  })

  swarm(buyer)
})
```

When the payment has arrived its destination, the stream becomes available for Dazaar. On our side a `feed` event is emitted, and we know that we can send our database queries. Of course the `feed` event is also emitted when we have made a payment in the past that is still valid.

```js
buyer.on('feed', function () {
  console.log('got feed')

  const o = new Orderbook(buyer.feed)
  doQuery(o)
})
```

Our query will be very simple, the SQL equivalent is:

```
SELECT * from orderbooks
WHERE timestamp > $TIMESTAMP_10_MINUTES_AGO
```

In addition, we keep the stream open and listen for ne data coming in with `live: true`. There are other query modifier available for more complex queries, namely `end` and `limit`.

`limit` will limit the result set to the defined amount and with `end` a we can set the upper bound for our timeseries query.

```js
async function doQuery (o) {
  const s = o.createReadStream({
    start: new Date().getTime() - (1000 * 60 * 10),
    live: true
  })

  for await (const data of s) {
    console.log('--->', data)
  }
}
```

When we now run the code, which is also located at [examples/payed-orderbooks-lnd.js](examples/payed-orderbooks-lnd.js), it will print a Lightning invoice.

![invoice](./img/lnd-invoice.png)

Once we pay the invoice, we get access, the query is exectuted and the results printed to the console. As sparse mode is set to `false`, the db also replicates the whole dataset in the background.

The full code example can be found in [examples/payed-orderbooks-lnd.js](examples/payed-orderbooks-lnd.js).


<a id="example-orderbooks-local" />

### Example: Query Local Orderbook Data

Of course its possible to query the local copy of the orderbook data you've paid for. In essence, we'll just remove the part where we connect to the servers. That means, we will modify [examples/payed-orderbooks.js](examples/payed-orderbooks.js) a little bit.

As we don't connect to Dazaar network we need to require less modules:

```js
const dazaar = require('dazaar')
const terms = require('bitfinex-terminal-terms-of-use')

const Orderbook = require('bitfinex-terminal-order-book')
```

As in the previous example, we require our card and setup Dazaar. Note that the used database path `dbs/terminal-orderbook-btcusd` is equal to the one used in the previous example, where we paid and downloaded data using the ETH payment provider:

```js
const card = require('../cards/paid/orderbooks/bitfinex.terminal.btcusd.orderbook.json')
const market = dazaar('dbs/terminal-orderbook-btcusd')
const buyer = market.buy(card, { sparse: false, terms })
```

When the `buyer.ready` callback is called, we initialise the database query API and run our query:

```js
buyer.ready(function () {
  const o = new Orderbook(buyer.feed)
  doQuery(o)
})
```

Our query is the equivalent of a `SELECT * from <table> LIMIT 5` query in SQL:

```js
async function doQuery (o) {
  const s = o.createReadStream({ limit: 5 })

  for await (const data of s) {
    console.log('--->', data)
  }
}
```

Lets say we want to do a range query, with a max of 5 results. The equivalent in SQL would be:

```
SELECT * from <table> WHERE timestamp > $TIMESTAMP_5_MINUTES_AGO AND timestamp < $NOW LIMIT 5
```

We would replace our query in `doQuery` in this way:

```js
const start = new Date().getTime() - (1000 * 60 * 5)
const end = Date.now()

const s = o.createReadStream({ limit: 5, start, end  })
```

The full example can be found at [examples/payed-orderbook-local.js](examples/payed-orderbook-local.js).


### Example: Download and Query Historical Funding Stats

<a id="example-funding-stats" />

Funding Stats give you an insight about the development of the funding market available at Bitfinex. The data for all funding pairs is stored in a single database. In this short intro we will replicate the whole database and run a query on it.

First we'll have to install the required modules:

```
npm install dazaar bitfinex-terminal-terms-of-use \
  hyperbee bitfinex-terminal-funding-encoding
```

Similar to the other data streams we have to require `dazaar` and `hyperbee`:

```js
const dazaar = require('dazaar')
const swarm = require('dazaar/swarm')

const Hyperbee = require('hyperbee')
```

The Terms of Service are accepted by requiring the `bitfinex-terminal-terms-of-use` module, and then passing it into Dazaar. For now, we just require it:

```js
const terms = require('bitfinex-terminal-terms-of-use')
```

We also load the key- and value-encodings for the funding stats database:

```js
const { keyEncoding, valueEncoding } = require('bitfinex-terminal-funding-encoding')
```

In the next step we set up the Dazaar database:

```js
const market = dazaar('dbs/funding-stats')
```

We require the Dazaar Card which points to the data stream. In case you wonder, the card is available [here](https://github.com/bitfinexcom/bitfinex-terminal/tree/master/cards/free/funding-stats/bitfinex.terminal.funding.stats.json):

```js
const card = require('../cards/free/funding-stats/bitfinex.terminal.funding.stats.json')
```

To access the data we have to accept the Terms of Service. You can read them [here](https://github.com/bitfinexcom/bitfinex-terminal/tree/master/terms-of-use). If you agree with the terms, you pass them together with the Dazaar Card as an argument to the `market.buy` function. Please note that we also set `sparse` to `false`, so the whole database will get replicated in the background. In case we would set `sparse` to `true`, just the data resolving from our query would be replicated.

```js
const buyer = market.buy(card, { sparse: false, terms })
```

As next steps we are going to initiate the database and run our query. When we connect to the remote peers, a `feed` event is emitted. Starting from that point we can query the database using `hyperbee`:

```js
buyer.on('feed', function () {
  console.log('got feed')

  const db = new Hyperbee(buyer.feed, {
    keyEncoding,
    valueEncoding
  })

  doQuery(db)
})
```

The Funding Stats database uses sub-databases. For each funding pair there is a sub-database that can be accessed using the `db.sub()` command. The `doQuery` function will query funding stats for `USD`. We will query the last three entries for the timeframe between the third of January and the fifth of January 2021, 9 AM. The SQL quivalent for the query we run is:

```
SELECT * from funding_stats
WHERE f_currency = 'USD'
  AND datetime >= '2021-01-03T09:00:00.000Z'
  AND datetime <= '2021-01-05T09:00:00.000Z'
LIMIT 3
ORDER BY datetime DESC
```

Our hyperbee query looks like this, it logs the results to the console:

```js
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
```

The last step for receiving the funding stats is to connect to the remote peers, and starting to download and query the data:

```js
swarm(buyer)
```

That's it! When you run the code, it will download the whole funding stats database in the background. In addition it runs a query for `USD` funding stats to select a few data entries. You can find the full code in [examples/funding-stats.js](examples/funding-stats.js).

## Tutorials

<a id="tutorials" />

Our tutorials can be found in the folder [articles](./articles).

 - [Tutorial: Backtest your Trading Strategies with Bitfinex Terminal & Honey Framework](./articles/backtesting-with-hf.md)
 - [Tutorial: Execute your Trading Strategy with the Honey Framework and Bitfinex Terminal](./articles/execute-strategy-hf.md)

## Articles

<a id="articles" />

 - [Introducing Dazaar](https://blog.dazaar.com/2020/09/12/introducing-dazaar/)

## Videos

<a id="videos" />

 - [Video: Screencast for Free Data Streams](./img/video-free-streams.gif)
