pragma solidity ^0.4.13;

import "./zeppelin/contracts/ownership/Ownable.sol";

/*
 * Базовый контракт, который поддерживает остановку продаж
 */

contract Haltable is Ownable {
    bool public halted;

    modifier stopInEmergency {
        require(!halted);
        _;
    }

    /* Модификатор, который вызывается в потомках */
    modifier onlyInEmergency {
        require(halted);
        _;
    }

    /* Вызов функции прервет продажи, вызывать может только владелец */
    function halt() external onlyOwner {
        halted = true;
    }

    /* Вызов возвращает режим продаж */
    function unhalt() external onlyOwner onlyInEmergency {
        halted = false;
    }

}
