import * as web3Service from "./web3Service";
import AppConfig from "../configs/app";

/* Get Exchange Rate from Smart Contract */
export function getExchangeRate(srcTokenAddress, destTokenAddress, srcAmount) {
  return new Promise((resolve, reject) => {
    const exchangeContract = web3Service.getExchangeContract();
    const srcAmountString = (srcAmount * 1e18).toString();
    exchangeContract.methods.getExchangeRate(srcTokenAddress, destTokenAddress, srcAmountString).call().then((result) => {
      resolve(result / 1e18);
    }).catch((error) => {
      reject(error);
    });
  });
}

export function getAllowance(tokenAddress, owner, spender) {
  return new Promise((resolve, reject) => {
    const tokenContract = web3Service.getTokenContract(tokenAddress);
    tokenContract.methods.allowance(owner, spender).call().then((result) => {
      resolve(result / 1e18);
    }).catch((error) => {
      reject(error);
    });
  });
}

export function approve(tokenAddress, owner, spender) {
  return new Promise((resolve, reject) => {
    ethereum.request({
      method: 'eth_sendTransaction',
      params: [{
        from: owner,
        to: tokenAddress,
        data: web3Service.getTokenContract(tokenAddress).methods.approve(
          spender, "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff").encodeABI()
      }]
    }).then(txhash => {
      resolve(txhash);
    }).catch((error) => {
      reject(error);
    });
  });
}

export function transfer(tokenAddress, from, to, amount) {
  return new Promise((resolve, reject) => {
    let params;
    if (tokenAddress == AppConfig.NATIVE_TOKEN_ADDRESS) {
      params = [{
        from: from,
        to: to,
        value: (amount * 1e18).toString(16)
      }];
    } else {
      params = [{
        from: from,
        to: tokenAddress,
        data: web3Service.getTokenContract(tokenAddress).methods.transfer(to, (amount * 1e18).toString()).encodeABI()
      }];
    }

    ethereum.request({
      method: 'eth_sendTransaction',
      params: params
    }).then((txhash) => {
      resolve(txhash);
    }).catch((error) => {
      reject(error);
    });
  });
}

export function estimateSwapFee(srcTokenAddress, destTokenAddress, srcAmount, account) {
  return new Promise((resolve, reject) => {
    const web3 = web3Service.getWeb3Instance();
    web3.eth.getGasPrice().then((gasPrice) => {
      const exchangeContract = web3Service.getExchangeContract();
      const srcAmountString = (srcAmount * 1e18).toString();
      exchangeContract.methods.exchange(srcTokenAddress, destTokenAddress, srcAmountString).estimateGas(
        {from: account, value: (srcTokenAddress == AppConfig.NATIVE_TOKEN_ADDRESS) ? srcAmountString : 0}
      ).then((gas) => {
        resolve(parseFloat(((gasPrice / 1e18) * gas).toFixed(18)));
      }).catch((error) => {
        reject(error);
      });
    }).catch((error) => {
      reject(error);
    });
  });
}

export function exchange(srcTokenAddress, destTokenAddress, srcAmount, account) {
  return new Promise((resolve, reject) => {
    const exchangeContract = web3Service.getExchangeContract();

    const srcAmountString = (srcAmount * 1e18).toString();
    const srcAmountStringHex = (srcAmount * 1e18).toString(16);

    ethereum.request({
      method: 'eth_sendTransaction',
      params: [{
        from: account,
        to: exchangeContract.options.address,
        value: (srcTokenAddress == AppConfig.NATIVE_TOKEN_ADDRESS) ? srcAmountStringHex : '0x0',
        data: exchangeContract.methods.exchange(srcTokenAddress, destTokenAddress, srcAmountString).encodeABI()
      }]
    }).then(txhash => {
      resolve(txhash);
    }).catch((error) => {
      reject(error);
    });
  });
}
