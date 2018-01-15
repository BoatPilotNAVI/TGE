const Storage = require("../lib/storage.js");

// Подключение смарт контрактов
const BurnableCrowdsaleToken = artifacts.require("./token/BurnableCrowdsaleToken.sol");
const AllocatedRefundableCappedCrowdsale = artifacts.require("./RefundableAllocatedCappedCrowdsale.sol");

module.exports = function (deployer, network, accounts) {

    // Storage.setDevMode({
    //    ownerAddress : accounts[0],
    //    destinationWalletAddress : accounts[9],
    //
    //    advisorsAccountAddress : accounts[5],
    //    marketingAccountAddress : accounts[6],
    //    supportAccountAddress : accounts[7],
    //    teamAccountAddress : accounts[8]
    // });

    Storage.setProdMode({
        ownerAddress : "0x00fdCd75E8E070052eF194eC2025b376A2001644",

        //!!!Поменять!!!
        destinationWalletAddress : "0x908d9c592c5204c999e59bf3468e35b034863413",

        advisorsAccountAddress : "0x318907BD8463D9a22e297B065C4Bd405c180e8e0",
        marketingAccountAddress : "0xE6A8068C33b3B747EeD514Bd79f8B9235EB179Ef",
        supportAccountAddress : "0xfDBbFB26B73fb17D3988CaeF0642c3B51f80ABce",
        teamAccountAddress : "0xE0d4CEb6b23e3DfbAfd972C15725e22b74e664AF"
    });

    const symbol = Storage.tokenSymbol;
    const name = Storage.tokenName;
    const decimals = Storage.tokenDecimals;

    // Даты начала и окончания продаж
    const firstStageDateStartTimestamp = Storage.firstStageDateStartTimestamp;
    const firstStageDateEndTimestamp = Storage.firstStageDateEndTimestamp;

    const secondStageDateStartTimestamp = Storage.secondStageDateStartTimestamp;
    const secondStageDateEndTimestamp = Storage.secondStageDateEndTimestamp;

    const advisorsAccountAddress = Storage.advisorsAccountAddress;
    const marketingAccountAddress = Storage.marketingAccountAddress;
    const supportAccountAddress = Storage.supportAccountAddress;
    const teamAccountAddress = Storage.teamAccountAddress;

    const teamTokensIssueDateTimestamp = Storage.teamTokensIssueDateTimestamp;

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