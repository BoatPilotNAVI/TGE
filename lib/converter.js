var converter = {
    getTokenValue : function(count, decimals){
        let multiplier = new web3.BigNumber(10).pow(decimals);
        let bigCount = (count instanceof web3.BigNumber)?count:new web3.BigNumber(count);
        let result = bigCount.mul(multiplier);

        return result.toString();
    }
};

module.exports = converter;