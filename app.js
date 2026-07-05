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

const copyButton = document.querySelector("#copyContract");
const copyState = document.querySelector("#copyState");
const connectButtons = [document.querySelector("#connectWallet"), document.querySelector("#panelConnect")];
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
  walletStatus.textContent = shortAddress(address);
  document.querySelector("#panelConnect").textContent = "Wallet Connected";
  walletMessage.textContent = "Connected. Swap integration can use this wallet session next.";
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
    walletMessage.textContent = "Install MetaMask, Coinbase Wallet, Trust Wallet, or another EVM wallet to connect.";
    return;
  }

  try {
    walletMessage.textContent = "Waiting for wallet approval...";
    const accounts = await provider.request({ method: "eth_requestAccounts" });
    if (!accounts?.[0]) {
      walletMessage.textContent = "No wallet account was selected.";
      return;
    }

    await requestBaseNetwork(provider);
    setConnected(accounts[0]);
  } catch (error) {
    walletMessage.textContent = error?.code === 4001
      ? "Connection request cancelled."
      : "Wallet connection was not completed.";
  }
}

copyButton.addEventListener("click", copyContract);
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
    walletStatus.textContent = "Not connected";
    document.querySelector("#panelConnect").textContent = "Connect Wallet";
    walletMessage.textContent = "No transaction will be requested.";
  });
}
