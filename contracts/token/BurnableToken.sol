pragma solidity ^0.4.13;

import "../validation/ValidationUtil.sol";
import '../zeppelin/contracts/token/StandardToken.sol';
import "../zeppelin/contracts/ownership/Ownable.sol";

import '../zeppelin/contracts/math/SafeMath.sol';

/**
 * Шаблон для токена, который можно сжечь
*/
contract BurnableToken is StandardToken, Ownable, ValidationUtil {
    using SafeMath for uint;

    address public tokenOwnerBurner;

    /** Событие, сколько токенов мы сожгли */
    event Burned(address burner, uint burnedAmount);

    function setOwnerBurner(address _tokenOwnerBurner) public onlyOwner invalidOwnerBurner{
        // Проверка, что адрес не пустой
        requireNotEmptyAddress(_tokenOwnerBurner);

        tokenOwnerBurner = _tokenOwnerBurner;
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
        balances[_address] = balances[_address].sub(burnAmount);

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
        requireNotEmptyAddress(tokenOwnerBurner);

        _;
    }

    modifier invalidOwnerBurner() {
        // Проверка, что адрес не пустой
        require(!isAddressValid(tokenOwnerBurner));

        _;
    }
}
