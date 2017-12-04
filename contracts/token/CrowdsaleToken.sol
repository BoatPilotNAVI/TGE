pragma solidity ^0.4.13;

import '../zeppelin/contracts/token/StandardToken.sol';
import "../zeppelin/contracts/ownership/Ownable.sol";

/**
 * Токен продаж
 *
 * ERC-20 токен, для ICO
 *
 */

contract CrowdsaleToken is StandardToken, Ownable {

    /* Описание см. в конструкторе */
    string public name;

    string public symbol;

    uint public decimals;

    bool public canMint;

    address public mintAgent;

    /** Событие обновления токена (имя и символ) */
    event UpdatedTokenInformation(string newName, string newSymbol);

    /** Событие выпуска токенов */
    event TokenMinted(uint amount, address toAddress);

    /**
     * Конструктор
     *
     * Токен должен быть создан только владельцем через кошелек (либо с мультиподписью, либо без нее)
     *
     * @param _name - имя токена
     * @param _symbol - символ токена
     * @param _decimals - кол-во знаков после запятой
     */
    function CrowdsaleToken(string _name, string _symbol, uint _decimals) {
        owner = msg.sender;

        name = _name;
        symbol = _symbol;

        decimals = _decimals;

        canMint = true;
    }

    /**
     * Владелец должен вызвать эту функцию, чтобы выпустить токены на адрес
     */
    function mintToAddress(uint amount, address toAddress) onlyWhenCanMint{
        // перевод токенов на аккаунт
        balances[toAddress] = amount;

        // вызываем событие
        TokenMinted(amount, toAddress);
    }

    /**
     * Владелец может обновить инфу по токену
     */
    function setTokenInformation(string _name, string _symbol) onlyOwner {
        name = _name;
        symbol = _symbol;

        // Вызываем событие
        UpdatedTokenInformation(name, symbol);
    }

    /**
     * Только владелец может обновить агента для создания токенов
     */
    function setMintAgent(address _address) onlyOwner {
        mintAgent =  _address;
    }

    /**
    * Модификаторы
    */
    modifier onlyWhenCanMint(){
        require(canMint);

        _;
    }

    modifier onlyOwnerOrMintAgent(){
        require(msg.sender == owner || msg.sender == mintAgent);

        _;
    }
}
