import * as networkService from "./services/networkService";
import { getWeb3Instance } from "./services/web3Service"
import AppConfig from "./configs/app";
import EnvConfig from "./configs/env";

$(function () {
  var account;
  initiateProject();

  function initiateProject() {
    const defaultSrcSymbol = EnvConfig.TOKENS[0].symbol;
    const defaultDestSymbol = EnvConfig.TOKENS[1].symbol;

    initiateDropdown();
    initiateSelectedToken(defaultSrcSymbol, defaultDestSymbol);
    initiateDefaultRate(defaultSrcSymbol, defaultDestSymbol);
    initiateNativeSymbol();

    setInterval(fetchExchangeRate, 10000);
  }

  function initiateDropdown() {
    let dropdownTokens = '';

    EnvConfig.TOKENS.forEach((token) => {
      dropdownTokens += `<div class="dropdown__item">${token.symbol}</div>`;
    });

    $('.dropdown__content').html(dropdownTokens);
  }

  function initiateSelectedToken(srcSymbol, destSymbol) {
    $('#selected-src-symbol').html(srcSymbol);
    $('#selected-dest-symbol').html(destSymbol);
    $('#rate-src-symbol').html(srcSymbol);
    $('#rate-dest-symbol').html(destSymbol);
    $('#selected-transfer-token').html(srcSymbol);
  }

  function initiateDefaultRate(srcSymbol, destSymbol) {
    const srcToken = findTokenBySymbol(srcSymbol);
    const destToken = findTokenBySymbol(destSymbol);

    networkService.getExchangeRate(srcToken.address, destToken.address, 1).then((result) => {
      $('#exchange-rate').html(result);
    }).catch((error) => {
      console.log(error);
      $('#exchange-rate').html("err");
    });
  }

  function initiateNativeSymbol() {
    let nativeSymbol;
    EnvConfig.TOKENS.forEach((token) => {
      if (token.address == AppConfig.NATIVE_TOKEN_ADDRESS) {
        nativeSymbol = token.symbol;
      }
    });
    if (nativeSymbol) {
      $('#native-symbol').html(nativeSymbol);
    }
  }

  function fetchExchangeRate() {
    const srcSymbol = $('#selected-src-symbol').html();
    const destSymbol = $('#selected-dest-symbol').html();
    const srcToken = findTokenBySymbol(srcSymbol);
    const destToken = findTokenBySymbol(destSymbol);
    const srcAmountRaw = $('#swap-src-amount').val();

    if (srcAmountRaw === "") {
      initiateDefaultRate(srcSymbol, destSymbol);
      $('#swap-dest-amount').html("0");
      $('#swap-button').addClass('button--inactive');
      return;
    }
    networkService.getExchangeRate(srcToken.address, destToken.address, srcAmountRaw).then((result) => {
      $('#exchange-rate').html(result);
      $('#swap-dest-amount').html(parseFloat(srcAmountRaw) * result);
      if (result == 0) {
        $('#swap-button').addClass('button--inactive');
      } else if (account) {
        $('#swap-button').removeClass('button--inactive');
      }
    }).catch((error) => {
      console.log(error);
      $('#exchange-rate').html("err");
      $('#swap-button').addClass('button--inactive');
    });
  }

  function findTokenBySymbol(symbol) {
    return EnvConfig.TOKENS.find(token => token.symbol === symbol);
  }

  function normalizeSrcAmountInput(srcAmount) {
    return srcAmount.replace(/[^0-9.]/g, '').replace( /^([^.]*\.)(.*)$/, (a, b, c) => {
      return b + c.replace(/\./g, '');
    });
  }

  function validateAddress(address) {
    return getWeb3Instance().utils.isAddress(address);
  }

  // Tab Processing
  $('.tab__item').on('click', function () {
    const contentId = $(this).data('content-id');
    $('.tab__item').removeClass('tab__item--active');
    $(this).addClass('tab__item--active');

    if (contentId === 'swap') {
      $('#swap').addClass('active');
      $('#transfer').removeClass('active');
    } else {
      $('#transfer').addClass('active');
      $('#swap').removeClass('active');
    }
  });

  // Dropdown Processing
  $('.dropdown__trigger').on('click', function () {
    $(this).parent().toggleClass('dropdown--active');
  });

  // On changing token from dropdown.
  $(document).on('click', '.dropdown__item', function () {
    const selectedSymbol = $(this).html();
    $(this).parent().siblings('.dropdown__trigger').find('.selected-target').html(selectedSymbol);
    $(this).parents('.dropdown').removeClass('dropdown--active');

    const srcSymbol = $('#selected-src-symbol').html();
    const destSymbol = $('#selected-dest-symbol').html();

    $('#rate-src-symbol').html(srcSymbol);
    $('#rate-dest-symbol').html(destSymbol);
    initiateDefaultRate(srcSymbol, destSymbol);

    $('#swap-src-amount').val("");
    $('#swap-dest-amount').html("0");
    $('#swap-button').addClass('button--inactive');
  });

  // Handle on Source Amount Changed
  $('#swap-src-amount').on('input change', function () {
    const normalizedInput = normalizeSrcAmountInput($(this).val());
    $(this).val(normalizedInput);
    fetchExchangeRate();
  });

  // On swap icon clicked
  $('.swap__icon').on('click', function () {
    const oldSrcSymbol = $('#selected-src-symbol').html();
    const oldDestSymbol = $('#selected-dest-symbol').html();

    $('#selected-src-symbol').html(oldDestSymbol);
    $('#selected-dest-symbol').html(oldSrcSymbol);

    $('#rate-src-symbol').html(oldDestSymbol);
    $('#rate-dest-symbol').html(oldSrcSymbol);
    initiateDefaultRate(oldDestSymbol, oldSrcSymbol);

    $('#swap-src-amount').val("");
    $('#swap-dest-amount').html("0");
    $('#swap-button').addClass('button--inactive');
  });

  // Handle on Swap button clicked
  $('#swap-button').on('click', function () {
    const srcSymbol = $('#selected-src-symbol').html();
    const destSymbol = $('#selected-dest-symbol').html();
    $('#confirm-src-symbol').html(srcSymbol);
    $('#confirm-dest-symbol').html(destSymbol);
    $('#confirm-rate-src-symbol').html(srcSymbol);
    $('#confirm-rate-dest-symbol').html(destSymbol);

    const srcAmount = $('#swap-src-amount').val();
    $('#confirm-src-amount').html(srcAmount);
    $('#confirm-dest-amount').html($('#swap-dest-amount').html());

    $('#confirm-rate').html($('#exchange-rate').html());

    const srcToken = findTokenBySymbol(srcSymbol);
    const destToken = findTokenBySymbol(destSymbol);
    networkService.estimateSwapFee(srcToken.address, destToken.address, srcAmount, account).then((fee) => {
      $('#estimated-fee').html(fee);
    }).catch((error) => {
      console.log(error);
      $('#estimated-fee').html('err');
    });

    $('#approve-button').addClass('button--inactive');
    $('#confirm-swap-button').addClass('button--inactive');
    if (srcToken.address != AppConfig.NATIVE_TOKEN_ADDRESS) {
      networkService.getAllowance(srcToken.address, account, EnvConfig.EXCHANGE_CONTRACT_ADDRESS).then((allowance) => {
        if (allowance >= srcAmount) {
          $('#approve-button').addClass('button--inactive');
          $('#confirm-swap-button').removeClass('button--inactive');
        } else {
          $('#approve-button').removeClass('button--inactive');
          $('#confirm-swap-button').addClass('button--inactive');
        }
      }).catch((error) => {
        console.log(error);
        $('#confirm-swap-modal').removeClass('modal--active');
        $.notify('Prepare for transaction failed, please try again!', 'error');
      })
    } else {
      $('#approve-button').addClass('button--inactive');
      $('#confirm-swap-button').removeClass('button--inactive');
    }

    $('#confirm-swap-modal').addClass('modal--active');
  });

  // Handle on Approve button clicked
  $('#approve-button').on('click', function () {
    const srcSymbol = $('#confirm-src-symbol').html();
    const srcToken = findTokenBySymbol(srcSymbol);
    networkService.approve(srcToken.address, account, EnvConfig.EXCHANGE_CONTRACT_ADDRESS).then((txhash) => {
      $.notify(`Transaction submitted: ${txhash}`, 'info');
    }).catch((error) => {
      console.log(error);
      $.notify('Transaction failed!', 'error');
    });
  });

  // Handle on Confirm Swap button clicked
  $('#confirm-swap-button').on('click', function () {
    const srcSymbol = $('#confirm-src-symbol').html();
    const destSymbol = $('#confirm-dest-symbol').html();
    const srcToken = findTokenBySymbol(srcSymbol);
    const destToken = findTokenBySymbol(destSymbol);
    const srcAmountRaw = $('#confirm-src-amount').html();

    networkService.exchange(srcToken.address, destToken.address, srcAmountRaw, account).then((txhash) => {
      $('#confirm-swap-modal').removeClass('modal--active');

      initiateDefaultRate(srcSymbol, destSymbol);
      $('#swap-src-amount').val("");
      $('#swap-dest-amount').html("0");
      $('#swap-button').addClass('button--inactive');

      $.notify(`Transaction submitted: ${txhash}`, 'info');
    }).catch((error) => {
      console.log(error);
      $.notify('Transaction failed!', 'error');
    });
  });

  // Close Modal
  $('.modal').on('click', function (e) {
    if(e.target !== this ) return;
    $(this).removeClass('modal--active');
  });

  // Handle on transfer amount changed
  $('#transfer-src-amount').on('input change', function () {
    const normalizedInput = normalizeSrcAmountInput($(this).val());
    $(this).val(normalizedInput);

    if (parseFloat(normalizedInput) && validateAddress($('#transfer-address').val()) && account) {
      $('#transfer-button').removeClass('button--inactive');
    } else {
      $('#transfer-button').addClass('button--inactive');
    }
  });

  // Handle on transfer address changed
  $('#transfer-address').on('input change', function () {
    const isAddressValid = validateAddress($(this).val());
    if (isAddressValid) {
      $('#transfer-address').removeClass('input-item--invalid');
      if (parseFloat($('#transfer-src-amount').val()) && account) {
        $('#transfer-button').removeClass('button--inactive');
      } else {
        $('#transfer-button').addClass('button--inactive');
      }
    } else {
      $('#transfer-address').addClass('input-item--invalid');
      $('#transfer-button').addClass('button--inactive');
    }
  });

  // Handle on Transfer button clicked
  $('#transfer-button').on('click', function () {
    const srcSymbol = $('#selected-transfer-token').html();
    const srcToken = findTokenBySymbol(srcSymbol);
    networkService.transfer(
      srcToken.address, account, $('#transfer-address').val(), $('#transfer-src-amount').val()
    ).then((txhash) => {
      $('#transfer-src-amount').val("");
      $('#transfer-button').addClass('button--inactive');
      $.notify(`Transaction submitted: ${txhash}`, 'info');
    }).catch((error) => {
      console.log(error);
      $.notify('Transaction failed!', 'error');
    });
  });

  // Import Metamask
  $('#import-metamask').on('click', function () {
    $('.connected-account').removeClass('connected-account--active');
    ethereum.request({method: 'eth_requestAccounts'}).then(accounts => {
      account = accounts[0];
      $('#connected-account-address').html(account);
      $('.connected-account').addClass('connected-account--active');

      if ($('#swap-dest-amount').html() != 0) {
        $('#swap-button').removeClass('button--inactive');
      }

      if (parseFloat($('#transfer-src-amount').val()) && $('#transfer-address').val()) {
        $('#transfer-button').removeClass('button--inactive');
      }
    }).catch((error) => {
      console.log(error);
    });
  });
});
