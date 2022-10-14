var IllumioLogUtil = Class.create();

IllumioLogUtil.prototype = {
    initialize: function() {
        this.debug1 = ms.getConfigParameter("debug.logging") == 'true';
        this.infoPrefix = '>>> INFO: IllumioLogs: ';
        this.debugPrefix = '>>> DEBUG: IllumioLogs: ';
        this.errorPrefix = '>>> ERROR: IllumioLogs: ';
        this.exceptionPrefix = '>>> EXCEPTION: IllumioLogs: ';
    },

    /**
     * Add info logs in mid server
     * @params {String} msg Message to log
     */
    _info: function(msg) {
        ms.log(this.infoPrefix + msg);
    },

    /**
     * Add debug logs in mid server
     * @params {String} msg Message to log
     */
    _debug: function(msg) {
        ms.log(this.debugPrefix + msg);
    },

    /**
     * Add error logs in mid server
     * @params {String} msg Message to log
     */
    _error: function(msg) {
        ms.log(this.errorPrefix + msg);
    },

    /**
     * Add except logs in mid server
     * @params {String} msg Message to log
     */
    _except: function(msg) {
        ms.log(this.exceptionPrefix + msg);
    },

    type: "IllumioLogUtil"
};