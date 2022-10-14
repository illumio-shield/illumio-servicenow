ms.include("IllumioMIDConstants");
var IllumioAuthenticateToPCE = Class.create();

IllumioAuthenticateToPCE.prototype = {
    initialize: function() {

        // set the parameters here
        this.logger = new IllumioLogUtil();

        
        this.pceUrl = probe.getParameter('glide.jms.pce_url');
        this.pceEndpoint = probe.getParameter('glide.jms.pce_endpoint');
        this.pceAuthorization = probe.getParameter('glide.jms.pce_authorization');
        this.pceMIDProxy = probe.getParameter('glide.jms.enable_pce_mid_proxy');

        this.timeZone = probe.getParameter('glide.jms.time_zone');
        this.SimpleDF = Packages.java.text.SimpleDateFormat;
        this.TimeZone = Packages.java.util.TimeZone;

        this.illumio_job_id = probe.getParameter('glide.jms.illumio_scheduled_job_id');

        this.snowDateFormat = this.SimpleDF("yyyy-MM-dd HH:mm:ss");
        this.illumioDateFormat = this.SimpleDF("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");

        this.snowDateFormat.setTimeZone(this.TimeZone.getTimeZone(this.timeZone));
        this.illumioDateFormat.setTimeZone(this.TimeZone.getTimeZone('UTC'));

        this.utils = new IllumioPCEUtils(this.timeZone);
        this.protocol = this.utils.getPortFromUrl(this.pceUrl);

        this.retryParams = null;
        try {
            this.retryParams = JSON.parse(probe.getParameter('glide.jms.retry_params'));
        } catch(e) {
            this.logger._except('IllumioAuthenticateToPCE - Cannot parse the JSON of retry parameters');
        }
        
        var decodedAuth = this.utils.decodeBase64(this.pceAuthorization);
        this.pceUsername = decodedAuth.substring(0, decodedAuth.indexOf(":"));
        this.pcePassword = decodedAuth.substring(decodedAuth.indexOf(":") + 1);
        this.pceHttpClient = new IllumioHTTPClient(this.pceUrl, this.pceUsername, this.pcePassword, this.protocol, this.pceMIDProxy, this.retryParams);
    },

    run: function() {
        if (this.utils.getMidConfigParam("mid.proxy.use_proxy")) {
            if (this.pceMIDProxy == "true") {
                this.utils._updateJobRecord(this.illumio_job_id, {
                    logs: ["Found a proxy configured between MID server and ServiceNow and MID server and the PCE",
                        "Validated the connectivity between MID server and ServiceNow through proxy",
                        "Validated the connectivity between MID server and the PCE through proxy"
                    ]
                });
            } else {
                this.utils._updateJobRecord(this.illumio_job_id, {
                    logs: ["Found a proxy configured between MID server and ServiceNow",
                        "Validated the connectivity between MID server and ServiceNow through proxy"
                    ]
                });
            }
        } else {
            if (this.pceMIDProxy == "true") {
                this.utils._updateJobRecord(this.illumio_job_id, {
                    logs: ["Proxy is not configured between MID server and the PCE", ]
                });
            }
        }
        this.utils._updateJobRecord(this.illumio_job_id, {
            logs: ["Checking connectivity between MID Server and the PCE (" + this.pceUrl + ")"]
        });


        // Authenticating using given authorization
        
        try {
            var response = this.pceHttpClient.get(this.pceEndpoint, '');
            this.logger._debug("Response code of authorization is: " + response.status);

            if (response.status != "200" && response.status != "202") {
                this.logger._error("Could not connect to PCE.");
                if (response.status == "401") {
                    this.utils.handleException("Authentication failed with PCE. Message: Invalid API Key/Secret", this.illumio_job_id);
                } else if (response.status == "0") {
                    this.utils.handleException("Authentication failed with PCE. Message: Cannot find PCE " + this.pceUrl, this.illumio_job_id);
                } else {
                    this.utils.handleException("Connectivity check to PCE failed. Response status code: " + response.status, this.illumio_job_id);
                }
                return false;
            }

            var pce_version = response.data.version;
            var payload = {
                job_status: 'completed',
                current_operation: 'Connectivity check successful',
                logs: ["Successfully authenticated the PCE credentials", "PCE is running on " + pce_version + " version"],
                job_completed: this.snowDateFormat.format(new Date()) + ""
            };
            this.utils._updateJobRecord(this.illumio_job_id, payload);
            return true;
        } catch (exception) {
            this.logger._except('IllumioAuthenticateToPCE - Exception occurred while authenticating the PCE credentials. Exception: ' + exception);
            this.utils.handleException('Exception occurred while authenticating the PCE credentials. Exception: ' + exception, this.illumio_job_id);
        }
    },


    type: 'IllumioAuthenticateToPCE'
};