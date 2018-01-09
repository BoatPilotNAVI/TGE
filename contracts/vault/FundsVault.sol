pragma solidity ^0.4.13;

import "../zeppelin/contracts/ownership/Ownable.sol";
import "../validation/ValidationUtil.sol";

import '../zeppelin/contracts/math/SafeMath.sol';
import '../zeppelin/contracts/math/Math.sol';
/**
 * Шаблон класса хранилища средств, которое используется в контракте продаж
 * Поддерживает возврат средств, а такте перевод средств на кошелек, в случае успешного проведения продаж
 */
contract FundsVault is Ownable, ValidationUtil {
    using SafeMath for uint;
    using Math for uint;

    enum State {Active, Refunding, Closed}

    mapping (address => uint256) public deposited;

    address public wallet;

    State public state;

    event Closed();

    event RefundsEnabled();

    event Refunded(address indexed beneficiary, uint256 weiAmount);

    /**
     * Указываем на какой кошелек будут потом переведены собранные средства, в случае, если будет вызвана функция close()
     * Поддерживает возврат средств, а такте перевод средств на кошелек, в случае успешного проведения продаж
     */
    function FundsVault(address _wallet) {
        requireNotEmptyAddress(_wallet);

        wallet = _wallet;

        state = State.Active;
    }

    /**
     * Положить депозит в хранилище
     */
    function deposit(address investor) public payable onlyOwner inState(State.Active) {
        deposited[investor] = deposited[investor].add(msg.value);
    }

    /**
     * Перевод собранных средств на указанный кошелек
     */
    function close() public onlyOwner inState(State.Active) {
        state = State.Closed;

        Closed();

        wallet.transfer(this.balance);
    }

    /**
     * Установливаем кошелек
     */
    function setWallet(address newWalletAddress) public onlyOwner inState(State.Active) {
        wallet = newWalletAddress;
    }

    /**
     * Установить режим возврата денег
     */
    function enableRefunds() public onlyOwner inState(State.Active) {
        state = State.Refunding;

        RefundsEnabled();
    }

    /**
     * Функция возврата средств
     */
    function refund(address investor, uint weiAmount) public onlyOwner inState(State.Refunding){
        uint256 depositedValue = weiAmount.min256(deposited[investor]);
        deposited[investor] = 0;
        investor.transfer(depositedValue);

        Refunded(investor, depositedValue);
    }

    /** Только, если текущее состояние соответсвует состоянию  */
    modifier inState(State _state) {
        require(state == _state);

        _;
    }

}
