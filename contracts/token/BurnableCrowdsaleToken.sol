pragma solidity ^0.4.13;

import "./BurnableToken.sol";
import "./CrowdsaleToken.sol";

/**
 * Шаблон для продаж токена, который можно сжечь
 *
 */
contract BurnableCrowdsaleToken is BurnableToken, CrowdsaleToken {

    function BurnableCrowdsaleToken(string _name, string _symbol, uint _decimals) CrowdsaleToken(_name, _symbol, _decimals) BurnableToken(){

    }
}
