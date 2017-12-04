pragma solidity ^0.4.13;

import "../zeppelin/contracts/token/ERC20.sol";

/**
 * Токен с поддержкой определенного кол-ва знаков после ",", decimals кол-во знаков, но на самом деле инфа хранится в uint
 */

contract FractionalERC20 is ERC20 {
    uint public decimals;
}
