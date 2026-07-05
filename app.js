import { siFacebook, siInstagram, siLinktree, siTelegram, siX, siYoutube } from "simple-icons";

const brandIcons = {
  facebook: siFacebook,
  instagram: siInstagram,
  linktree: siLinktree,
  telegram: siTelegram,
  x: siX,
  youtube: siYoutube,
};

function renderBrandIcons() {
  document.querySelectorAll("[data-brand-icon]").forEach((target) => {
    const icon = brandIcons[target.dataset.brandIcon];
    if (!icon) {
      return;
    }

    target.setAttribute("aria-label", icon.title);
    target.innerHTML = "<svg aria-hidden='true' role='img' viewBox='0 0 24 24'><path d='" + icon.path + "'></path></svg>";
  });
}

renderBrandIcons();

const contractAddress = "0x7f2f00e54dcaa8b248bdfd75da2ae859d4d8ff3e";
const baseChainId = "0x2105";
const pairDataUrl = "https://api.dexscreener.com/latest/dex/pairs/base/0xc4fbb564d11a36b71d0152a1a8cddec709e20908";

const copyButton = document.querySelector("#copyContract");
const copyState = document.querySelector("#copyState");
const connectButtons = [document.querySelector("#connectWallet"), document.querySelector("#panelConnect")].filter(Boolean);
const walletLabel = document.querySelector("#walletLabel");
const walletStatus = document.querySelector("#walletStatus");
const walletMessage = document.querySelector("#walletMessage");

function shortAddress(address) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

async function copyContract() {
  try {
    await navigator.clipboard.writeText(contractAddress);
    copyButton.classList.add("copied");
    copyState.textContent = "Copied";
    window.setTimeout(() => {
      copyButton.classList.remove("copied");
      copyState.textContent = "Click to copy";
    }, 1800);
  } catch {
    copyState.textContent = "Copy unavailable";
  }
}

function getProvider() {
  if (window.ethereum?.providers?.length) {
    return window.ethereum.providers.find((provider) => provider.isCoinbaseWallet)
      || window.ethereum.providers.find((provider) => provider.isMetaMask)
      || window.ethereum.providers.find((provider) => provider.isTrust)
      || window.ethereum.providers[0];
  }

  return window.ethereum;
}

function setConnected(address) {
  document.querySelector("#connectWallet").classList.add("connected");
  walletLabel.textContent = shortAddress(address);
  walletStatus && (walletStatus.textContent = shortAddress(address));
  document.querySelector("#panelConnect") && (document.querySelector("#panelConnect").textContent = "Wallet Connected");
  walletMessage && (walletMessage.textContent = "Connected.");
}

async function requestBaseNetwork(provider) {
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: baseChainId }],
    });
  } catch (error) {
    if (error?.code === 4902) {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: baseChainId,
          chainName: "Base",
          nativeCurrency: {
            name: "Ether",
            symbol: "ETH",
            decimals: 18,
          },
          rpcUrls: ["https://mainnet.base.org"],
          blockExplorerUrls: ["https://basescan.org"],
        }],
      });
    }
  }
}

async function connectWallet() {
  const provider = getProvider();

  if (!provider?.request) {
    walletMessage && (walletMessage.textContent = "Install MetaMask, Coinbase Wallet, Trust Wallet, or another EVM wallet to connect.");
    return;
  }

  try {
    walletMessage && (walletMessage.textContent = "Waiting for wallet approval...");
    const accounts = await provider.request({ method: "eth_requestAccounts" });
    if (!accounts?.[0]) {
      walletMessage && (walletMessage.textContent = "No wallet account was selected.");
      return;
    }

    await requestBaseNetwork(provider);
    setConnected(accounts[0]);
  } catch (error) {
    walletMessage && (walletMessage.textContent = error?.code === 4001
      ? "Connection request cancelled."
      : "Wallet connection was not completed.");
  }
}

copyButton.addEventListener("click", copyContract);
function formatUsd(value, options = {}) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return "--";
  }

  if (number > 0 && number < 0.01) {
    return `$${number.toFixed(options.microDecimals ?? 6)}`;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: options.compact ? "compact" : "standard",
    maximumFractionDigits: options.maximumFractionDigits ?? 2,
  }).format(number);
}

function updateMarketText(selector, value) {
  document.querySelectorAll(selector).forEach((element) => {
    element.textContent = value;
  });
}

async function updateMarketData() {
  try {
    const response = await fetch(pairDataUrl, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Pair request failed");
    }

    const data = await response.json();
    const pair = data.pair || data.pairs?.[0];
    if (!pair) {
      throw new Error("Pair data unavailable");
    }

    const price = formatUsd(pair.priceUsd, { microDecimals: 6, maximumFractionDigits: 6 });
    const liquidity = formatUsd(pair.liquidity?.usd, { compact: true });
    const volume = formatUsd(pair.volume?.h24, { compact: true });

    document.querySelector("#livePrice").textContent = price;
    updateMarketText("[data-market-price]", price);
    updateMarketText("[data-market-liquidity]", liquidity);
    updateMarketText("[data-market-volume]", volume);
  } catch {
    updateMarketText("[data-market-price]", "Price unavailable");
  }
}

updateMarketData();
const siteSwapWidgetUrl = "https://americaonly.github.io/siteswap/widget.js";

function loadSiteSwapWidget() {
  const target = document.querySelector("#siteswapWidget");
  if (!target) {
    return;
  }

  const initialize = () => {
    window.BungeeWidget?.init?.({ targetId: "siteswapWidget" });
  };

  if (window.BungeeWidget?.init) {
    initialize();
    return;
  }

  const script = document.createElement("script");
  script.src = siteSwapWidgetUrl;
  script.async = true;
  script.onload = initialize;
  script.onerror = () => {
    target.textContent = "Swap widget unavailable. Please refresh or try again later.";
  };
  document.head.append(script);
}

loadSiteSwapWidget();
window.setInterval(updateMarketData, 60000);
connectButtons.forEach((button) => button.addEventListener("click", connectWallet));

const provider = getProvider();
if (provider?.request) {
  provider.request({ method: "eth_accounts" })
    .then((accounts) => {
      if (accounts?.[0]) {
        setConnected(accounts[0]);
      }
    })
    .catch(() => {});

  provider.on?.("accountsChanged", (accounts) => {
    if (accounts?.[0]) {
      setConnected(accounts[0]);
      return;
    }

    document.querySelector("#connectWallet").classList.remove("connected");
    walletLabel.textContent = "Connect Wallet";
    walletStatus && (walletStatus.textContent = "Not connected");
    document.querySelector("#panelConnect") && (document.querySelector("#panelConnect").textContent = "Connect Wallet");
    walletMessage && (walletMessage.textContent = "No transaction will be requested.");
  });
}
