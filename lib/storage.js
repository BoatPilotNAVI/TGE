const Moment = require("moment");
const Constant = require("../lib/constant.js");

var storage = {
    setProdMode : function(opts){
        this.ownerAddress = opts.ownerAddress || '0x0';
        this.destinationWalletAddress = opts.destinationWalletAddress || '0x0';

        this.advisorsAccountAddress = opts.advisorsAccountAddress || '0x0';
        this.marketingAccountAddress = opts.marketingAccountAddress || '0x0';
        this.teamAccountAddress = opts.teamAccountAddress || '0x0';
        this.supportAccountAddress = opts.supportAccountAddress || '0x0';

        this.advisorsTokensAmount = 8.040817 * Constant.MILLION;
        this.marketingTokensAmount = 3.446064 * Constant.MILLION;
        this.supportTokensAmount = 3.446064 * Constant.MILLION;
        this.teamTokensAmount = 45.947521 * Constant.MILLION;

        this.teamTokensIssueDate = "2018-08-15 12:00:00";


        // Адрес, куда будут переведены токены, в случае успеха

        // Даты проведения 1 стадии
        this.firstStageDateStartTimestamp =  Moment().subtract(1, "days").unix();
        this.firstStageDateEndTimestamp =  Moment().add(10, "days").unix();

        // Даты проведения 2 стадии
        this.secondStageDateStartTimestamp =  Moment().add(11, "days").unix();
        this.secondStageDateEndTimestamp =  Moment().add(20, "days").unix();

        // Можно поменять начальное кол-во токенов, которое будет продаваться
        this.tokenSymbol = 'NAVI';
        this.tokenName = 'BoatPilot Token';
        this.tokenDecimals = 18;

        // Стоимость токена в центах
        //-
        this.oneTokenInCents =  7 * Constant.CENT;
        this.etherRateInCents = 330 * Constant.DOLLAR;

        this.firstStageDateStart = Moment.unix(this.firstStageDateStartTimestamp).format("YYYY-MM-DD HH:mm:ss");
        this.firstStageDateEnd = Moment.unix(this.firstStageDateEndTimestamp).format("YYYY-MM-DD HH:mm:ss");

        this.secondStageDateStart = Moment.unix(this.secondStageDateStartTimestamp).format("YYYY-MM-DD HH:mm:ss");
        this.secondStageDateEnd = Moment.unix(this.secondStageDateEndTimestamp).format("YYYY-MM-DD HH:mm:ss");

        this.teamTokensIssueDateTimestamp = Moment(this.teamTokensIssueDate).unix();

        //-
        this.softCapGoalInCents = 3.92 * Constant.MILLION * Constant.DOLLAR;
        //-
        this.hardCapGoalInCents = 9.85 * Constant.MILLION * Constant.DOLLAR;

        //-
        this.firstStageTotalSupply = 112 * Constant.MILLION ;
        //-
        this.secondStageTotalSupply = 229.737610 * Constant.MILLION ;
        // резервное кол-во токенов, которое предназначено для распределения
        //-
        this.secondStageReserve = 37.289285 * Constant.MILLION ;

        // для тестов!!!
        this.secondStageTokensLeft = this.secondStageTotalSupply - this.secondStageReserve;

    },

    setDevMode : function(opts){
        this.ownerAddress = opts.ownerAddress || '0x0';
        this.destinationWalletAddress = opts.destinationWalletAddress || '0x0';

        this.advisorsAccountAddress = opts.advisorsAccountAddress || '0x0';
        this.marketingAccountAddress = opts.marketingAccountAddress || '0x0';
        this.teamAccountAddress = opts.teamAccountAddress || '0x0';
        this.supportAccountAddress = opts.supportAccountAddress || '0x0';

        this.advisorsTokensAmount = 8.040817 * Constant.MILLION;
        this.marketingTokensAmount = 3.446064 * Constant.MILLION;
        this.supportTokensAmount = 3.446064 * Constant.MILLION;
        this.teamTokensAmount = 45.947521 * Constant.MILLION;

        this.teamTokensIssueDate = "2018-08-15 13:00:00";


        // Адрес, куда будут переведены токены, в случае успеха

        // Даты проведения 1 стадии
        this.firstStageDateStartTimestamp =  Moment().add(1, "days").unix();
        this.firstStageDateEndTimestamp =  Moment().add(10, "days").unix();

        // Даты проведения 2 стадии
        this.secondStageDateStartTimestamp =  Moment().add(15, "days").unix();
        this.secondStageDateEndTimestamp =  Moment().add(30, "days").unix();

        // Можно поменять начальное кол-во токенов, которое будет продаваться
        this.tokenSymbol = 'NAVI';
        this.tokenName = 'BoatPilot Token';
        this.tokenDecimals = 18;

        // Стоимость токена в центах
        //-
        this.oneTokenInCents =  7 * Constant.CENT;
        this.etherRateInCents = 330 * Constant.DOLLAR;

        this.firstStageDateStart = Moment.unix(this.firstStageDateStartTimestamp).format("YYYY-MM-DD HH:mm:ss");
        this.firstStageDateEnd = Moment.unix(this.firstStageDateEndTimestamp).format("YYYY-MM-DD HH:mm:ss");

        this.secondStageDateStart = Moment.unix(this.secondStageDateStartTimestamp).format("YYYY-MM-DD HH:mm:ss");
        this.secondStageDateEnd = Moment.unix(this.secondStageDateEndTimestamp).format("YYYY-MM-DD HH:mm:ss");

        this.teamTokensIssueDateTimestamp = Moment(this.teamTokensIssueDate).unix();

        //-
        this.softCapGoalInCents = 3.92 * Constant.MILLION * Constant.DOLLAR;
        //-
        this.hardCapGoalInCents = 9.85 * Constant.MILLION * Constant.DOLLAR;

        //-
        this.firstStageTotalSupply = 112 * Constant.MILLION;
        //-
        this.secondStageTotalSupply = 229.737610 * Constant.MILLION ;
        // резервное кол-во токенов, которое предназначено для распределения
        //-
        this.secondStageReserve = 60.880466 * Constant.MILLION ;

        // для тестов!!!
        this.secondStageTokensLeft = this.secondStageTotalSupply - this.secondStageReserve;

    }
};

module.exports = storage;