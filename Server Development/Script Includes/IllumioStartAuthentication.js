var IllumioStartAuthentication = Class.create();
IllumioStartAuthentication.prototype = {

    initialize: function () {
        this.scheduledJobsGr = new GlideRecord('x_illu2_illumio_illumio_scheduled_jobs');
        this.utils = new x_illu2_illumio.IllumioUtils();
    },

    AUTHENTICATION_API_ENDPOINT: '/api/v2/product_version',
    /**
     * Creates a scheudle job and triggers the authentication process
     */
    process: function () {

        // Create new job
        this.scheduledJobsGr.job_started = new GlideDateTime();
        this.scheduledJobsGr.job_status = 'running';
        this.scheduledJobsGr.current_operation = 'Connectivity check with PCE';
        this.scheduledJobsGr.logs = '[' + new Date(new GlideDateTime().getNumericValue()).toISOString() + '] MID Server is running and it is up-to-date';
        this.scheduledJobsGr.logs += '\n[' + new Date(new GlideDateTime().getNumericValue()).toISOString() + '] MID Server user has required roles';
        this.scheduledJobsGr.logs += '\n[' + new Date(new GlideDateTime().getNumericValue()).toISOString() + '] Started validating the connectivity with PCE';
        this.scheduledJobsGr.job_type = 'connectivity_check';
        var jobSysId = this.scheduledJobsGr.insert();

        if (!this.startAuthetication(jobSysId)) {
            this.utis.handleFailure(jobSysId, 'Connectivity check start error', 'Adding to ECC queue failed');
        }
    },

    /**
     * Starts the authentication via MID server for check PCE configuration
     * @params {String} jobSysId system id of the process monitor
     * @return {boolean} Whether the process of creating ECC queue passed or not
     */
    startAuthetication: function (jobSysId) {

        gs.info("Initiating a job to check PCE connectivity.");
        var pceConfig = new IllumioGetPCEConfiguration().getConfiguration();

        if (pceConfig) {
            var parameters = {
                pce_url: pceConfig.pceUrl,
                pce_authorization: gs.base64Encode(pceConfig.pceUsername + ':' + pceConfig.pceSecret),
                pce_endpoint: this.AUTHENTICATION_API_ENDPOINT,
                illumio_scheduled_job_id: jobSysId,
                time_zone: gs.getSession().getTimeZoneName(),
                enable_pce_mid_proxy: pceConfig.enable_pce_mid_proxy,
                retry_params: JSON.stringify(pceConfig.retry_params)
            };
            var illumioAddToECCQueue = new IllumioAddToECCQueue('IllumioAuthenticateToPCE', pceConfig.midServer, parameters);
            var addToECCQueue = illumioAddToECCQueue.insert();

            if (!addToECCQueue) {
                this.utis.handleFailure(jobSysId, 'Adding to ECC queue', 'Adding task for async job of fetching workloads to ECC queue failed');
                return false;
            }
            return true;
        } else {
            this.utis.handleFailure(jobSysId, 'PCEConfiguration', 'Cannot find PCE configuration');
            return false;
        }

    },

    type: 'IllumioStartAuthentication'
};