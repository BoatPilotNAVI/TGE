const Storage = require("../lib/storage.js");

// Подключение смарт контрактов
const BurnableCrowdsaleToken = artifacts.require("./token/BurnableCrowdsaleToken.sol");
const AllocatedRefundableCappedCrowdsale = artifacts.require("./RefundableAllocatedCappedCrowdsale.sol");

module.exports = function (deployer, network, accounts) {

    Storage.setProdMode({
        ownerAddress : "0xd794763E54EeCb87A7879147b5A17BfA6663a33C",
        destinationWalletAddress : "0x640F92b14FfEaA6b1fB13B7385929c38D41090E8",

        advisorsAccountAddress : "0x528b0BE8b7dc9bDC61CDd1379Aa2c0769a10f2dd",
        marketingAccountAddress : "0xa03430C31903447E2c6F2b84E60d183De62faAA6",
        supportAccountAddress : "0xB3B778A62EAdF1D2C88c64E820D43EAF6ACf49f8",
        teamAccountAddress : "0x06553D1befb814f44f2E6aa26e36a43819C2f18E"
    });

    //Storage.setProdMode();

    const symbol = Storage.tokenSymbol;
    const name = Storage.tokenName;
    const decimals = Storage.tokenDecimals;
    const oneTokenInCents = Storage.oneTokenInCents;

    // Даты начала и окончания продаж
    const firstStageDateStartTimestamp = Storage.firstStageDateStartTimestamp;
    const firstStageDateEndTimestamp = Storage.firstStageDateEndTimestamp;

    const secondStageDateStartTimestamp = Storage.secondStageDateStartTimestamp;
    const secondStageDateEndTimestamp = Storage.secondStageDateEndTimestamp;

    const softCapGoalInCents = Storage.softCapGoalInCents;
    const hardCapGoalInCents = Storage.hardCapGoalInCents;

    const advisorsAccountAddress = Storage.advisorsAccountAddress;
    const marketingAccountAddress = Storage.marketingAccountAddress;
    const supportAccountAddress = Storage.supportAccountAddress;
    const teamAccountAddress = Storage.teamAccountAddress;

    const advisorsTokensAmount = Storage.advisorsTokensAmount;
    const marketingTokensAmount = Storage.marketingTokensAmount;
    const supportTokensAmount = Storage.supportTokensAmount;
    const teamTokensAmount = Storage.teamTokensAmount;
    const teamTokensIssueDateTimestamp = Storage.teamTokensIssueDateTimestamp;

    const firstStageTotalSupply = Storage.firstStageTotalSupply;
    const secondStageTotalSupply = Storage.secondStageTotalSupply;
    const secondStageReserve = Storage.secondStageReserve;
    const currentEtherRateInCents = Storage.etherRateInCents;

    const destinationWalletAddress = Storage.destinationWalletAddress;

    //
    // Деплой
    // Контракт токена
    return deployer.deploy(BurnableCrowdsaleToken, name, symbol, decimals).then(() => {
        // Контракт продаж
        return deployer.deploy(AllocatedRefundableCappedCrowdsale,
            currentEtherRateInCents,

            BurnableCrowdsaleToken.address,

            destinationWalletAddress,

            firstStageDateStartTimestamp, firstStageDateEndTimestamp,
            secondStageDateStartTimestamp, secondStageDateEndTimestamp,

            advisorsAccountAddress,
            marketingAccountAddress,
            supportAccountAddress,
            teamAccountAddress,

            teamTokensIssueDateTimestamp
        );
    });

};