var IllumioPollAsyncJobStatus = Class.create();
IllumioPollAsyncJobStatus.prototype = {

    initialize: function (asyncJobLocation, retryAfter, jobSysID, primaryKey, resultTable, keysToMap, retryCount, illumio_job_id, job_identifier) {

        this.asyncJobLocation = asyncJobLocation;
        this.retryAfter = retryAfter;
        this.jobSysID = jobSysID;
        this.resultTable = resultTable;
        this.keysToMap = keysToMap;
        this.primaryKey = primaryKey;
        this.retryCount = retryCount;
        this.illumio_job_id = illumio_job_id;
        this.job_identifier = job_identifier;
    },
    /**
     * Calls the MID server script include to poll the async job status
     */
    execute: function () {

        var pceConfig = new IllumioGetPCEConfiguration().getConfiguration();

        if (pceConfig) {
            try {
                var parameters = {
                    pce_url: pceConfig.pceUrl,
                    pce_endpoint: '/api/v2' + this.asyncJobLocation,
                    pce_authorization: gs.base64Encode(pceConfig.pceUsername + ':' + pceConfig.pceSecret),
                    pce_async_job_sys_id: this.jobSysID + '',
                    illumio_scheduled_job_id: this.illumio_job_id + '',
                    operation: 'get_async_job_status',
                    result_table_name: this.resultTable,
                    keys_to_map: this.keysToMap,
                    primary_key: this.primaryKey,
                    retry_count: this.retryCount,
                    job_identifier: this.job_identifier,
                    time_zone: gs.getSession().getTimeZoneName(),
                    pce_mid_proxy: pceConfig.enable_pce_mid_proxy
                };

                var illumioAddToECCQueue = new IllumioAddToECCQueue('IllumioManageAsyncJobs', pceConfig.midServer, parameters);
                illumioAddToECCQueue.insert();

            } catch (exception) {
                gs.error('Exception occurred while preparing request data to poll status. Exception: ' + exception);
            }

        } else {
            gs.error('No configurations available');
        }
    },

    type: 'IllumioPollAsyncJobStatus'
};
