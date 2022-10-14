var IllumioUpdatePCE = Class.create();
IllumioUpdatePCE.prototype = Object.extendsObject(global.AbstractAjaxProcessor, {

    /**
     * Starts the process of updating workloads
     **/
    action: function () {

        var pceConfig = new IllumioGetPCEConfiguration().getConfiguration();
        var mappingOfFields = new IllumioGetPCEConfiguration().getMappedFields();
        mappingOfFields = JSON.stringify(mappingOfFields.fields);
        var payload = this.getParameter('sysparm_payload');
        var operation = this.getParameter('sysparm_operation');
        var jobSysId = this.getParameter('sysparm_jobSysId');
        var partialSucc = this.getParameter('sysparm_partial');
        var count = this.getParameter('sysparm_count');
        var sys_id = this.getParameter('sysparm_custom_record_sys_id');
        var skippedWorkloads = this.getParameter('sysparm_skipped_count');
        // add to ECC queue
        try {
            var parameters = {
                sys_id: sys_id,
                jobSysId: jobSysId,
                partialSucc: partialSucc,
                skipped: skippedWorkloads + '',
                payload: payload,
                count: count + '',
                operation: operation,
                pce_url: pceConfig.pceUrl,
                pce_secret: pceConfig.pceSecret,
                pce_username: pceConfig.pceUsername,
                fieldMappings: mappingOfFields,
                pce_org_id: pceConfig.pceOrganizationID + "",
                pce_authorization: gs.base64Encode(pceConfig.pceUsername + ':' + pceConfig.pceSecret),
                time_zone: gs.getSession().getTimeZoneName(),
                batch_size: gs.getProperty('x_illu2_illumio.bulk_operation_batch_size', 1000),
                pce_mid_proxy: pceConfig.enable_pce_mid_proxy
            };

            var illumioAddToECCQueue = new IllumioAddToECCQueue('IllumioUpdateWorkloads', pceConfig.midServer, parameters);
            illumioAddToECCQueue.insert();

            if (operation == "create")
                gs.info("Creating new workload(s) on PCE");
            else if (operation == "update")
                gs.info("Updating workload(s) on PCE");
            else if (operation == "updateCreate")
                gs.info("Creating/Updating record(s) on PCE");
            else
                gs.error("Error while updating or creating a workload in PCE");

        } catch (exception) {
            gs.error('Exception occurred while preparing request data. Exception: ' + exception);
            var scheduledJobsGr = new GlideRecord('x_illu2_illumio_illumio_scheduled_jobs');
            if (scheduledJobsGr.get(jobSysId)) {
                scheduledJobsGr.job_status = 'failed';
                scheduledJobsGr.job_completed = new GlideDateTime();
                scheduledJobsGr.logs += '\n[' + new Date(new GlideDateTime().getNumericValue()).toISOString() + '] Synchronization with PCE failed';
                scheduledJobsGr.update();
            } else {
                gs.error('Scheduled job with sys_id ' + jobSysId + ' not found of data syncing');
            }
        }
    },

    type: 'IllumioUpdatePCE'
});