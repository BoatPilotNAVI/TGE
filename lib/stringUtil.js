var stringUtil = {
    newLine : function (value) {
        if (value == undefined){
            value = "";
        };

        return value + "\n";
    }
};

module.exports = stringUtil;