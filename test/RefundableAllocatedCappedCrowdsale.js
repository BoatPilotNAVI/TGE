const Constant = require("../lib/constant.js");
const TestUtil = require("../lib/testUtil.js");
const StringUtil = require("string-format");
const Converter = require("../lib/converter.js");
const Storage = require("../lib/storage.js");

const BurnableCrowdsaleToken = artifacts.require("./token/BurnableCrowdsaleToken.sol");
const FundsVault = artifacts.require("./vault/FundsVault.sol");
const AllocatedRefundableCappedCrowdsale = artifacts.require("./RefundableAllocatedCappedCrowdsale.sol");

// enum State{PreFunding, FirstStageFunding, FirstStageEnd, SecondStageFunding, SecondStageEnd, Success, Failure, Refunding}
const saleStates = {
    preFunding: 0,
    firstStageFunding : 1,
    firstStageEnd : 2,
    secondStageFunding : 3,
    secondStageEnd : 4,
    success : 5,
    failure : 6,
    refunding : 7
};

const scenarioTypes = {
    haltToggle : 0,
    firstStageSoftCapReached : 1,
    firstStagePreallocate : 2,
    secondStageHardCapReached : 3,
    secondStageSoftCapNotReached : 4,
    secondStagePreallocateToSoftCap : 5,
    secondStageSoftCapReached : 6,
    secondStageSoftCapNotReachedRefund : 7,

    onlyOneSecondStagePurchase : 8,

    successFinished : 9,

    checkExternalBuy : 10
};

// Преобразование состояния в строку
let salesStateStr = {};
salesStateStr[saleStates.preFunding] = 'PreFunding';
salesStateStr[saleStates.firstStageFunding] = 'FirstStageFunding';
salesStateStr[saleStates.firstStageEnd] = 'FirstStageEnd';
salesStateStr[saleStates.secondStageFunding ] = 'SecondStageFunding';
salesStateStr[saleStates.secondStageEnd] = 'SecondStageEnd';
salesStateStr[saleStates.success] = 'Success';
salesStateStr[saleStates.failure] = 'Failure';
salesStateStr[saleStates.refunding] = 'Refunding';

// Подключаем форматирование строк
StringUtil.extend(String.prototype);

//Варианты сценариев

// Сценарий остановки/возобнавления продаж, ничего не попокупали на первой стадии, затем на второй стадии сразу перевели 1050000000 центов, проверили бонус, достигли Hard Cap,
// успешно завершили продажи
//let scenario = [scenarioTypes.haltToggle, scenarioTypes.onlyOneSecondStagePurchase, scenarioTypes.successFinished];

// Сценарий остановки/возобнавления продаж, немного попокупали на первой стадии, проверили выдачу бонусов, затем на второй стадии, проверили бонусы, достигли Hard Cap,
// успешно завершили продажи
//let scenario = [scenarioTypes.haltToggle, scenarioTypes.secondStageHardCapReached, scenarioTypes.successFinished];

// Сценарий остановки/возобнавления продаж, немного попокупали на первой стадии, сделали покупку через внешнюю функцию, проверили бонусы, затем не достигли Soft Cap, догнали на второй стадии методом preallocateSecondStage до Soft Cap,
// успешно завершили продажи
//let scenario = [scenarioTypes.haltToggle, scenarioTypes.checkExternalBuy, scenarioTypes.secondStageSoftCapNotReached, scenarioTypes.secondStagePreallocateToSoftCap, scenarioTypes.successFinished];

// Сценарий остановки/возобнавления продаж, немного попокупали на первой стадии, проверили бонусы, затем не достигли Soft Cap, догнали на второй стадии методом preallocateSecondStage до Soft Cap,
// успешно завершили продажи
//let scenario = [scenarioTypes.haltToggle, scenarioTypes.firstStagePreallocate, scenarioTypes.secondStageSoftCapNotReached, scenarioTypes.secondStagePreallocateToSoftCap, scenarioTypes.successFinished];

// Сценарий остановки/возобнавления продаж, немного попокупали на первой стадии, проверили бонусы, затем не достигли Soft Cap, при финализации второй, провели возврат средств
// также проверили, что при переводе с аккаунта на аккаунт полученных токенов (спекуляция), возврат производиться не будет
//let scenario = [scenarioTypes.haltToggle, scenarioTypes.secondStageSoftCapNotReached, scenarioTypes.secondStageSoftCapNotReachedRefund];

// Сценарий остановки/возобнавления продаж, затем достигли Soft Cap на первой стадии, проверили бонусы, завершили вторую, успешно закончили продажи
//let scenario = [scenarioTypes.haltToggle, scenarioTypes.firstStageSoftCapReached, scenarioTypes.secondStageSoftCapReached, scenarioTypes.successFinished];

// Сценарий остановки/возобнавления продаж, затем достигли Soft Cap на первой стадии, с помощью функции догона статы, проверили бонусы, завершили вторую, успешно закончили продажи
let scenario = [scenarioTypes.haltToggle, scenarioTypes.firstStagePreallocate, scenarioTypes.firstStageSoftCapReached, scenarioTypes.secondStageSoftCapReached, scenarioTypes.successFinished];

function inScenario(description, value){
    return scenario.indexOf(value) != -1;
};

it("Запуск", function(){
});

contract('AllocatedRefundableCappedCrowdsale', async function(accounts) {
    let token = await BurnableCrowdsaleToken.deployed();
    let sale = await AllocatedRefundableCappedCrowdsale.deployed();
    let ownerAccount = accounts[0];

    const promisify = (inner) => new Promise((resolve, reject) =>
        inner((err, res) => {
            if (err) {
                reject(err);
            };
            resolve(res);
        })
    );

    function centsToWei(cents){
        let result = new web3.BigNumber(cents).mul(new web3.BigNumber(1000000000000000000)).div(Storage.etherRateInCents).ceil();

        return result.toString(10);
    };

    function weiToCents(wei){
        let result = new web3.BigNumber(wei).mul(new web3.BigNumber(Storage.etherRateInCents)).div(1000000000000000000).ceil();

        return result.toString(10);
    };

    function getNotOwnerAccountAddress(){
        let result = null;

        for(let accountIndex in accounts){
            if (accounts[accountIndex] != Storage.ownerAddress){
                return accounts[accountIndex];
            };
        };

        return result;
    };

    function checkFloatValuesEquality(val1, val2, epsilon){
        epsilon = epsilon || 0.001;

        let resultValue = (new web3.BigNumber(val1).minus(new web3.BigNumber(val2))).abs();

        return resultValue.lte(epsilon);
    };

    function sendEther(fromAccount, contractInstance, wei){
        // На всех аккаунтах по 100 эфира, 0 аккаунт - владелец
        // Пробуем перевести 1 эфир на контракт токена, с 1 - го аккаунта
        return new Promise(async (resolve, reject) => {
            try{
                let result = await contractInstance.sendTransaction({from: fromAccount, value : wei});

                resolve(null, result);

            }catch(ex){
                resolve(ex, null);
            };
        });
    };

    function sendExternalEther(fromAccount, contractInstance, toAccount, wei){
        return new Promise(async (resolve, reject) => {
            try{
                let result = await contractInstance.externalBuy(toAccount, wei, {from: fromAccount});

                resolve(null, result);

            }catch(ex){
                resolve(ex, null);
            };
        });
    };

    function sendEtherTo(toAccount, fromAccount, wei){
        return new Promise(async (resolve, reject) => {
            web3.eth.sendTransaction({from : fromAccount, to : toAccount, value : wei}, function(err, transactionHash) {
                if (err){
                    resolve(err, null);
                }else{
                    resolve(null, transactionHash);
                };
            });
        });
    };

    function callHalt(fromAccount){
        return new Promise(async (resolve, reject) => {

            try{
                await sale.halt({from: fromAccount});

                resolve(null, true);
            }catch(ex){
                resolve(ex, null);
            };
        });
    };

    function callHaltAndExpectError(fromAccount){
        return callHalt(fromAccount).then((err, success) => {
            assert.notEqual(err, null, 'Вызов halt() не владельцем должен возвращать ошибку');
        });
    };

    function callHaltAndExpectSuccess(fromAccount){
        return callHalt(fromAccount).then((err, success) => {
            assert.equal(err, null, 'Вызов halt() допускается только владельцем');
        });
    };

    function callPreallocateFirstStage(fromAccount, toAddress, tokens, wei){
        return new Promise(async (resolve, reject) => {

            try{
                await sale.preallocateFirstStage(toAddress, tokens, wei, {from: fromAccount});

                resolve(null, true);
            }catch(ex){
                resolve(ex, null);
            };
        });
    };

    function callPreallocateFirstStageAndExpectError(fromAccount, toAddress, tokens, wei){
        return callPreallocateFirstStage(fromAccount, toAddress, tokens, wei).then((err, success) => {
            assert.notEqual(err, null, 'Вызов PreallocateFirstStage должен возвращать ошибку');
        });
    };

    function callPreallocateFirstStageAndExpectSuccess(fromAccount, toAddress, tokens, wei){
        return callPreallocateFirstStage(fromAccount, toAddress, tokens, wei).then((err, success) => {
            assert.equal(err, null, 'Вызов PreallocateFirstStage должен пройти успешно');
        });
    };

    function callPreallocateSecondStage(fromAccount, toAddress, tokens, wei){
        return new Promise(async (resolve, reject) => {

            try{
                await sale.preallocateSecondStage(toAddress, tokens, wei, {from: fromAccount});

                resolve(null, true);
            }catch(ex){
                resolve(ex, null);
            };
        });
    };

    function callPreallocateSecondStageAndExpectError(fromAccount, toAddress, tokens, wei){
        return callPreallocateSecondStage(fromAccount, toAddress, tokens, wei).then((err, success) => {
            assert.notEqual(err, null, 'Вызов PreallocateSecondStage должен возвращать ошибку');
        });
    };

    function callPreallocateSecondStageAndExpectSuccess(fromAccount, toAddress, tokens, wei){
        return callPreallocateSecondStage(fromAccount, toAddress, tokens, wei).then((err, success) => {
            assert.equal(err, null, 'Вызов PreallocateSecondStage должен пройти успешно');
        });
    };

    function callUnhalt(fromAccount){
        return new Promise(async (resolve, reject) => {

            try{
                await sale.unhalt({from: fromAccount});

                resolve(null, true);
            }catch(ex){
                resolve(ex, null);
            };
        });
    };

    function callUnhaltAndExpectError(fromAccount){
        return callUnhalt(fromAccount).then((err, success) => {
            assert.notEqual(err, null, 'Вызов unhalt() не владельцем должен возвращать ошибку');
        });
    };

    function callUnhaltAndExpectSuccess(fromAccount){
        return callUnhalt(fromAccount).then((err, success) => {
            assert.equal(err, null, 'Вызов unhalt() допускается только владельцем');
        });
    };

    function callSetDestinationWallet(newAccount, fromAccount){
        return new Promise(async (resolve, reject) => {

            try{
                await sale.setDestinationMultisigWallet(newAccount, {from: fromAccount});

                resolve(null, true);
            }catch(ex){
                resolve(ex, null);
            };
        });
    };

    function callSetDestinationWalletAndExpectError(newAccount, fromAccount){
        return callSetDestinationWallet(newAccount, fromAccount).then((err, success) => {
            assert.notEqual(err, null, 'Вызов setDestinationMultisigWallet() должен возвращать ошибку');
        });
    };

    function callSetDestinationWalletAndExpectSuccess(newAccount, fromAccount){
        return callSetDestinationWallet(newAccount, fromAccount).then((err, success) => {
            assert.equal(err, null, 'Вызов setDestinationMultisigWallet() не должен возвращать ошибку');
        });
    };

    function sendEtherAndExpectError(fromAccount, contractAddress, wei){
        // На всех аккаунтах по 100 эфира, 0 аккаунт - владелец
        // Пробуем перевести 1 эфир на контракт токена, с 1 - го аккаунта
        return sendEther(fromAccount, contractAddress, wei).then((err , success) => {
            assert.notEqual(err, null, 'При переводе эфира на контракт должна возникать ошибка');
        });
    };

    function sendEtherAndExpectSuccess(fromAccount, contractInstance, wei){
        // На всех аккаунтах по 100 эфира, 0 аккаунт - владелец
        // Пробуем перевести 1 эфир на контракт токена, с 1 - го аккаунта
        return sendEther(fromAccount, contractInstance, wei).then(function(err , success) {
            assert.equal(err, null, 'При переводе эфира на контракт не должно возникать ошибки');
        });
    };

    function sendEtherExternalAndExpectSuccess(fromAccount, contractInstance, toAccount, wei){
        return sendExternalEther(fromAccount, contractInstance, toAccount, wei).then(function(err , success) {
            assert.equal(err, null, 'При переводе эфира через внешнюю функцию на контракт не должно возникать ошибки');
        });
    };

    function sendEtherExternalAndExpectError(fromAccount, contractInstance, toAccount, wei){
        return sendExternalEther(fromAccount, contractInstance, toAccount, wei).then(function(err , success) {
            assert.notEqual(err, null, 'При переводе эфира через внешнюю функцию на контракт должна возникать ошибка');
        });
    };

    function sendEtherToAndExpectSuccess(toAccount, fromAccount, wei){
        return sendEtherTo(toAccount, fromAccount, wei).then(function(err , success) {
            assert.equal(err, null, 'При переводе эфира на другой аккаунт не должно возникать ошибки');
        });
    };

    function callTokenTransfer(fromAccount, toAccount, amount){
        return new Promise(async (resolve, reject) => {
            try{
                let result = await token.transfer(toAccount, amount, {from: fromAccount});

                resolve(null, result);

            }catch(ex){
                resolve(ex, null);
            };
        });
    };

    function callTokenTransferAndExpectSuccess(fromAccount, toAccount, amount){
        return callTokenTransfer(fromAccount, toAccount, amount).then((err , success) => {
            assert.equal(err, null, 'При вызове метода перевода токенов, не должно возникать ошибки');
        });
    };

    function callTokenTransferAndExpectError(fromAccount, toAccount, amount){
        return callTokenTransfer(fromAccount, toAccount, amount).then((err , success) => {
            assert.notEqual(err, null, 'При вызове метода перевода токенов, должна возникать ошибка');
        });
    };

    function callRefund(fromAccount){
        return new Promise(async (resolve, reject) => {
            try{
                let result = await sale.refund({from: fromAccount});

                resolve(null, result);

            }catch(ex){
                resolve(ex, null);
            };
        });
    };

    function callRefundAndExpectSuccess(fromAccount){
        return callRefund(fromAccount).then((err , success) => {
            assert.equal(err, null, 'При вызове метода возврата средств, не должно возникать ошибки');
        });
    };

    function callRefundAndExpectError(fromAccount){
        return callRefund(fromAccount).then((err , success) => {
            assert.notEqual(err, null, 'При вызове метода возврата средств, должна возникать ошибка');
        });
    };

    function callEnableRedunds(fromAccount){
        return new Promise(async (resolve, reject) => {
            try{
                let result = await sale.enableRefunds({from: fromAccount});

                resolve(null, result);

            }catch(ex){
                resolve(ex, null);
            };
        });
    };

    function callEnableRefundsAndExpectSuccess(fromAccount){
        return callEnableRedunds(fromAccount).then((err , success) => {
            assert.equal(err, null, 'При вызове метода включения возврата средств, не должно возникать ошибки');
        });
    };

    function callEnableRefundsAndExpectError(fromAccount){
        return callEnableRedunds(fromAccount).then((err , success) => {
            assert.notEqual(err, null, 'При вызове метода включения возврата средств, должна возникать ошибка');
        });
    };

    function callFinalizeFirstStage(fromAccount){
        return new Promise(async (resolve, reject) => {
            try{
                let result = await sale.finalizeFirstStage({from: fromAccount});

                resolve(null, result);

            }catch(ex){
                resolve(ex, null);
            };
        });
    };

    function callFinalizeFirstStageAndExpectSuccess(fromAccount){
        return callFinalizeFirstStage(fromAccount).then((err , success) => {
            assert.equal(err, null, 'При вызове финализиации первой стадии, не должно возникать ошибки');
        });
    };

    function callFinalizeFirstStageAndExpectError(fromAccount){
        return callFinalizeFirstStage(fromAccount).then((err , success) => {
            assert.notEqual(err, null, 'При вызове финализиации первой стадии, должна возникать ошибка');
        });
    };

    function callIssueTeamTokens(fromAccount){
        return new Promise(async (resolve, reject) => {
            try{
                let result = await sale.issueTeamTokens({from: fromAccount});

                resolve(null, result);

            }catch(ex){
                resolve(ex, null);
            };
        });
    };

    function callIssueTeamTokensAndExpectSuccess(fromAccount){
        return callIssueTeamTokens(fromAccount).then((err , success) => {
            assert.equal(err, null, 'При вызове запроса токенов команды, не должно возникать ошибки');
        });
    };

    function callIssueTeamTokensAndExpectError(fromAccount){
        return callIssueTeamTokens(fromAccount).then((err , success) => {
            assert.notEqual(err, null, 'При вызове запроса токенов команды, должна возникать ошибка');
        });
    };

    function callFinalizeSecondStage(fromAccount){
        return new Promise(async (resolve, reject) => {
            try{
                let result = await sale.finalizeSecondStage({from: fromAccount});

                resolve(null, result);

            }catch(ex){
                resolve(ex, null);
            };
        });
    };

    function callFinalizeSecondStageAndExpectSuccess(fromAccount){
        return callFinalizeSecondStage(fromAccount).then((err , success) => {
            assert.equal(err, null, 'При вызове финализиации второй стадии, не должно возникать ошибки');
        });
    };

    function callFinalizeSecondStageAndExpectError(fromAccount){
        return callFinalizeSecondStage(fromAccount).then((err , success) => {
            assert.notEqual(err, null, 'При вызове финализиации второй стадии, должна возникать ошибка');
        });
    };

    async function checkSendEtherTo(toAccount, fromAccount, wei){
        await sendEtherToAndExpectSuccess(toAccount, fromAccount, wei);
    };

    async function checkNotAcceptEther(fromAccount, contractAddress, wei){
        await sendEtherAndExpectError(fromAccount, contractAddress, wei);
    };

    async function checkContractFallbackWithError(accountFrom, contractInstance){
        await sendEtherAndExpectError(accountFrom, contractInstance, web3.toWei(1, 'ether'));
    };

    async function checkSaleState(expectedState){
        let currentState = await sale.getState.call();
        assert.equal(currentState.valueOf(), expectedState, 'Cостояние должно быть {0}, текущее состояние: {1}'.format(salesStateStr[expectedState], salesStateStr[currentState.valueOf()]));
    };

    async function checkTokensSold(expectedValue){
        let tokensSoldCall = await sale.tokensSold.call();

        let result = checkFloatValuesEquality(tokensSoldCall.valueOf(), expectedValue, 2)

        assert.isTrue(result, 'Ожидаемое кол-во проданных токенов ({0}) не соответствует рассчитанному {1}'.format(tokensSoldCall.valueOf(), expectedValue));
    };

    async function checkAccountTokenBalance(account, expectedValue){
        let balanceCall = await token.balanceOf.call(account);

        assert.equal(balanceCall.valueOf(), expectedValue, 'Значение баланса аккаунта: {0} ({1}), не соответствует значению: {2}'.format(account, balanceCall.valueOf(), expectedValue));
    };

    async function checkRefund(fromAccount, expectedWeiAmount, weiEpsilon){
        let refundAccount = fromAccount;
        let balanceBefore = await getBalance(refundAccount);

        await callRefundAndExpectSuccess(refundAccount);
        let balanceAfter = await getBalance(refundAccount);

        let refundAmount = new web3.BigNumber(balanceAfter).minus(new web3.BigNumber(balanceBefore));
        let checkResult = checkFloatValuesEquality(refundAmount.valueOf(), expectedWeiAmount, weiEpsilon);

        assert.isTrue(checkResult, 'Возврат должен соответствовать переводу');
    };

    async function checkRefundWithError(account){
        await callRefundAndExpectError(account);
    };

    async function checkSendEther(fromAccount, wei){
        await sendEtherAndExpectSuccess(fromAccount, sale, wei);
    };

    async function checkSendEtherAndGetBonus(fromAccount, wei, expectedBonus){
        let oneTokenInWeiCall = await sale.getOneTokenInWei.call();
        let oneTokenInWei = new web3.BigNumber(oneTokenInWeiCall.toString());


        // Баланс токенов на счете владельца
        let ownerBalanceBeforeCall = await token.balanceOf.call(AllocatedRefundableCappedCrowdsale.address);
        let ownerBalanceBefore = ownerBalanceBeforeCall.valueOf();

        // Баланс токенов на счете плательщика
        let payerBalanceBeforeCall = await token.balanceOf.call(fromAccount);
        let payerBalanceBefore = payerBalanceBeforeCall.valueOf();

        await sendEtherAndExpectSuccess(fromAccount, sale, wei);

        let payerBalanceAfterCall = await token.balanceOf.call(fromAccount);
        let payerBalanceAfter = payerBalanceAfterCall.valueOf();

        let tokensWithoutBonus = new web3.BigNumber(wei).div(oneTokenInWei);
        let tokensWithBonus = new web3.BigNumber(tokensWithoutBonus).mul(new web3.BigNumber(100 + expectedBonus * 100)).div(100);

        let multiplier = Math.pow(10, Storage.tokenDecimals);

        let payerDeltaBalance = new web3.BigNumber(payerBalanceAfter).minus(new web3.BigNumber(payerBalanceBefore)).div(multiplier);

        assert.equal(checkFloatValuesEquality(payerDeltaBalance, tokensWithBonus), true, 'Должен быть начислен бонус {0}%, payerDeltaBalance: {1}, tokesWithBonus: {2}'.format(expectedBonus * 100, payerDeltaBalance, tokensWithBonus));

        let ownerBalanceAfterCall = await token.balanceOf.call(AllocatedRefundableCappedCrowdsale.address);
        let ownerBalanceAfter = ownerBalanceAfterCall.valueOf();

        // Кол-во токенов на аккаунте владельца должно уменьшиться
        let ownerDeltaBalance = new web3.BigNumber(ownerBalanceBefore).minus(new web3.BigNumber(ownerBalanceAfter)).div(new web3.BigNumber(multiplier));

        assert.equal(checkFloatValuesEquality(ownerDeltaBalance, tokensWithBonus), true, 'Со счета владельца должны быть списаны токены');
    };

    async function checkSendExternalEtherAndGetBonus(fromAccount, toAccount, wei, expectedBonus){
        let oneTokenInWeiCall = await sale.getOneTokenInWei.call();
        let oneTokenInWei = new web3.BigNumber(oneTokenInWeiCall.toString());


        // Баланс токенов на счете владельца
        let ownerBalanceBeforeCall = await token.balanceOf.call(AllocatedRefundableCappedCrowdsale.address);
        let ownerBalanceBefore = ownerBalanceBeforeCall.valueOf();

        // Баланс токенов на счете плательщика
        let payerBalanceBeforeCall = await token.balanceOf.call(toAccount);
        let payerBalanceBefore = payerBalanceBeforeCall.valueOf();

        await sendEtherExternalAndExpectSuccess(fromAccount, sale, toAccount, wei);

        let payerBalanceAfterCall = await token.balanceOf.call(toAccount);
        let payerBalanceAfter = payerBalanceAfterCall.valueOf();

        let tokensWithoutBonus = new web3.BigNumber(wei).div(oneTokenInWei);
        let tokensWithBonus = new web3.BigNumber(tokensWithoutBonus).mul(new web3.BigNumber(100 + expectedBonus * 100)).div(100);

        let multiplier = Math.pow(10, Storage.tokenDecimals);

        let payerDeltaBalance = new web3.BigNumber(payerBalanceAfter).minus(new web3.BigNumber(payerBalanceBefore)).div(multiplier);

        assert.equal(checkFloatValuesEquality(payerDeltaBalance, tokensWithBonus), true, 'Должен быть начислен бонус {0}%, payerDeltaBalance: {1}, tokesWithBonus: {2}'.format(expectedBonus * 100, payerDeltaBalance, tokensWithBonus));

        let ownerBalanceAfterCall = await token.balanceOf.call(AllocatedRefundableCappedCrowdsale.address);
        let ownerBalanceAfter = ownerBalanceAfterCall.valueOf();

        // Кол-во токенов на аккаунте владельца должно уменьшиться
        let ownerDeltaBalance = new web3.BigNumber(ownerBalanceBefore).minus(new web3.BigNumber(ownerBalanceAfter)).div(new web3.BigNumber(multiplier));

        assert.equal(checkFloatValuesEquality(ownerDeltaBalance, tokensWithBonus), true, 'Со счета владельца должны быть списаны токены');
    };

    async function checkContractOwner(contractInstance, contractName, expectedOwner){
        let ownerCall = await contractInstance.owner.call();
        assert.equal(ownerCall.valueOf(), expectedOwner, 'Владелец в контракте {0}, не совпадает со значением, которое задано в настройках'.format(contractName));
    };

    async function checkContractBurner(contractInstance, contractName, expectedBurner){
        let burnerCall = await contractInstance.tokenOwnerBurner.call();
        assert.equal(burnerCall.valueOf(), expectedBurner, 'Не совпадает тот, кто может сжигать токены для контракта {0}'.format(contractName));
    };

    async function checkContractMintAgent(contractInstance, contractName, expectedMitgAgent){
        let mingAgetCall = await contractInstance.mintAgent.call();
        assert.equal(mingAgetCall.valueOf(), expectedMitgAgent, 'Не совпадает тот, кто может создавать токены для контракта {0}'.format(contractName));
    };

    async function checkContractHalt(expectedValue){
        let haltedCall = await sale.halted.call();
        assert.equal(haltedCall.valueOf(), expectedValue, 'Значение переменной halted в контракте продаж должно быть установлено в {0}'.format(expectedValue?'true':'false'));
    };

    async function getBalance(accountAddress, at){
        return promisify(cb => web3.eth.getBalance(accountAddress, at, cb));
    };

    // Начало теста
    it('Служебный вызов, перевод 1 эфира с адреса accounts[0] на accounts[1]', async function() {
        let amount = web3.toWei(1, 'ether');
        let accountFrom = accounts[0];
        let accountTo = accounts[1];

        let balanceBeforeCall = await getBalance(accountTo);
        let balanceBefore =  balanceBeforeCall.valueOf();
        await checkSendEtherTo(accountTo, accountFrom, amount);

        let balanceAfterCall = await getBalance(accountTo);
        let balanceAfter = balanceAfterCall.valueOf();

        let balanceMustBe = new web3.BigNumber(balanceBefore).add(new web3.BigNumber(amount));

        assert.equal(balanceAfter, balanceMustBe, 'Баланс account[1] должен быть пополнен');
    });

    it('Владелец контрактов должен быть задан корректно', async function() {
        await checkContractOwner(token, 'BurnableCrowdsaleToken', Storage.ownerAddress);
        await checkContractOwner(sale, 'AllocatedRefundableCappedCrowdsale', Storage.ownerAddress);
    });

    it('Только контракт продаж может сжигать токены', async function() {
        await checkContractBurner(token, 'BurnableCrowdsaleToken', sale.address);
    });

    it('Только контракт продаж может создавать токены', async function() {
        await checkContractMintAgent(token, 'BurnableCrowdsaleToken', sale.address);
    });

    it('Даты начала и окончания первой стадии должны быть заданы корректно', async function() {
        let firstStageDateStartCall = await sale.firstStageStartsAt.call();
        assert.equal(firstStageDateStartCall.valueOf(), Storage.firstStageDateStartTimestamp, 'Дата старта первой стадии в контракте не совпадает с датой, которая задана в настройках');

        let firstStageDateEndCall = await sale.firstStageEndsAt.call();
        assert.equal(firstStageDateEndCall.valueOf(), Storage.firstStageDateEndTimestamp, 'Дата окончания первой стадии в контракте не совпадает с датой, которая задана в настройках');
    });

    it('Даты начала и окончания второй стадии должны быть заданы корректно', async function() {
        let secondStageDateStartCall = await sale.secondStageStartsAt.call();
        assert.equal(secondStageDateStartCall.valueOf(), Storage.secondStageDateStartTimestamp, 'Дата старта второй стадии в контракте не совпадает с датой, которая задана в настройках');

        let secondStageDateEndCall = await sale.secondStageEndsAt.call();
        assert.equal(secondStageDateEndCall.valueOf(), Storage.secondStageDateEndTimestamp, 'Дата окончания второй стадии в контракте не совпадает с датой, которая задана в настройках');
    });

    it('Наименование токена, символ, кол-во знаков, и тип токена должны быть заданы корректно', async function() {
        let symbolCall = await token.symbol.call();
        assert.equal(symbolCall.valueOf(), Storage.tokenSymbol, 'Символ токена в контракте не совпадает со значением, которое задано в настройках');

        let nameCall = await token.name.call();
        assert.equal(nameCall.valueOf(), Storage.tokenName, 'Имя токена в контракте не совпадает со значением, которое задано в настройках');

        let decimalsCall = await token.decimals.call();
        assert.equal(decimalsCall.valueOf(), Storage.tokenDecimals, 'Кол-во знаков в контракте не совпадает со значением, которое задано в настройках');
    });

    it('Кошелек для сбора средств должен быть задан корректно', async function(){
        let destinationWalletAddressCall = await sale.destinationMultisigWallet.call();

        assert.equal(destinationWalletAddressCall.valueOf(), Storage.destinationWalletAddress, 'Адрес кошелька для сбора средства не совпадает со значением, которое задано в настройках');
    });

    it('В кошельке для сбора средств должна быть 0 сумма', async function(){
        let destinationWalletAddressCall = await sale.destinationMultisigWallet.call();

        let balanceCall = await getBalance(destinationWalletAddressCall.toString());

        assert.equal(balanceCall.toString(), 0, 'На адресе кошелька для сбора должна быть 0 сумма');
    });

    it("На аккаунте советников, маркетинга, поддержки, команды не должно быть токенов", async function() {
        await checkAccountTokenBalance(Storage.advisorsAccountAddress, 0);
        await checkAccountTokenBalance(Storage.marketingAccountAddress, 0);
        await checkAccountTokenBalance(Storage.supportAccountAddress, 0);
        await checkAccountTokenBalance(Storage.teamAccountAddress, 0);
    });

    it('Проверка getWeiInCents', async function(){
        let getWeiInCentsCall = await sale.getWeiInCents.call(web3.toWei(1, 'ether'));

        assert.equal(getWeiInCentsCall.valueOf(), Storage.etherRateInCents, 'Переведенный курс эфира в центах должен быть равен {1} центам'.format(Storage.etherRateInCents));
    });

    it('Проверка getOneTokenInWei', async function(){
        let getOneTokenInWeiCall = await sale.getOneTokenInWei.call();

        let result = checkFloatValuesEquality(getOneTokenInWeiCall.valueOf(), new web3.BigNumber(web3.toWei(1, 'ether')).mul(Storage.oneTokenInCents).div(Storage.etherRateInCents), 1);

        assert.isTrue(result, 'Значение одного токена в wei должно соответствовать рассчетному');
    });

    it('Проверка setCurrentEtherRateInCents 40000 центов', async function(){
        let newValue = 40000;

        await sale.changeCurrentEtherRateInCents(newValue, {from : ownerAccount});
        let currentEtherRateInCentsCall = await sale.currentEtherRateInCents.call();

        let result = checkFloatValuesEquality(currentEtherRateInCentsCall.valueOf(), new web3.BigNumber(newValue), 0.1);

        assert.isTrue(result, 'Установленное значение в центах должно соответствовать записанному');
    });

    it('Проверка setCurrentEtherRateInCents, возвращаем обратно, т.к. тесты были сделаны исходя из значения 33000 центов', async function(){
        let newValue = 33000;

        await sale.changeCurrentEtherRateInCents(newValue, {from : ownerAccount});
        let currentEtherRateInCentsCall = await sale.currentEtherRateInCents.call();

        let result = checkFloatValuesEquality(currentEtherRateInCentsCall.valueOf(), new web3.BigNumber(newValue), 0.1);

        assert.isTrue(result, 'Установленное значение в центах должно соответствовать записанному');
    });

    it('Состояние до продаж - Prefunding', async function(){
        await checkSaleState(saleStates.preFunding);
    });

    it("Переводы в состоянии Prefunding не должны работать", async function() {
        await checkContractFallbackWithError(accounts[1], sale);
    });

    it("Перевели время на 2 дня вперед", async function() {
        await TestUtil.increaseTime(2 * Constant.DAY);
    });

    it('Состояние, после изменения времени на 2 дня вперед, должно быть FirstStageFunding', async function(){
        await checkSaleState(saleStates.firstStageFunding);
    });

    it("Проверяем логику изменения destination wallet", async function() {
        await callSetDestinationWalletAndExpectError(accounts[8], accounts[1]);
        await callSetDestinationWalletAndExpectSuccess(accounts[8], ownerAccount);

        let fundsVaultDestinationWalletCall = await sale.fundsVault.call();
        let fundsVaultInstance = FundsVault.at(fundsVaultDestinationWalletCall.toString());

        let fundsVaultWalletCall = await fundsVaultInstance.wallet.call();
        let destinationWalletCall = await sale.destinationMultisigWallet.call();

        assert.equal(fundsVaultWalletCall.toString(), destinationWalletCall.toString(), 'Ожидаемый адрес не совпадает с тем, который присвоен в контракте FundsVault');
        assert.equal(destinationWalletCall.toString(), accounts[8], 'Ожидаемый адрес не совпадает с тем, который присвоен в контракте');

        await callSetDestinationWalletAndExpectSuccess(Storage.destinationWalletAddress, ownerAccount);
    });

    it('На балансе контракта AllocatedRefundableCappedCrowdsale на первой стадии, всего должно находится {0} токенов'.format(Storage.firstStageTotalSupply), async function(){
        let totalTokensCall = await token.balanceOf.call(sale.address);

        let totalTokens = totalTokensCall.valueOf();

        assert.equal(totalTokens, Converter.getTokenValue(Storage.firstStageTotalSupply, Storage.tokenDecimals), 'Количество токенов на балансе контракта на первой стадии не совпадает со значением, которое задано в настройках ');
    });

    it('На балансе контракта AllocatedRefundableCappedCrowdsale на первой стадии, должно находится {0} токенов для продажи'.format(Storage.firstStageTotalSupply), async function(){
        let tokensLeftCall = await sale.getTokensLeftForSale.call(saleStates.firstStageFunding);
        let tokensLeft = tokensLeftCall.valueOf();

        // Можем продавать все токены сразу
        assert.equal(tokensLeft, Converter.getTokenValue(Storage.firstStageTotalSupply, Storage.tokenDecimals), 'Количество токенов на балансе контракта не совпадает со значением, которое задано в настройках');
    });

    it("Переводы < 25 тыс. $ в состоянии FirstStageFunding не должны работать, перевод 24 тыс. $", async function() {
        await checkNotAcceptEther(accounts[1], sale, centsToWei(2400000));
    });


    if (!inScenario('Если сценарий не onlyOneSecondStagePurchase', scenarioTypes.onlyOneSecondStagePurchase)){


        if (inScenario('Проверка preallocateFirstStage, продали 535714.285714285714285714, по цене 2500000 центов', scenarioTypes.firstStagePreallocate)){
            it("Делаем preallocateFirstStage на 25 тыс. $, продали 535714.28 токенов", async function() {
                await callPreallocateFirstStageAndExpectSuccess(ownerAccount, accounts[1], Converter.getTokenValue('535714.285714285714285714', Storage.tokenDecimals).toString(), centsToWei(2500000));
            });
        }else{
            it("Переводы [25, 50) тыс. $ в состоянии FirstStageFunding - бонус 50%, перевод 25 тыс. $", async function() {
                await checkSendEtherAndGetBonus(accounts[1], centsToWei(2500000), 0.5);
            });
        };


        it("Токенов должно быть продано 535714.285714285714285714", async function() {
            await checkTokensSold(String(Converter.getTokenValue((new web3.BigNumber(2500000)).mul(1.5).div(7), Storage.tokenDecimals)));
        });


        if (inScenario('Проверка остановки торгов', scenarioTypes.haltToggle)){

            it("Остановить торги может только владелец", async function() {
                // Берем произвольный аккаунт не являющийся владельцем
                await callHaltAndExpectError(getNotOwnerAccountAddress());
                await callHaltAndExpectSuccess(Storage.ownerAddress);
            });

            it('После вызовы halt(), у контракта продаж, переменная halted, должна быть установлена в true', async function(){
                await checkContractHalt(true);
            });

            it("После экстренной остановки продаж, переводы эфира на контракт не должны работать, перевод 25 тыс. $", async function() {
                await checkNotAcceptEther(accounts[2], sale, centsToWei(2500000));
            });

            it("Возобновить торги может только владелец", async function() {
                // Берем произвольный аккаунт не являющийся владельцем
                await callUnhaltAndExpectError(getNotOwnerAccountAddress());
                await callUnhaltAndExpectSuccess(Storage.ownerAddress);
            });

            it('После вызовы unhalt(), у контракта продаж, переменная halted, должна быть установлена в false', async function(){
                await checkContractHalt(false);
            });
        };


        //Бонусы первой стадии, 25 тыс. уже перевели
        it("Переводы [25, 50) тыс. $ в состоянии FirstStageFunding - бонус 50%, перевод 49.9 тыс. $", async function() {
            await checkSendEtherAndGetBonus(accounts[1], centsToWei(4990000), 0.5);
        });


        if (inScenario('Проверка перевода средств через externalBuy', scenarioTypes.checkExternalBuy)){
            it("Переводы [50, 100) тыс. $ в состоянии FirstStageFunding - бонус 75%, перевод 50 тыс. $ через внешнюю функцию externalBuy, вызов от владельца", async function() {
                await checkSendExternalEtherAndGetBonus(accounts[0], accounts[1], centsToWei(5000000), 0.75);
            });
        }else{
            it("Переводы [50, 100) тыс. $ в состоянии FirstStageFunding - бонус 75%, перевод 50 тыс. $", async function() {
                await checkSendEtherAndGetBonus(accounts[1], centsToWei(5000000), 0.75);
            });
        };


        it("Переводы перевод 50 тыс. $ через внешнюю функцию externalBuy, вызов не от владельца", async function() {
            await sendEtherExternalAndExpectError(accounts[1], sale, accounts[1], centsToWei(5000000));
        });

        it("Переводы [50, 100) тыс. $ в состоянии FirstStageFunding - бонус 100%, перевод 99.9 тыс. $", async function() {
            await checkSendEtherAndGetBonus(accounts[1], centsToWei(9990000), 0.75);
        });

        it("Переводы >= 100 тыс. $ в состоянии FirstStageFunding - бонус 100%, перевод 100 тыс. $", async function() {
            await checkSendEtherAndGetBonus(accounts[1], centsToWei(10000000), 1);
        });


        if (inScenario('Проверка достижения Soft Cap', scenarioTypes.firstStageSoftCapReached)){
            // Эта проверка включит набор Soft Cap для первой стадии
            //До Soft Cap еще 359520001  центов
            it("Выкуп всех токенов первой стадии и проверка того, что достигнут Soft Cap", async function() {
                await checkSendEtherAndGetBonus(accounts[4], centsToWei(359520001), 1);
            });

        };

    };


    it("Перевели время на 12 дней вперед", async function() {
        await TestUtil.increaseTime(12 * Constant.DAY);
    });

    it('Состояние, после изменения времени на 12 дней вперед, должно быть FirstStageEnd', async function(){
        await checkSaleState(saleStates.firstStageEnd);
    });

    it('Финализатор первой стадии должен сработать успешно', async function(){
        await callFinalizeFirstStageAndExpectSuccess(ownerAccount);
    });

    it('Состояние, после выполнения финализатора первой стадии, переменная isFirstStageFinalized должа быть = true', async function(){
        await checkSaleState(saleStates.firstStageEnd);

        let isFirstStageFinalizedCall = await sale.isFirstStageFinalized.call();
        let isFirstStageFinalized = isFirstStageFinalizedCall.valueOf();

        assert.isTrue(isFirstStageFinalized, 'Должен быть установлен флаг финализации первой стадии');
    });

    it("Переводы в состоянии FirstStageEnd не должны работать, перевод 26 тыс. $", async function() {
        await checkNotAcceptEther(accounts[1], sale, centsToWei(2600000));
    });


    if (inScenario('Одна большая покупка на второй стадии', scenarioTypes.onlyOneSecondStagePurchase)){

        it("Перевели время на 15 дней вперед", async function() {
            await TestUtil.increaseTime(15 * Constant.DAY);
        });

        it('Состояние, после изменения времени на 15 дней вперед, должно быть SecondStageFunding', async function(){
            await checkSaleState(saleStates.secondStageFunding);
        });

        it("Переводы < 7 $ в состоянии SecondStageFunding не должны работать, перевод 6 $", async function() {
            await checkNotAcceptEther(accounts[1], sale, centsToWei(600));
        });

        it("Переводы >= 7 $ в состоянии SecondStageFunding должны работать, перевод 1050000000 центов - бонус 20%, проверка полного выкупа с запасом", async function() {
            await sendEtherAndExpectSuccess(accounts[1], sale, centsToWei(1050000000));
        });

        it("Перевели время на 15 дней вперед", async function() {
            await TestUtil.increaseTime(15 * Constant.DAY);
        });

        it('Состояние, после изменения времени на 15 дней вперед, должно быть SecondStageEnd', async function(){
            await checkSaleState(saleStates.secondStageEnd);
        });

        it('Финализатор второй стадии должен сработать успешно', async function(){
            await callFinalizeSecondStageAndExpectSuccess(ownerAccount);
        });

        it('Состояние, после выполнения финализатора первой стадии, переменная isSecondStageFinalized должа быть = true', async function(){
            await checkSaleState(saleStates.success);

            let isSecondStageFinalizedCall = await sale.isSecondStageFinalized.call();
            let isSecondStageFinalized = isSecondStageFinalizedCall.valueOf();

            assert.isTrue(isSecondStageFinalized, 'Должен быть установлен флаг финализации второй стадии');
        });


    }else{

        it('На балансе контракта AllocatedRefundableCappedCrowdsale после финализации первой стадии, всего должно находится {0} токенов'.format(Storage.secondStageTotalSupply), async function(){
            let totalTokensCall = await token.balanceOf.call(sale.address);

            let totalTokens = totalTokensCall.valueOf();

            assert.equal(totalTokens, Converter.getTokenValue(Storage.secondStageTotalSupply, Storage.tokenDecimals), 'Количество токенов на балансе контракта на второй стадии не совпадает со значением, которое задано в настройках ');
        });

        it('На балансе контракта AllocatedRefundableCappedCrowdsale на второй стадии, должно находится {0} токенов для продажи'.format(Storage.secondStageTotalSupply - Storage.secondStageReserve), async function(){
            let tokensLeftCall = await sale.getTokensLeftForSale.call(saleStates.secondStageFunding);
            let tokensLeft = tokensLeftCall.valueOf();

            assert.equal(tokensLeft, Converter.getTokenValue(Storage.secondStageTotalSupply - Storage.secondStageReserve, Storage.tokenDecimals), 'Количество токенов на балансе контракта не совпадает со значением, которое задано в настройках');
        });


        if (inScenario('Проверка провала продаж, не достигли Soft Cap после завершения второй стадии', scenarioTypes.secondStageSoftCapNotReached)){

            it("Перевели время на 15 дней вперед", async function() {
                await TestUtil.increaseTime(15 * Constant.DAY);
            });

            it('Состояние, после изменения времени на 15 дней вперед, должно быть SecondStageFunding', async function(){
                await checkSaleState(saleStates.secondStageFunding);
            });

            it("Переводы < 7 $ в состоянии SecondStageFunding не должны работать, перевод 6 $", async function() {
                await checkNotAcceptEther(accounts[1], sale, centsToWei(600));
            });

            it("Переводы >= 7 $ в состоянии SecondStageFunding должны работать, перевод 7 $, при условии кол-ва проданных токенов от [0-10%) - бонус 20%", async function() {
                await checkSendEtherAndGetBonus(accounts[1], centsToWei(700), 0.2);
            });


            if (inScenario('Проверка возврата средств, после финализации и недостижении Soft Cap', scenarioTypes.secondStageSoftCapNotReachedRefund)) {
                it("->Перевод 700 $ с 3 аккаунта для проверки последующего возврата", async function () {
                    //!!3-й аккаунт используется, чтобы проверить возврат средств
                    await checkSendEtherAndGetBonus(accounts[3], centsToWei(70000), 0.2);
                });

                it("->Перевод 700 $ с 4 аккаунта для проверки последующего возврата при спекуляциях токенами", async function () {
                    //!!4-й аккаунт используется, чтобы проверить возврат средств
                    await checkSendEtherAndGetBonus(accounts[4], centsToWei(70000), 0.2);
                });
            };


            it("Перевели время на 15 дней вперед", async function() {
                await TestUtil.increaseTime(15 * Constant.DAY);
            });

            it('Состояние, после изменения времени на 15 дней вперед, должно быть SecondStageEnd', async function(){
                await checkSaleState(saleStates.secondStageEnd);
            });


            if (inScenario('Проверка догона Soft Cap', scenarioTypes.secondStagePreallocateToSoftCap)){

                it('Проверка догона до Soft Cap, с помощью функции preallocateSecondStage', async function(){
                    await callPreallocateSecondStageAndExpectSuccess(ownerAccount, accounts[4], Converter.getTokenValue(1000, Storage.tokenDecimals), centsToWei(392369238));
                });

                it('Финализатор второй стадии должен сработать успешно', async function(){
                    let fundsVaultCall = await sale.fundsVault.call();

                    let balanceBeforeCall = await getBalance(fundsVaultCall.valueOf());

                    await callFinalizeSecondStageAndExpectSuccess(ownerAccount);

                    let destinationBalance = await getBalance(Storage.destinationWalletAddress);

                    let result = checkFloatValuesEquality(balanceBeforeCall.valueOf(), destinationBalance.valueOf(), 0.5);

                    assert.isTrue(result, 'Переведенное значение на адрес destination wallet должно соответствовать значению, которое было на контракте продаж');
                });

                it('Состояние, после выполнения финализатора первой стадии, переменная isSecondStageFinalized должа быть = true', async function(){
                    await checkSaleState(saleStates.success);

                    let isSecondStageFinalizedCall = await sale.isSecondStageFinalized.call();
                    let isSecondStageFinalized = isSecondStageFinalizedCall.valueOf();

                    assert.isTrue(isSecondStageFinalized, 'Должен быть установлен флаг финализации второй стадии');
                });

            };


            if (inScenario('Проверка возврата средств, после финализации и недостижении Soft Cap', scenarioTypes.secondStageSoftCapNotReachedRefund)){

                it('Soft Cap не собрали, вызвали финализатор, финализатор второй стадии должен сработать успешно', async function(){
                    await callFinalizeSecondStageAndExpectSuccess(ownerAccount);
                });

                it('Состояние, после выполнения финализатора первой стадии - Failure, переменная isSecondStageFinalized должа быть = true', async function(){
                    await checkSaleState(saleStates.failure);

                    let isSecondStageFinalizedCall = await sale.isSecondStageFinalized.call();
                    let isSecondStageFinalized = isSecondStageFinalizedCall.valueOf();

                    assert.isTrue(isSecondStageFinalized, 'Должен быть установлен флаг финализации второй стадии');
                });

                it('Проверка перевода контракта продаж в режим возврата средств', async function(){
                    await callEnableRefundsAndExpectSuccess(ownerAccount);

                    await checkSaleState(saleStates.refunding);
                });

                it('<-Проверка возврата на 3 аккаунт', async function(){
                    await checkRefund(accounts[3], centsToWei(70000), web3.toWei(0.5, 'ether'));
                });

                it('Переводим токены с 4-го аккаунта на 3-й', async function(){
                    await callTokenTransferAndExpectSuccess(accounts[4], accounts[3], Converter.getTokenValue(100, Storage.tokenDecimals));
                });

                it('<-Проверка возврата на 4 аккаунт, возврат невозможен, т.к. был сторонний перевод и кол-во токенов на балансе контракта токена не совпадает с контрактом продаж', async function(){
                    await checkRefundWithError(accounts[4]);
                });


            };


        };


        if (inScenario('Проверка сбора Soft Cap, при этом на второй стадии не было ни одного платежа', scenarioTypes.secondStageSoftCapReached)){

            it("Перевели время на 30 дней вперед", async function() {
                await TestUtil.increaseTime(30 * Constant.DAY);
            });

            it('Состояние, после изменения времени на 30 дней вперед, должно быть SecondStageEnd', async function(){
                await checkSaleState(saleStates.secondStageEnd);
            });

            it('Финализатор второй стадии должен сработать успешно', async function(){
                let fundsVaultCall = await sale.fundsVault.call();

                let balanceBeforeCall = await getBalance(fundsVaultCall.valueOf());

                await callFinalizeSecondStageAndExpectSuccess(ownerAccount);

                let destinationBalance = await getBalance(Storage.destinationWalletAddress);

                let result = checkFloatValuesEquality(balanceBeforeCall.valueOf(), destinationBalance.valueOf(), 0.5);

                assert.isTrue(result, 'Переведенное значение на адрес destination wallet должно соответствовать значению, которое было на контракте продаж');
            });

            it('Состояние, после выполнения финализатора второй стадии, при достижении Soft Cap должно быть Success, переменная isSecondStageFinalized должа быть = true, также isSuccessOver = true', async function(){
                await checkSaleState(saleStates.success);

                let isSecondStageFinalizedCall = await sale.isSecondStageFinalized.call();
                let isSecondStageFinalized = isSecondStageFinalizedCall.valueOf();

                assert.isTrue(isSecondStageFinalized, 'Должен быть установлен флаг финализации второй стадии');
            });

        };


        if (inScenario('Проверка достижения Hard Cap', scenarioTypes.secondStageHardCapReached)){
            it("Перевели время на 15 дней вперед", async function() {
                await TestUtil.increaseTime(15 * Constant.DAY);
            });

            it('Состояние, после изменения времени на 15 дней вперед, должно быть SecondStageFunding', async function(){
                await checkSaleState(saleStates.secondStageFunding);
            });

            it("Переводы < 7 $ в состоянии SecondStageFunding не должны работать, перевод 6 $", async function() {
                await checkNotAcceptEther(accounts[1], sale, centsToWei(600));
            });

            it("Переводы >= 7 $ в состоянии SecondStageFunding должны работать, перевод 7 $, при условии кол-ва проданных токенов от [0-10%) - бонус 20%", async function() {
                await checkSendEtherAndGetBonus(accounts[1], centsToWei(700), 0.2);
            });

            //суммы в центах, берем с небольшим запасом!
            it("Выкупаем все токены с 20% бонусом, 14071428 токенов - это 10% от кол-ва продаваемых токенов на второй стадии", async function() {
                await checkSendEtherAndGetBonus(accounts[2], centsToWei(98500000+500), 0.2);
            });

            it("Выкупаем все токены с 17.5% бонусом, с учетом бонусов состаит 14370820 токенов - это будет 20% от кол-ва продаваемых токенов на второй стадии", async function() {
                await checkSendEtherAndGetBonus(accounts[3], centsToWei(100595745+500), 0.175);
            });

            it("Выкупаем все токены с 15% бонусом, с учетом бонусов состаит 14683229 токенов - это будет 30% от кол-ва продаваемых токенов на второй стадии", async function() {
                await checkSendEtherAndGetBonus(accounts[4], centsToWei(102782609+500), 0.15);
            });

            it("Выкупаем все токены с 12.5% бонусом, с учетом бонусов состаит 15009523 токенов - это будет 40% от кол-ва продаваемых токенов на второй стадии", async function() {
                await checkSendEtherAndGetBonus(accounts[4], centsToWei(105066667+500), 0.125);
            });

            it("Выкупаем все токены с 10% бонусом, с учетом бонусов состаит 15350649 токенов - это будет 50% от кол-ва продаваемых токенов на второй стадии", async function() {
                await checkSendEtherAndGetBonus(accounts[4], centsToWei(107454546+500), 0.1);
            });

            it("Выкупаем все токены с 8% бонусом, с учетом бонусов состаит 15634920 токенов - это будет 60% от кол-ва продаваемых токенов на второй стадии", async function() {
                await checkSendEtherAndGetBonus(accounts[4], centsToWei(109444445+500), 0.08);
            });

            it("Выкупаем все токены с 6% бонусом, с учетом бонусов состаит 15929919 токенов - это будет 70% от кол-ва продаваемых токенов на второй стадии", async function() {
                await checkSendEtherAndGetBonus(accounts[4], centsToWei(111509434+500), 0.06);
            });

            it("Выкупаем все токены с 4% бонусом, с учетом бонусов состаит 16236263 токенов - это будет 80% от кол-ва продаваемых токенов на второй стадии", async function() {
                await checkSendEtherAndGetBonus(accounts[4], centsToWei(113653846+500), 0.04);
            });

            it("Выкупаем все токены с 2% бонусом, с учетом бонусов состаит 16554621 токенов - это будет 90% от кол-ва продаваемых токенов на второй стадии", async function() {
                await checkSendEtherAndGetBonus(accounts[4], centsToWei(115882353+500), 0.02);
            });

            it("Достигли Hard Cap", async function() {
                let isHardCapGoalReachedCall = await sale.isHardCapGoalReached.call();

                assert.isTrue(isHardCapGoalReachedCall.valueOf(), "Уже должнны достигнуть Hard Cap, раздали 152972259 токенов");
            });

            it("Переводы больше не должны приниматься в состоянии SecondStageFunding, т.к. набран Hard Cap", async function() {
                await checkNotAcceptEther(accounts[5], sale, centsToWei(1000));
            });

            //Финализатор второй стадии

            it('Финализатор второй стадии должен сработать успешно', async function(){
                let fundsVaultCall = await sale.fundsVault.call();

                let balanceBeforeCall = await getBalance(fundsVaultCall.valueOf());

                await callFinalizeSecondStageAndExpectSuccess(ownerAccount);

                let destinationBalance = await getBalance(Storage.destinationWalletAddress);

                let result = checkFloatValuesEquality(balanceBeforeCall.valueOf(), destinationBalance.valueOf(), 0.5);

                assert.isTrue(result, 'Переведенное значение на адрес destination wallet должно соответствовать значению, которое было на контракте продаж');
            });

            it('Состояние, после выполнения финализатора второй стадии, в случае успеха должно быть Success, переменная isSecondStageFinalized должа быть = true, также isSuccessOver = true', async function(){
                await checkSaleState(saleStates.success);

                let isSecondStageFinalizedCall = await sale.isSecondStageFinalized.call();
                let isSecondStageFinalized = isSecondStageFinalizedCall.valueOf();

                assert.isTrue(isSecondStageFinalized, 'Должен быть установлен флаг финализации второй стадии');
            });

            it("На аккаунте контракта продаж, должно быть ровно столько токенов, сколько предусмотрено команде - 45947521 токенов", async function() {
                await checkAccountTokenBalance(sale.address, Converter.getTokenValue(45947521, Storage.tokenDecimals));
            });

            it("Переводы в состоянии Success не должны работать, перевод 26 тыс. $", async function() {
                await checkNotAcceptEther(accounts[5], sale, centsToWei(2600000));
            });

            //Проверка перевода средств из подвала
            it("Проверка, что собранные средства перевелись на кошелек для сборов, при этом сумма большая или равная Hard Cap переведена на нужный аккаунт", async function() {
                let destinationMultisigWalletCall = await sale.destinationMultisigWallet.call();

                let destinationWalletBalance = await getBalance(destinationMultisigWalletCall.valueOf());

                let weiRaisedCall = await sale.weiRaised.call();

                assert.equal(destinationWalletBalance.valueOf(), weiRaisedCall.valueOf(), 'Собранная сумма должна совпадать с суммой переведенной на кошелек');

                let isValidHardcap = weiToCents(destinationWalletBalance.valueOf()) >= Storage.hardCapGoalInCents;

                assert.isTrue(isValidHardcap, 'Hard Cap некорректен');
            });
        };


    };


    if (inScenario('Проверка успешного завершения', scenarioTypes.successFinished)){

        it("Проверяем логику изменения destination wallet, после успешного завершения нельзя менять адрес", async function() {
            await callSetDestinationWalletAndExpectError(accounts[8], ownerAccount);
        });

        //Проверка распределения
        it("На аккаунте советников должно быть 8040817 токенов", async function() {
            await checkAccountTokenBalance(Storage.advisorsAccountAddress, Converter.getTokenValue(8040817, Storage.tokenDecimals));
        });

        it("На аккаунте маркетинга должно быть 3446064 токенов", async function() {
            await checkAccountTokenBalance(Storage.marketingAccountAddress, Converter.getTokenValue(3446064, Storage.tokenDecimals));
        });

        it("На аккаунте поддержки должно быть 3446064 токенов", async function() {
            await checkAccountTokenBalance(Storage.supportAccountAddress, Converter.getTokenValue(3446064, Storage.tokenDecimals));
        });

        it("На аккаунте команды должно быть 0 токенов, т.к. они заблокированы до определенной даты", async function() {
            await checkAccountTokenBalance(Storage.teamAccountAddress, 0);
        });

        it("При запросе токенов на аккаунт команды должна возникать ошибка", async function() {
            await callIssueTeamTokensAndExpectError(ownerAccount);
        });

        it("Перевели время на 365 дней вперед", async function() {
            await TestUtil.increaseTime(365 * Constant.DAY);
        });

        it("При запросе токенов на аккаунт команды не должно возникать ошибки", async function() {
            await callIssueTeamTokensAndExpectSuccess(ownerAccount);
        });

        it("На аккаунте команды должно быть 45947521 токенов", async function() {
            await checkAccountTokenBalance(Storage.teamAccountAddress, Converter.getTokenValue(45947521, Storage.tokenDecimals));
        });
    };

});
