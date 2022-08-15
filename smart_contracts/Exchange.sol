pragma solidity ^0.4.17;

import "./Reserve.sol";


contract Exchange {
    function() external payable {}

    address constant NATIVE_TOKEN_ADDRESS = 0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee;

    address owner;
    mapping(address => Reserve) reserves;

    function Exchange() public {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    function addReserve(Token token, Reserve reserve) external onlyOwner {
        require(token == reserve.reservedToken());
        reserves[token] = reserve;
        token.approve(reserve, 2**256 - 1);
    }

    function removeReserve(Token token) external onlyOwner {
        token.approve(reserves[token], 0);
        delete reserves[token];
    }

    // rate = x => spend 1 srcToken to buy x dstToken
    function getExchangeRate(address srcToken, address dstToken, uint srcTokenAmount) public view returns(uint) {
        require(srcToken != dstToken);
        uint sellRate;

        if (srcToken == NATIVE_TOKEN_ADDRESS) {
            return reserves[dstToken].getBuyRate(srcTokenAmount);
        } else if (dstToken == NATIVE_TOKEN_ADDRESS) {
            sellRate = reserves[srcToken].getSellRate(srcTokenAmount);
            return sellRate == 0 ? 0 : 1e36 / sellRate;
        }

        sellRate = reserves[srcToken].getSellRate(srcTokenAmount);
        uint srcNativeRate = sellRate == 0 ? 0 : 1e36 / sellRate;
        if (srcNativeRate == 0) return 0;

        uint nativeTokenAmount = reserves[srcToken].convertReservedToNativeTokenAmount(srcTokenAmount);
        uint nativeDstRate = reserves[dstToken].getBuyRate(nativeTokenAmount);
        if (nativeDstRate == 0) return 0;

        return (srcNativeRate * nativeDstRate) / 1e18;
    }

    event Exchanged(address indexed user,
                    address indexed srcToken, address indexed dstToken,
                    uint srcTokenAmount, uint dstTokenAmount);

    function exchange(Token srcToken, Token dstToken, uint srcTokenAmount) external payable {
        require(srcToken != dstToken);
        require(getExchangeRate(srcToken, dstToken, srcTokenAmount) > 0);
        uint dstTokenAmount;

        if (srcToken == NATIVE_TOKEN_ADDRESS) {
            require(msg.value == srcTokenAmount);
            reserves[dstToken].buy.value(srcTokenAmount)(srcTokenAmount);
            dstTokenAmount = reserves[dstToken].convertNativeToReservedTokenAmount(srcTokenAmount);
            dstToken.transfer(msg.sender, dstTokenAmount);
        } else if (dstToken == NATIVE_TOKEN_ADDRESS) {
            srcToken.transferFrom(msg.sender, this, srcTokenAmount);
            reserves[srcToken].sell(srcTokenAmount);
            dstTokenAmount = reserves[srcToken].convertReservedToNativeTokenAmount(srcTokenAmount);
            msg.sender.transfer(dstTokenAmount);
        } else {
            srcToken.transferFrom(msg.sender, this, srcTokenAmount);
            reserves[srcToken].sell(srcTokenAmount);
            uint nativeTokenAmount = reserves[srcToken].convertReservedToNativeTokenAmount(srcTokenAmount);
            reserves[dstToken].buy.value(nativeTokenAmount)(nativeTokenAmount);
            dstTokenAmount = reserves[dstToken].convertNativeToReservedTokenAmount(nativeTokenAmount);
            dstToken.transfer(msg.sender, dstTokenAmount);
        }

        Exchanged(msg.sender, srcToken, dstToken, srcTokenAmount, dstTokenAmount);
    }
}

// owner: 0x3d10B2F011a3925FA342866766aa0716ea191401
// TOKA: 0x53CDeD0E17950C6A9Afa7970EE36bDA9e60cC5E6
// TOKB: 0xC3aFe9Cde75065064F99290B3323fC2691De186e
// reserve A: 0xB38511CF582C3573dDcfacA8D7867256ecf412f4
// reserve B: 0xBFf0DCF9804235f0be0161b1290104BD90B0F13D
// exchange: 0x4c2CCeF22E167d546b983bf52071f1eDEB034BBc
