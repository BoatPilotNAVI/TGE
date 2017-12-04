pragma solidity ^0.4.13;

/**
 * Различные валидаторы
 */

contract ValidationUtil {
    function checkAddress(address value) internal{
        require(isAddressValid(value));
    }

    function isAddressValid(address value) internal constant returns (bool result){
        return value != 0;
    }
}
