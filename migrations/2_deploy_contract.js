const Storage = require("../lib/storage.js");

// Подключение смарт контрактов
const BurnableCrowdsaleToken = artifacts.require("./token/BurnableCrowdsaleToken.sol");
const AllocatedRefundableCappedCrowdsale = artifacts.require("./RefundableAllocatedCappedCrowdsale.sol");

module.exports = function (deployer, network, accounts) {

    Storage.setDevMode({
        ownerAddress : accounts[0],
        destinationWalletAddress : accounts[9],

        advisorsAccountAddress : accounts[5],
        marketingAccountAddress : accounts[6],
        supportAccountAddress : accounts[7],
        teamAccountAddress : accounts[8],
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