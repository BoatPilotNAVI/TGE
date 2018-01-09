pragma solidity ^0.4.13;

import "./validation/ValidationUtil.sol";
import "./Haltable.sol";
import "./token/BurnableCrowdsaleToken.sol";

import './zeppelin/contracts/math/SafeMath.sol';

/**
 * Базовый контракт для продаж
 *
 * Содержит
 * - Дата начала и конца
 */

/* Продажи могут быть остановлены в любой момент по вызову halt() */

contract AllocatedCappedCrowdsale is Haltable, ValidationUtil {
    using SafeMath for uint;

    // Кол-во токенов для распределения
    uint public advisorsTokenAmount = 8040817;
    uint public supportTokenAmount = 3446064;
    uint public marketingTokenAmount = 3446064;
    uint public teamTokenAmount = 45947521;

    uint public teamTokensIssueDate;

    /* Токен, который продаем */
    BurnableCrowdsaleToken public token;

    /* Адрес, куда будут переведена собранная сумма, в случае успеха */
    address public destinationMultisigWallet;

    /* Первая стадия в формате UNIX timestamp */
    uint public firstStageStartsAt;
    /* Конец продаж в формате UNIX timestamp */
    uint public firstStageEndsAt;

    /* Вторая стадия в формате UNIX timestamp */
    uint public secondStageStartsAt;
    /* Конец продаж в формате UNIX timestamp */
    uint public secondStageEndsAt;

    /* Минимальная кепка для первой стадии в центах */
    uint public softCapFundingGoalInCents = 392000000;

    /* Минимальная кепка для второй стадии в центах */
    uint public hardCapFundingGoalInCents = 985000000;

    /* Сколько всего в wei мы получили 10^18 wei = 1 ether */
    uint public weiRaised;

    /* Сколько всего собрали в ценах на первой стадии */
    uint public firstStageRaisedInWei;

    /* Сколько всего собрали в ценах на второй стадии */
    uint public secondStageRaisedInWei;

    /* Кол-во уникальных адресов, которые у наc получили токены */
    uint public investorCount;

    /*  Сколько wei отдали инвесторам на refund'е в wei */
    uint public weiRefunded;

    /*  Сколько токенов продали всего */
    uint public tokensSold;

    /* Флаг того, что сработал финализатор первой стадии */
    bool public isFirstStageFinalized;

    /* Флаг того, что сработал финализатор второй стадии */
    bool public isSecondStageFinalized;

    /* Флаг нормального завершнения продаж */
    bool public isSuccessOver;

    /* Флаг того, что начался процесс возврата */
    bool public isRefundingEnabled;

    /*  Сколько сейчас стоит 1 eth в центах, округленная до целых */
    uint public currentEtherRateInCents;

    /* Текущая стоимость токена в центах */
    uint public oneTokenInCents = 7;

    /* Выпущены ли токены для первой стадии */
    bool public isFirstStageTokensMinted;

    /* Выпущены ли токены для второй стадии */
    bool public isSecondStageTokensMinted;

    /* Кол-во токенов для первой стадии */
    uint public firstStageTotalSupply = 112000000;

    /* Кол-во токенов проданных на первой стадии*/
    uint public firstStageTokensSold;

    /* Кол-во токенов для второй стадии */
    uint public secondStageTotalSupply = 229737610;

    /* Кол-во токенов проданных на второй стадии*/
    uint public secondStageTokensSold;

    /* Кол-во токенов, которые находятся в резерве и не продаются, после успеха, они распределяются в соотвествии с Token Policy на второй стадии*/
    uint public secondStageReserve = 60880466;

    /* Кол-во токенов предназначенных для продажи, на второй стадии*/
    uint public secondStageTokensForSale;

    /* Мапа адрес инвестора - кол-во выданных токенов */
    mapping (address => uint) public tokenAmountOf;

    /* Мапа, адрес инвестора - кол-во эфира */
    mapping (address => uint) public investedAmountOf;

    /* Адреса, куда будут распределены токены */
    address public advisorsAccount;
    address public marketingAccount;
    address public supportAccount;
    address public teamAccount;

    /** Возможные состояния
     *
     * - Prefunding: подготовка, залили контракт, но текущая дата меньше даты первой стадии
     * - FirstStageFunding: Продажи первой стадии
     * - FirstStageEnd: Окончены продажи первой стадии, но еще не вызван финализатор первой стадии
     * - SecondStageFunding: Продажи второго этапа
     * - SecondStageEnd: Окончены продажи второй стадии, но не вызван финализатор второй сдадии
     * - Success: Успешно закрыли ICO
     * - Failure: Не собрали Soft Cap
     * - Refunding: Возвращаем собранный эфир
     */
    enum State{PreFunding, FirstStageFunding, FirstStageEnd, SecondStageFunding, SecondStageEnd, Success, Failure, Refunding}

    // Событие покупки токена
    event Invested(address indexed investor, uint weiAmount, uint tokenAmount);

    // Событие изменения курса eth
    event ExchangeRateChanged(uint oldExchangeRate, uint newExchangeRate);

    // Событие изменения даты окончания первой стадии
    event FirstStageStartsAtChanged(uint newFirstStageStartsAt);
    event FirstStageEndsAtChanged(uint newFirstStageEndsAt);

    // Событие изменения даты окончания второй стадии
    event SecondStageStartsAtChanged(uint newSecondStageStartsAt);
    event SecondStageEndsAtChanged(uint newSecondStageEndsAt);

    // Событие изменения Soft Cap'а
    event SoftCapChanged(uint newGoal);

    // Событие изменения Hard Cap'а
    event HardCapChanged(uint newGoal);

    // Конструктор
    function AllocatedCappedCrowdsale(uint _currentEtherRateInCents, address _token, address _destinationMultisigWallet, uint _firstStageStartsAt, uint _firstStageEndsAt, uint _secondStageStartsAt, uint _secondStageEndsAt, address _advisorsAccount, address _marketingAccount, address _supportAccount, address _teamAccount, uint _teamTokensIssueDate) {
        requireNotEmptyAddress(_destinationMultisigWallet);
        // Проверка, что даты установлены
        require(_firstStageStartsAt != 0);
        require(_firstStageEndsAt != 0);

        require(_firstStageStartsAt < _firstStageEndsAt);

        require(_secondStageStartsAt != 0);
        require(_secondStageEndsAt != 0);

        require(_secondStageStartsAt < _secondStageEndsAt);
        require(_teamTokensIssueDate != 0);

        // Токен, который поддерживает сжигание
        token = BurnableCrowdsaleToken(_token);

        destinationMultisigWallet = _destinationMultisigWallet;

        firstStageStartsAt = _firstStageStartsAt;
        firstStageEndsAt = _firstStageEndsAt;
        secondStageStartsAt = _secondStageStartsAt;
        secondStageEndsAt = _secondStageEndsAt;

        // Адреса кошельков для адвизоров, маркетинга, команды
        advisorsAccount = _advisorsAccount;
        marketingAccount = _marketingAccount;
        supportAccount = _supportAccount;
        teamAccount = _teamAccount;

        teamTokensIssueDate = _teamTokensIssueDate;

        currentEtherRateInCents = _currentEtherRateInCents;

        secondStageTokensForSale = secondStageTotalSupply.sub(secondStageReserve);
    }

    /**
     * Функция, инициирующая нужное кол-во токенов для первого этапа продаж, вызвать можно только 1 раз
     */
    function mintTokensForFirstStage() public onlyOwner {
        // Если уже создали токены для первой стадии, делаем откат
        require(!isFirstStageTokensMinted);

        uint tokenMultiplier = 10 ** token.decimals();

        token.mintToAddress(firstStageTotalSupply.mul(tokenMultiplier), address(this));

        isFirstStageTokensMinted = true;
    }

    /**
     * Функция, инициирующая нужное кол-во токенов для второго этапа продаж, только в случае, если это еще не сделано и были созданы токены для первой стадии
     */
    function mintTokensForSecondStage() private {
        // Если уже создали токены для второй стадии, делаем откат
        require(!isSecondStageTokensMinted);

        require(isFirstStageTokensMinted);

        uint tokenMultiplier = 10 ** token.decimals();

        token.mintToAddress(secondStageTotalSupply.mul(tokenMultiplier), address(this));

        isSecondStageTokensMinted = true;
    }

    /**
     * Функция возвращающая текущую стоимость 1 токена в wei
     */
    function getOneTokenInWei() external constant returns(uint){
        return oneTokenInCents.mul(10 ** 18).div(currentEtherRateInCents);
    }

    /**
     * Функция, которая переводит wei в центы по текущему курсу
     */
    function getWeiInCents(uint value) public constant returns(uint){
        return currentEtherRateInCents.mul(value).div(10 ** 18);
    }

    /**
     * Перевод токенов покупателю
     */
    function assignTokens(address receiver, uint tokenAmount) private {
        // Если перевод не удался, откатываем транзакцию
        if (!token.transfer(receiver, tokenAmount)) revert();
    }

    /**
     * Fallback функция вызывающаяся при переводе эфира
     */
    function() payable {
        buy();
    }

    /**
     * Низкоуровневая функция перевода эфира и выдачи токенов
     */
    function internalAssignTokens(address receiver, uint tokenAmount, uint weiAmount) internal {
        // Переводим токены инвестору
        assignTokens(receiver, tokenAmount);

        // Вызываем событие
        Invested(receiver, weiAmount, tokenAmount);

        // Может переопределяеться в наследниках
    }

    /**
     * Инвестиции
     * Должен быть включен режим продаж первой или второй стадии и не собран Hard Cap
     * @param receiver - эфирный адрес получателя
     */
    function internalInvest(address receiver, uint weiAmount, bool isExternalCall) stopInEmergency inFirstOrSecondFundingState notHardCapReached internal {
        State currentState = getState();

        uint tokenMultiplier = 10 ** token.decimals();

        uint amountInCents = getWeiInCents(weiAmount);

        // Очень внимательно нужно менять значения, т.к. для второй стадии 1000%, чтобы учесть дробные значения
        uint bonusPercentage = 0;
        uint bonusStateMultiplier = 1;

        // если запущена первая стадия, в конструкторе уже выпустили нужное кол-во токенов для первой стадии
        if (currentState == State.FirstStageFunding){
            // меньше 25000$ не принимаем
            require(amountInCents >= 2500000);

            // [25000$ - 50000$) - 50% бонуса
            if (amountInCents >= 2500000 && amountInCents < 5000000){
                bonusPercentage = 50;
            // [50000$ - 100000$) - 75% бонуса
            }else if(amountInCents >= 5000000 && amountInCents < 10000000){
                bonusPercentage = 75;
            // >= 100000$ - 100% бонуса
            }else if(amountInCents >= 10000000){
                bonusPercentage = 100;
            }else{
                revert();
            }

        // если запущена вторая стадия
        } else if(currentState == State.SecondStageFunding){
            // Процент проданных токенов, будем считать с множителем 10, т.к. есть дробные значения
            bonusStateMultiplier = 10;

            // Кол-во проданных токенов нужно считать от значения тех токенов, которые предназначены для продаж, т.е. secondStageTokensForSale
            uint tokensSoldPercentage = secondStageTokensSold.mul(100).div(secondStageTokensForSale.mul(tokenMultiplier));

            // меньше 7$ не принимаем
            require(amountInCents >= 700);

            // (0% - 10%) - 20% бонуса
            if (tokensSoldPercentage >= 0 && tokensSoldPercentage < 10){
                bonusPercentage = 200;
            // [10% - 20%) - 17.5% бонуса
            }else if (tokensSoldPercentage >= 10 && tokensSoldPercentage < 20){
                bonusPercentage = 175;
            // [20% - 30%) - 15% бонуса
            }else if (tokensSoldPercentage >= 20 && tokensSoldPercentage < 30){
                bonusPercentage = 150;
            // [30% - 40%) - 12.5% бонуса
            }else if (tokensSoldPercentage >= 30 && tokensSoldPercentage < 40){
                bonusPercentage = 125;
            // [40% - 50%) - 10% бонуса
            }else if (tokensSoldPercentage >= 40 && tokensSoldPercentage < 50){
                bonusPercentage = 100;
            // [50% - 60%) - 8% бонуса
            }else if (tokensSoldPercentage >= 50 && tokensSoldPercentage < 60){
                bonusPercentage = 80;
            // [60% - 70%) - 6% бонуса
            }else if (tokensSoldPercentage >= 60 && tokensSoldPercentage < 70){
                bonusPercentage = 60;
            // [70% - 80%) - 4% бонуса
            }else if (tokensSoldPercentage >= 70 && tokensSoldPercentage < 80){
                bonusPercentage = 40;
            // [80% - 90%) - 2% бонуса
            }else if (tokensSoldPercentage >= 80 && tokensSoldPercentage < 90){
                bonusPercentage = 20;
            // >= 90% - 0% бонуса
            }else if (tokensSoldPercentage >= 90){
                bonusPercentage = 0;
            }else{
                revert();
            }
        } else revert();

        // сколько токенов нужно выдать без бонуса
        uint resultValue = amountInCents.mul(tokenMultiplier).div(oneTokenInCents);

        // с учетом бонуса
        uint tokenAmount = resultValue.mul(bonusStateMultiplier.mul(100).add(bonusPercentage)).div(bonusStateMultiplier.mul(100));

        // краевой случай, когда запросили больше, чем можем выдать
        uint tokensLeft = getTokensLeftForSale(currentState);
        if (tokenAmount > tokensLeft){
            tokenAmount = tokensLeft;
        }

        // Кол-во 0?, делаем откат
        require(tokenAmount != 0);

        // Новый инвестор?
        if (investedAmountOf[receiver] == 0) {
            investorCount++;
        }

        // Кидаем токены инвестору
        internalAssignTokens(receiver, tokenAmount, weiAmount);

        // Обновляем статистику
        updateStat(currentState, receiver, tokenAmount, weiAmount);

        // Шлем на кошелёк эфир
        // Функция - прослойка для возможности переопределения в дочерних классах
        // Если это внешний вызов, то депозит не кладем
        if (!isExternalCall){
            internalDeposit(destinationMultisigWallet, weiAmount);
        }

        // Может переопределяеться в наследниках
    }

    /**
     * Низкоуровневая функция перевода эфира на контракт, функция доступна для переопределения в дочерних классах, но не публична
     */
    function internalDeposit(address receiver, uint weiAmount) internal{
        // Переопределяется в наследниках
    }

    /**
     * Низкоуровневая функция для возврата средств, функция доступна для переопределения в дочерних классах, но не публична
     */
    function internalRefund(address receiver, uint weiAmount) internal{
        // Переопределяется в наследниках
    }

    /**
     * Низкоуровневая функция для включения режима возврата средств
     */
    function internalEnableRefunds() internal{
        // Переопределяется в наследниках
    }

    /**
     * Спец. функция, которая позволяет продавать токены вне ценовой политики, доступка только владельцу
     * Результаты пишутся в общую статистику, без разделения на стадии
     * @param receiver - получатель
     * @param tokenAmount - общее кол-во токенов c decimals!!!
     * @param weiAmount - цена в wei
     */
    function internalPreallocate(State currentState, address receiver, uint tokenAmount, uint weiAmount) internal {
        // Cколько токенов осталось для продажи? Больше этого значения выдать не можем!
        require(getTokensLeftForSale(currentState) >= tokenAmount);

        // Может быть 0, выдаем токены бесплатно
        internalAssignTokens(receiver, tokenAmount, weiAmount);

        // Обновляем статистику
        updateStat(currentState, receiver, tokenAmount, weiAmount);

        // Может переопределяеться в наследниках
    }

    /**
     * Низкоуровневая функция для действий, в случае успеха
     */
    function internalSuccessOver() internal {
        // Переопределяется в наследниках
    }

    /**
     * Обновляем статистику для первой или второй стадии
     */
    function updateStat(State currentState, address receiver, uint tokenAmount, uint weiAmount) private{
        weiRaised = weiRaised.add(weiAmount);
        tokensSold = tokensSold.add(tokenAmount);

        // Если это первая стадия
        if (currentState == State.FirstStageFunding){
            // Увеличиваем стату
            firstStageRaisedInWei = firstStageRaisedInWei.add(weiAmount);
            firstStageTokensSold = firstStageTokensSold.add(tokenAmount);
        }

        // Если это вторая стадия
        if (currentState == State.SecondStageFunding){
            // Увеличиваем стату
            secondStageRaisedInWei = secondStageRaisedInWei.add(weiAmount);
            secondStageTokensSold = secondStageTokensSold.add(tokenAmount);
        }

        investedAmountOf[receiver] = investedAmountOf[receiver].add(weiAmount);
        tokenAmountOf[receiver] = tokenAmountOf[receiver].add(tokenAmount);
    }

    /**
     * Функция, которая позволяет менять адрес аккаунта, куда будут переведены средства, в случае успеха,
     * менять может только владелец и только в случае если продажи еще не завершены успехом
     */
    function setDestinationMultisigWallet(address destinationAddress) public onlyOwner canSetDestinationMultisigWallet{
        destinationMultisigWallet = destinationAddress;
    }

    /**
     * Функция, которая задает текущий курс eth в центах
     */
    function changeCurrentEtherRateInCents(uint value) public onlyOwner {
        // Если случайно задали 0, не откатываем транзакцию
        require(value > 0);

        currentEtherRateInCents = value;

        ExchangeRateChanged(currentEtherRateInCents, value);
    }

    /**
    * Разделил на 2 метода, чтобы не запутаться при вызове
    * Эти функции нужны в 2-х случаях: немного не собрали до Cap'а, сами докидываем необходимую сумму, есть приватные инвесторы, для которых существуют особые условия
    */

    /* Для первой стадии */
    function preallocateFirstStage(address receiver, uint tokenAmount, uint weiAmount) public onlyOwner isFirstStageFundingOrEnd {
        internalPreallocate(State.FirstStageFunding, receiver, tokenAmount, weiAmount);
    }

    /* Для второй стадии, выдать можем не больше остатка для продажи */
    function preallocateSecondStage(address receiver, uint tokenAmount, uint weiAmount) public onlyOwner isSecondStageFundingOrEnd {
        internalPreallocate(State.SecondStageFunding, receiver, tokenAmount, weiAmount);
    }

    /* В случае успеха, заблокированные токены для команды могут быть востребованы только если наступила определенная дата */
    function issueTeamTokens() public onlyOwner inState(State.Success) {
        require(block.timestamp >= teamTokensIssueDate);

        uint teamTokenTransferAmount = teamTokenAmount.mul(10 ** token.decimals());

        if (!token.transfer(teamAccount, teamTokenTransferAmount)) revert();
    }

    /**
    * Включает режим возвратов, только в случае если режим возврата еще не установлен и продажи не завершены успехом
    * Вызвать можно только 1 раз
    */
    function enableRefunds() public onlyOwner canEnableRefunds{
        isRefundingEnabled = true;

        // Сжигаем остатки на балансе текущего контракта
        token.burnAllOwnerTokens();

        internalEnableRefunds();
    }

    /**
     * Покупка токенов, кидаем токены на адрес отправителя
     */
    function buy() public payable {
        internalInvest(msg.sender, msg.value, false);
    }

    /**
     * Покупка токенов через внешние системы
     */
    function externalBuy(address buyerAddress, uint weiAmount) external onlyOwner {
        internalInvest(buyerAddress, weiAmount, true);
    }

    /**
     * Инвесторы могут затребовать возврат средств, только в случае, если текущее состояние - Refunding
     */
    function refund() public inState(State.Refunding) {
        // Получаем значение, которое нам было переведено в эфире
        uint weiValue = investedAmountOf[msg.sender];

        require(weiValue != 0);

        // Кол-во токенов на балансе, берем 2 значения: контракт продаж и контракт токена.
        // Вернуть wei можем только тогда, когда эти значения совпадают, если не совпадают, значит были какие-то
        // манипуляции с токенами и такие ситуации будут решаться в индивидуальном порядке, по запросу
        uint saleContractTokenCount = tokenAmountOf[msg.sender];
        uint tokenContractTokenCount = token.balanceOf(msg.sender);

        require(saleContractTokenCount <= tokenContractTokenCount);

        investedAmountOf[msg.sender] = 0;
        weiRefunded = weiRefunded.add(weiValue);

        // Событие генерируется в наследниках
        internalRefund(msg.sender, weiValue);
    }

    /**
     * Финализатор первой стадии, вызвать может только владелец при условии еще незавершившейся продажи
     * Если вызван halt, то финализатор вызвать не можем
     * Вызвать можно только 1 раз
     */
    function finalizeFirstStage() public onlyOwner isNotSuccessOver {
        require(!isFirstStageFinalized);

        // Сжигаем остатки
        // Всего можем продать firstStageTotalSupply
        // Продали - firstStageTokensSold
        // Все токены на балансе контракта сжигаем - это будет остаток

        token.burnAllOwnerTokens();

        // Переходим ко второй стадии
        // Если повторно вызвать финализатор, то еще раз токены не создадутся, условие внутри
        mintTokensForSecondStage();

        isFirstStageFinalized = true;
    }

    /**
     * Финализатор второй стадии, вызвать может только владелец, и только в случае финилизированной первой стадии
     * и только в случае, если сборы еще не завершились успехом. Если вызван halt, то финализатор вызвать не можем.
     * Вызвать можно только 1 раз
     */
    function finalizeSecondStage() public onlyOwner isNotSuccessOver {
        require(isFirstStageFinalized && !isSecondStageFinalized);

        // Сжигаем остатки
        // Всего можем продать secondStageTokensForSale
        // Продали - secondStageTokensSold
        // Разницу нужно сжечь, в любом случае

        // Если достигнут Soft Cap, то считаем вторую стадию успешной
        if (isSoftCapGoalReached()){
            uint tokenMultiplier = 10 ** token.decimals();

            uint remainingTokens = secondStageTokensForSale.mul(tokenMultiplier).sub(secondStageTokensSold);

            // Если кол-во оставшихся токенов > 0, то сжигаем их
            if (remainingTokens > 0){
                token.burnOwnerTokens(remainingTokens);
            }

            // Переводим на подготовленные аккаунты: advisorsWalletAddress, marketingWalletAddress, teamWalletAddress
            uint advisorsTokenTransferAmount = advisorsTokenAmount.mul(tokenMultiplier);
            uint marketingTokenTransferAmount = marketingTokenAmount.mul(tokenMultiplier);
            uint supportTokenTransferAmount = supportTokenAmount.mul(tokenMultiplier);

            // Токены для команды заблокированы до даты teamTokensIssueDate и могут быть востребованы, только при вызове спец. функции
            // issueTeamTokens

            if (!token.transfer(advisorsAccount, advisorsTokenTransferAmount)) revert();
            if (!token.transfer(marketingAccount, marketingTokenTransferAmount)) revert();
            if (!token.transfer(supportAccount, supportTokenTransferAmount)) revert();

            // Контракт выполнен!
            isSuccessOver = true;

            // Вызываем метод успеха
            internalSuccessOver();
        }else{
            // Если не собрали Soft Cap, то сжигаем все токены на балансе контракта
            token.burnAllOwnerTokens();
        }

        isSecondStageFinalized = true;
    }

    /**
     * Позволяет менять владельцу даты стадий
     */
    function setFirstStageStartsAt(uint time) public onlyOwner {
        firstStageStartsAt = time;

        // Вызываем событие
        FirstStageStartsAtChanged(firstStageStartsAt);
    }

    function setFirstStageEndsAt(uint time) public onlyOwner {
        firstStageEndsAt = time;

        // Вызываем событие
        FirstStageEndsAtChanged(firstStageEndsAt);
    }

    function setSecondStageStartsAt(uint time) public onlyOwner {
        secondStageStartsAt = time;

        // Вызываем событие
        SecondStageStartsAtChanged(secondStageStartsAt);
    }

    function setSecondStageEndsAt(uint time) public onlyOwner {
        secondStageEndsAt = time;

        // Вызываем событие
        SecondStageEndsAtChanged(secondStageEndsAt);
    }

    /**
     * Позволяет менять владельцу Cap'ы
     */
    function setSoftCapInCents(uint value) public onlyOwner {
        require(value > 0);

        softCapFundingGoalInCents = value;

        // Вызываем событие
        SoftCapChanged(softCapFundingGoalInCents);
    }

    function setHardCapInCents(uint value) public onlyOwner {
        require(value > 0);

        hardCapFundingGoalInCents = value;

        // Вызываем событие
        HardCapChanged(hardCapFundingGoalInCents);
    }

    /**
     * Проверка сбора Soft Cap'а
     */
    function isSoftCapGoalReached() public constant returns (bool) {
        // Проверка по текущему курсу в центах, считает от общих продаж
        return getWeiInCents(weiRaised) >= softCapFundingGoalInCents;
    }

    /**
     * Проверка сбора Hard Cap'а
     */
    function isHardCapGoalReached() public constant returns (bool) {
        // Проверка по текущему курсу в центах, считает от общих продаж
        return getWeiInCents(weiRaised) >= hardCapFundingGoalInCents;
    }

    /**
     * Возвращает кол-во нераспроданных токенов, которые можно продать, в зависимости от стадии
     */
    function getTokensLeftForSale(State forState) public constant returns (uint) {
        // Кол-во токенов, которое адрес контракта можеть снять у owner'а и есть кол-во оставшихся токенов, из этой суммы нужно вычесть кол-во которое не участвует в продаже
        uint tokenBalance = token.balanceOf(address(this));
        uint tokensReserve = 0;
        if (forState == State.SecondStageFunding) tokensReserve = secondStageReserve.mul(10 ** token.decimals());

        if (tokenBalance <= tokensReserve){
            return 0;
        }

        return tokenBalance.sub(tokensReserve);
    }

    /**
     * Получаем стейт
     *
     * Не пишем в переменную, чтобы не было возможности поменять извне, только вызов функции может отразить текущее состояние
     * См. граф состояний
     */
    function getState() public constant returns (State) {
        // Контракт выполнен
        if (isSuccessOver) return State.Success;

        // Контракт находится в режиме возврата
        if (isRefundingEnabled) return State.Refunding;

        // Контракт еще не начал действовать
        if (block.timestamp < firstStageStartsAt) return State.PreFunding;

        //Если первая стадия - не финализирована
        if (!isFirstStageFinalized){
            // Флаг того, что текущая дата находится в интервале первой стадии
            bool isFirstStageTime = block.timestamp >= firstStageStartsAt && block.timestamp <= firstStageEndsAt;

            // Если идет первая стадия
            if (isFirstStageTime) return State.FirstStageFunding;
            // Иначе первый этап - закончен
            else return State.FirstStageEnd;

        } else {

            // Если первая стадия финализирована и текущее время блок чейна меньше начала второй стадии, то это означает, что первая стадия - окончена
            if(block.timestamp < secondStageStartsAt)return State.FirstStageEnd;

            // Флаг того, что текущая дата находится в интервале второй стадии
            bool isSecondStageTime = block.timestamp >= secondStageStartsAt && block.timestamp <= secondStageEndsAt;

            // Первая стадия финализирована, вторая - финализирована
            if (isSecondStageFinalized){

                // Если набрали Soft Cap при условии финализации второй сдадии - это успешное закрытие продаж
                if (isSoftCapGoalReached())return State.Success;
                // Собрать Soft Cap не удалось, текущее состояние - провал
                else return State.Failure;

            }else{

                // Вторая стадия - не финализирована
                if (isSecondStageTime)return State.SecondStageFunding;
                // Вторая стадия - закончилась
                else return State.SecondStageEnd;

            }
        }
    }

   /**
    * Модификаторы
    */

    /** Только, если текущее состояние соответсвует состоянию  */
    modifier inState(State state) {
        require(getState() == state);

        _;
    }

    /** Только, если текущее состояние - продажи: первая или вторая стадия */
    modifier inFirstOrSecondFundingState() {
        State curState = getState();
        require(curState == State.FirstStageFunding || curState == State.SecondStageFunding);

        _;
    }

    /** Только, если не достигнут Hard Cap */
    modifier notHardCapReached(){
        require(!isHardCapGoalReached());

        _;
    }

    /** Только, если текущее состояние - продажи первой стадии или первая стадия закончилась */
    modifier isFirstStageFundingOrEnd() {
        State curState = getState();
        require(curState == State.FirstStageFunding || curState == State.FirstStageEnd);

        _;
    }

    /** Только, если контракт не финализирован */
    modifier isNotSuccessOver() {
        require(!isSuccessOver);

        _;
    }

    /** Только, если идет вторая стадия или вторая стадия завершилась */
    modifier isSecondStageFundingOrEnd() {
        State curState = getState();
        require(curState == State.SecondStageFunding || curState == State.SecondStageEnd);

        _;
    }

    /** Только, если еще не включен режим возврата и продажи не завершены успехом */
    modifier canEnableRefunds(){
        require(!isRefundingEnabled && getState() != State.Success);

        _;
    }

    /** Только, если продажи не завершены успехом */
    modifier canSetDestinationMultisigWallet(){
        require(getState() != State.Success);

        _;
    }
}
