const WEI = 1;

const TEN = 10;
const HUNDRED = 10 * TEN;
const THOUSAND = 10 * HUNDRED;
const MILLION = 1000 * THOUSAND;
const BILLION = 1000 * MILLION;

const SECOND = 1;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const CENT = 1;
const DOLLAR = 100 * CENT;

var constant = {
    WEI : WEI,
    ETHER : Math.pow(10, 18) * WEI,
    CENT : CENT,
    DOLLAR : DOLLAR,

    TEN : TEN,
    HUNDRED : HUNDRED,
    THOUSAND : THOUSAND,
    MILLION : MILLION,
    BILLION : BILLION,

    SECOND : SECOND,
    MINUTE : MINUTE,
    HOUR : HOUR,
    DAY : DAY
};

module.exports = constant;