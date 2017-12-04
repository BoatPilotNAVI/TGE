const Storage = require("../lib/storage.js");

const BurnableCrowdsaleToken = artifacts.require("./token/BurnableCrowdsaleToken.sol");
const AllocatedRefundableCappedCrowdsale = artifacts.require("./RefundableAllocatedCappedCrowdsale.sol");

module.exports = function (deployer, network, accounts) {

    const ownerAddress = Storage.ownerAddress;

    // Устанавливаем того, кто может уничтожить токены
    let burnableCrowdsaleTokenInstance = null;

    BurnableCrowdsaleToken.deployed().then((instance) => {
        burnableCrowdsaleTokenInstance = instance;

        return burnableCrowdsaleTokenInstance.setMintAgent(AllocatedRefundableCappedCrowdsale.address, {from: ownerAddress});
    }).then((result) => {
        return burnableCrowdsaleTokenInstance.setOwnerBurner(AllocatedRefundableCappedCrowdsale.address, {from : ownerAddress});
    });

    // Начинаем первую стадию
    AllocatedRefundableCappedCrowdsale.deployed().then((instance) => {
        return instance.mintTokensForFirstStage({from : ownerAddress});
    });


};