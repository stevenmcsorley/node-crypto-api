const PORT = process.env.PORT || 3000;
import express from "express";
import axios from "axios";
import { load } from "cheerio";
const app = express();

// CONFIGS
app.disable("view cache");

axios.headers = {
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  Expires: "0",
};

// DATA

let tickerInfo = [];
let html, ticker, price, change24hr, volume24hr, marketCap;

const exhanges = [
  {
    name: "binance",
    address: "https://www.binance.com/en/markets",
    base: "",
  },
  {
    name: "coingecko",
    address: "https://www.coingecko.com/en/coins/trending",
    base: "",
  },
];

// API METHODS

const tickerHead = (direction) => {
  return [
    {
      info: [
        { time: Date.now() },
        { trend: direction == "down" ? "Top Losers" : "Top Gainers" },
      ],
    },
  ];
};

async function coingeckoDirection(direction) {
  await getCryptoInfo(
    getCoingeckoTrending,
    "https://www.coingecko.com/en/coins/trending"
  );

  let len = tickerInfo.length / 2;
  if (direction !== "down") {
    return [...tickerHead(direction), tickerInfo.slice(0, len + 1)];
  }
  return (tickerInfo = [...tickerHead(direction), tickerInfo.slice(len + 1)]);
}

async function getCryptoInfo(cherrioFunction, exchange) {
  try {
    const response = await axios.get(`${exchange}`);
    cherrioFunction(response);
  } catch (error) {
    console.log(error);
  }
}

// SCRAPERS

async function getCoingeckoTrending(res) {
  html = res.data;
  let $ = load(html);
  $("#gecko-table-all tr", html).each(function () {
    ticker = $(this).find(".coin-icon span").text();
    price = $(this).find("td.td-price a span").text();
    change24hr = $(this).find("td.td-change24h span").text();
    volume24hr = $(this).find("td.td-liquidity_score span").text();
    if (ticker !== "") {
      tickerInfo.push({
        source: "coingecko",
        ticker,
        price,
        change24hr,
        volume24hr,
      });
    }
  });
}

async function getBinanceMarket(res) {
  tickerInfo = [{ time: Date.now() }];
  html = res.data;
  let $ = load(html);

  $(".css-vlibs4", html).each(function () {
    ticker = $(this).find("div.css-1ap5wc6").text();
    price = $(this).find("div.css-ydcgk2 div").text();
    change24hr = $(this).find("div.css-18yakpx").text();
    volume24hr = $(this).find("div.css-102bt5g").text();
    marketCap = $(this).find("div.css-s779xv").text();
    tickerInfo.push({
      source: "binance",
      ticker,
      price,
      change24hr,
      volume24hr,
      marketCap,
    });
  });
}

// HANDLERS

async function exchangeSwap(req, res) {
  const exchangeId = req.params.exchangeId;
  let source = exhanges
    .filter((s) => s.name == exchangeId)
    .map((a) => {
      return a.address;
    });

  if (exchangeId == "binance") {
    await getCryptoInfo(getBinanceMarket, source);
    res.send(tickerInfo);
  }
}

async function exchangeTrend(req, res) {
  const exchangeId = req.params.exchangeId;
  if (exchangeId == "coingecko") {
    const x = await coingeckoDirection(req.params.trend);
    res.send(x);
  }
}

// ROUTES

app.get("/", (req, res) => {
  res.json("Crypto prices API");
});

app.get("/crypto/:exchangeId", exchangeSwap);

app.get("/crypto/:exchangeId/:trend", exchangeTrend);

app.listen(PORT, () => console.log(`server running on PORT ${PORT}`));
