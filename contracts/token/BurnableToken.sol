pragma solidity ^0.4.13;

import "../math/SafeMathUtil.sol";
import "../validation/ValidationUtil.sol";
import '../zeppelin/contracts/token/StandardToken.sol';
import "../zeppelin/contracts/ownership/Ownable.sol";

/**
 * Шаблон для токена, который можно сжечь
*/
contract BurnableToken is StandardToken, Ownable, ValidationUtil, SafeMathUtil {

    address public tokenOwnerBurner;

    /** Событие, сколько токенов мы сожгли */
    event Burned(address burner, uint burnedAmount);

    function setOwnerBurner(address _tokenOwnerBurner) public onlyOwner invalidOwnerBurner{
        tokenOwnerBurner = _tokenOwnerBurner;

        // Проверка, что адрес не пустой
        checkAddress(tokenOwnerBurner);
    }

    /**
     * Сжигаем токены на балансе владельца токенов, вызвать может только tokenOwnerBurner
     */
    function burnOwnerTokens(uint burnAmount) public onlyTokenOwnerBurner validOwnerBurner{
        burnTokens(tokenOwnerBurner, burnAmount);
    }

    /**
     * Сжигаем токены на балансе адреса токенов, вызвать может только tokenOwnerBurner
     */
    function burnTokens(address _address, uint burnAmount) public onlyTokenOwnerBurner validOwnerBurner{
        balances[_address] = safeSub(balances[_address], burnAmount);

        // Вызываем событие
        Burned(_address, burnAmount);
    }

    /**
     * Сжигаем все токены на балансе владельца
     */
    function burnAllOwnerTokens() public onlyTokenOwnerBurner validOwnerBurner{
        uint burnAmount = balances[tokenOwnerBurner];
        burnTokens(tokenOwnerBurner, burnAmount);
    }

    /** Модификаторы
     */
    modifier onlyTokenOwnerBurner() {
        require(msg.sender == tokenOwnerBurner);

        _;
    }

    modifier validOwnerBurner() {
        // Проверка, что адрес не пустой
        checkAddress(tokenOwnerBurner);

        _;
    }

    modifier invalidOwnerBurner() {
        // Проверка, что адрес не пустой
        require(!isAddressValid(tokenOwnerBurner));

        _;
    }
}
