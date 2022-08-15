pragma solidity ^0.4.17;

import "./Token.sol";


contract Reserve {
    function() external payable {}

    address owner;
    Token public reservedToken;
    uint buyRate;  // buyRate = x => spend 1 native token to buy x reserved token
    uint sellRate;  // sellRate = x => sell x reserved token to get 1 native token

    function Reserve(Token _reservedToken, uint _buyRate, uint _sellRate) public {
        require(_buyRate > 0);
        require(_sellRate > 0);

        owner = msg.sender;
        reservedToken = _reservedToken;
        buyRate = _buyRate;
        sellRate = _sellRate;
    }

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    function getNativeTokenFund() public view returns(uint) {
        return this.balance;
    }

    function getReservedTokenFund() public view returns(uint) {
        return reservedToken.balanceOf(this);
    }

    function convertNativeToReservedTokenAmount(uint nativeTokenAmount) public view returns(uint) {
        return (nativeTokenAmount * buyRate) / 1e18;
    }

    function convertReservedToNativeTokenAmount(uint reservedTokenAmount) public view returns(uint) {
        return (reservedTokenAmount * 1e18) / sellRate;
    }

    function getBuyRate(uint nativeTokenAmount) public view returns(uint) {
        uint reservedTokenAmount = convertNativeToReservedTokenAmount(nativeTokenAmount);
        return 0 < reservedTokenAmount && reservedTokenAmount <= getReservedTokenFund() ? buyRate : 0;
    }

    function getSellRate(uint reservedTokenAmount) public view returns(uint) {
        uint nativeTokenAmount = convertReservedToNativeTokenAmount(reservedTokenAmount);
        return 0 < nativeTokenAmount && nativeTokenAmount <= getNativeTokenFund() ? sellRate : 0;
    }

    function setExchangeRates(uint _buyRate, uint _sellRate) external onlyOwner {
        require(_buyRate > 0);
        require(_sellRate > 0);

        buyRate = _buyRate;
        sellRate = _sellRate;
    }

    function buy(uint nativeTokenAmount) external payable {
        require(getBuyRate(nativeTokenAmount) == buyRate);
        require(msg.value == nativeTokenAmount);
        uint reservedTokenAmount = convertNativeToReservedTokenAmount(nativeTokenAmount);
        reservedToken.transfer(msg.sender, reservedTokenAmount);
    }

    function sell(uint reservedTokenAmount) external {
        require(getSellRate(reservedTokenAmount) == sellRate);
        reservedToken.transferFrom(msg.sender, this, reservedTokenAmount);
        uint nativeTokenAmount = convertReservedToNativeTokenAmount(reservedTokenAmount);
        msg.sender.transfer(nativeTokenAmount);
    }

    function withdrawNativeToken(uint amount, address destination) external onlyOwner {
        destination.transfer(amount);
    }

    function withdrawReservedToken(uint amount, address destination) external onlyOwner {
        reservedToken.transfer(destination, amount);
    }
}
