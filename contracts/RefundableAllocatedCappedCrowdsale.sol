pragma solidity ^0.4.13;

import "./AllocatedCappedCrowdsale.sol";
import "./vault/FundsVault.sol";

/**
* Контракт продажи
* Возврат средств поддержмвается только тем, кто купил токены через функцию internalInvest
* Таким образом, если инвесторы будут обмениваться токенами, то вернуть можно будет только тем, у кого в контракте продаж
* такая же сумма токенов, как и в контракте токена, в противном случае переведенный эфир остается навсегда в системе и не может быть выведен
*/
contract RefundableAllocatedCappedCrowdsale is AllocatedCappedCrowdsale {

    /**
    * Хранилище, куда будут собираться средства, делается для того, чтобы гарантировать возвраты
    */
    FundsVault public fundsVault;

    /** Мапа адрес инвестора - был ли совершен возврат среств */
    mapping (address => bool) public refundedInvestors;

    function RefundableAllocatedCappedCrowdsale(uint _currentEtherRateInCents, address _token, address _destinationMultisigWallet, uint _firstStageStartsAt, uint _firstStageEndsAt, uint _secondStageStartsAt, uint _secondStageEndsAt, address _advisorsAccount, address _marketingAccount, address _supportAccount, address _teamAccount, uint _teamTokensIssueDate) AllocatedCappedCrowdsale(_currentEtherRateInCents, _token, _destinationMultisigWallet, _firstStageStartsAt, _firstStageEndsAt, _secondStageStartsAt, _secondStageEndsAt, _advisorsAccount, _marketingAccount, _supportAccount, _teamAccount, _teamTokensIssueDate) {
        // Создаем от контракта продаж новое хранилище, доступ к нему имеет только контракт продаж
        // При успешном завершении продаж, все собранные средства поступят на _destinationMultisigWallet
        // В противном случае могут быть переведены обратно инвесторам
        fundsVault = new FundsVault(_destinationMultisigWallet);
    }

    /** Финализация второго этапа
    */
    function internalSuccessOver() internal {
        // Успешно закрываем хранилище средств и переводим эфир на указанный кошелек
        fundsVault.close();

        super.internalSuccessOver();
    }

    /** Переопределение функции принятия допозита на счет, в данном случае, идти будет через vault
    */
    function internalDeposit(address receiver, uint weiAmount) internal{
        // Шлем на кошелёк эфир
        fundsVault.deposit.value(weiAmount)(msg.sender);
    }

    /** Переопределение функции включения состояния возврата
    */
    function internalEnableRefunds() internal{
        super.internalEnableRefunds();

        fundsVault.enableRefunds();
    }

    /** Переопределение функции возврата, возврат можно сделать только раз
    */
    function internalRefund(address receiver, uint weiAmount) internal{
        // Делаем возврат
        // Поддерживаем только 1 возврат

        if (refundedInvestors[receiver]) revert();

        fundsVault.refund(receiver, weiAmount);

        refundedInvestors[receiver] = true;
    }

}
