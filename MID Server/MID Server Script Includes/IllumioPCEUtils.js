ms.include("IllumioHttpIncludes");
var IllumioPCEUtils = Class.create();

IllumioPCEUtils.prototype = {
    initialize: function (timezone) {
        this.logger = new IllumioLogUtil();

        this.timeZone = timezone;
        this.SimpleDF = Packages.java.text.SimpleDateFormat;
        this.TimeZone = Packages.java.util.TimeZone;

        this.snowDateFormat = this.SimpleDF("yyyy-MM-dd HH:mm:ss");
        this.illumioDateFormat = this.SimpleDF("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
        
        this.snowDateFormat.setTimeZone(this.TimeZone.getTimeZone(this.timeZone));
        this.illumioDateFormat.setTimeZone(this.TimeZone.getTimeZone('UTC'));
    },

    /**
     * Handles exception by logging and setting job status as failed
     * @param {String} exception - Exception message
     * @param {String} jobId - sys_id of the job
     */
    handleException: function (exception, jobSysId) {

        if (jobSysId) {
            var payload = {
                job_status: 'failed',
                logs: [exception],
                current_operation: 'Connectivity check Failed',
                job_completed: this.snowDateFormat.format(new Date()) + ""
            };
            this._updateJobRecord(jobSysId, payload);
        }
    },

    /**
     * Updates scheduled job record with given parameters
     * @param {String} jobId sys_id of the job record
     * @param {String} jonContent content of the job 
     */
    _updateJobRecord: function (jobSysId, jobContent) {

        var jobGr = new GlideRecord('x_illu2_illumio_illumio_scheduled_jobs');
        if (jobGr.get(jobSysId)) {
            // Update only if job is not invalidated
            if (jobGr.job_status != 'failed') {
                for (var key in jobContent) {
                    if (jobContent.hasOwnProperty(key)) {
                        if (key != "logs") {
                            jobGr[key] = jobContent[key];
                        } else {
                            for (var log_ind = 0; log_ind < jobContent[key].length; log_ind++) {
                                jobGr[key] += '\n' + "[" + this.illumioDateFormat.format(new Date()) + "] " + jobContent[key][log_ind];
                            }
                        }
                    }
                }
                jobGr.update();
            } else {
                this.logger._info('[_updateJobRecord] Given job is invalidated. Aborting further actions.');
            }
        } else {
            this.logger._error('[_updateJobRecord] Data sync job record for given sys_id (' + jobSysId + ') does not exist.');
        }
    },

    /**
     * Returns the parameter configured in the config.xml file of the MID server
     * @param {String} parm name of the config parameter
     * @returns {String} value of the parameter
     **/
    getMidConfigParam: function (parm) {
        try {
            var midServer = Packages.com.service_now.mid.MIDServer.get();
            var config = midServer.getConfig();
            var result = config.getParameter(parm);
            var result_alternative = config.getProperty(parm);

            if (result) {
                return result;
            } else if (result_alternative) {
                return result_alternative;
            } else {
                config = Packages.com.service_now.mid.services.Config.get();
                result = config.getProperty(parm);
                return result;
            }
        } catch (error) {
            this.logger._except("Failed to load mid server configurations.");
            return null;
        }
    },

    /**
     * Returns the decoded Base64 string
     * @param {String} base64String Base64 string
     * @returns {String} decoded string
     **/
    decodeBase64: function (base64String) {
        var decodedPceAuthorization = Base64.getDecoder().decode(base64String);
        var decodedPceAuthorizationString = decodedPceAuthorization.map(function(c) { return String.fromCharCode(c); }).join("");
        return decodedPceAuthorizationString;
    },

    /**
     * Returns the port from a URL
     * @param {String} url URL
     * @returns {String} port
     **/
    getPortFromUrl: function (url) {
        new IllumioLogUtil()._debug("getPortFromUrl: " + url);
        var port = parseInt(url.substring(url.lastIndexOf(':') + 1));
        return isNaN(port) ? 443 : port;        
    },

    type: 'IllumioPCEUtils'
};