var IllumioStartDiscovery = Class.create();
IllumioStartDiscovery.prototype = {
    initialize: function() {
        this.scheduledJobsGr = new GlideRecord('x_illu2_illumio_illumio_scheduled_jobs');
        this.utils = new x_illu2_illumio.IllumioUtils();
    },

    /**
     * Starts the discovery process
     * @returns {Boolean} true if the job is successfully created else false
     */
    process: function() {

        var userName = gs.getUser().getID();
        // Check if any job is already in running state
        gs.info("Initiating Discovery");

        var gr = new GlideRecord('x_illu2_illumio_illumio_pce_field_mapping');
        gr.setLimit(1);
        gr.query();
        if (!gr.hasNext()) {
            gs.error('Can not start the discovery as there is no PCE field mapping configured');
            this.scheduledJobsGr.job_started = new GlideDateTime();
            this.scheduledJobsGr.job_status = 'failed';
            this.scheduledJobsGr.current_operation = 'PCE Field Mapping Missing';
            this.scheduledJobsGr.job_type = 'data collection';
            this.scheduledJobsGr.job_completed = new GlideDateTime();
            this.scheduledJobsGr.logs = '[' + new Date(new GlideDateTime().getNumericValue()).toISOString() + '] Can not start the discovery as there is no PCE field mapping configured';
            this.scheduledJobsGr.insert();
            return false;
        }
        var runningJobsCount = new GlideAggregate("x_illu2_illumio_illumio_scheduled_jobs");
        runningJobsCount.addQuery('job_status', 'running');
        runningJobsCount.addAggregate('COUNT');
        runningJobsCount.query();
        if (runningJobsCount.next()) {

            this.scheduledJobsGr.initialize();
            this.scheduledJobsGr.job_owner = userName;
            if (runningJobsCount.getAggregate('COUNT') > 0) {
                gs.info('Can not start discovery as there is already one discovery job in running status');
                this.scheduledJobsGr.job_started = new GlideDateTime();
                this.scheduledJobsGr.job_status = 'failed';
                this.scheduledJobsGr.current_operation = 'Already running';
                this.scheduledJobsGr.job_type = 'data collection';
                this.scheduledJobsGr.job_completed = new GlideDateTime();
                this.scheduledJobsGr.logs = '[' + new Date(new GlideDateTime().getNumericValue()).toISOString() + '] Can not start discovery as there is already one discovery job in running status';
                this.scheduledJobsGr.insert();
                return false;
            } else {
                // Create new job
                this.scheduledJobsGr.job_started = new GlideDateTime();
                this.scheduledJobsGr.job_status = 'running';
                this.scheduledJobsGr.current_operation = 'Fetching PCE data';
                this.scheduledJobsGr.logs = '[' + new Date(new GlideDateTime().getNumericValue()).toISOString() + '] Illumio data collection started';
                this.scheduledJobsGr.logs += '\n[' + new Date(new GlideDateTime().getNumericValue()).toISOString() + '] Fetching PCE data';
                this.scheduledJobsGr.job_type = 'data collection';
                var jobSysId = this.scheduledJobsGr.insert();

                var discoveryStartStatus = this.createAsyncJobs(jobSysId);
                if (!discoveryStartStatus) {
                    this.utis.handleFailure(jobSysId, 'Discovery start error', 'Adding to ECC queue failed');
                }
            }
        }
    },

    WORKLOAD_PARAMS: {
        keys_to_map: ['href', 'hostname', 'labels', 'agent', 'public_ip', 'interfaces'],
        primary_key_to_map: 'hostname',
    },
    LABEL_PARAMS: {
        keys_to_map: ['href', 'key', 'value'],
        primary_key_to_map: 'value',
    },

    /**
     * To create async jobs on PCE
     * @param {String} jobSysId - Job sys id
     * @returns {Boolean} true if the job is successfully created else false
     */
    createAsyncJobs: function(jobSysId) {

        gs.info('Creating async jobs on PCE');
        var pceConfig = new IllumioGetPCEConfiguration().getConfiguration();
        var types = ['workload', 'label'];
        if (pceConfig) {

            try {
                for (var typeIndex in types) {
                    var type = types[typeIndex];
                    var params = this[type.toUpperCase() + '_PARAMS'];
                    var parametersToSend = {
                        pce_url: pceConfig.pceUrl,
                        pce_authorization: gs.base64Encode(pceConfig.pceUsername + ':' + pceConfig.pceSecret),
                        pce_endpoint: '/api/v2/orgs/' + (pceConfig.pceOrganizationID || '1') + '/' + type + 's',
                        operation: 'create_async_job',
                        mapping_table_name: 'x_illu2_illumio_illumio_pce_' + type + 's_mapping',
                        result_table_name: 'x_illu2_illumio_illumio_pce_' + type + 's_mapping_stage',
                        keys_to_map: JSON.stringify(params['keys_to_map']),
                        primary_key_to_map: params['primary_key_to_map'],
                        illumio_scheduled_job_id: jobSysId,
                        job_identifier: type + 's',
                        time_zone: gs.getSession().getTimeZoneName(),
                        pce_mid_proxy: pceConfig.enable_pce_mid_proxy
                    };
                    var illumioAddToECCQueue = new IllumioAddToECCQueue('IllumioManageAsyncJobs', pceConfig.midServer, parametersToSend);
                    var addToECCQueue = illumioAddToECCQueue.insert();

                    if (!addToECCQueue) {
                        this.utis.handleFailure(jobSysId, 'Adding to ECC queue', 'Adding task for async job of fetching ' + type + 's to ECC queue failed');
                        return false;
                    }
                    gs.info('Started async job to fetch PCE ' + type + 's');
                }
                return true;

            } catch (e) {
                this.utis.handleFailure(jobSysId, 'Adding to ECC queue failed', 'Exception occurred while adding to ECC queue. Exception: ' + e);
                return false;
            }


        } else {

            this.utis.handleFailure(jobSysId, 'No PCE configuration found', 'No PCE configurations available');
            return false;
        }
    },


    /**
     * To handle the failure of the job
     * @param {String} jobSysId - Job sys id
     * @param {String} operation - Operation of the job
     * @param {String} message - message to add 
     **/
    handleFailure: function(jobSysId, operation, message) {
        this.scheduledJobsGr.initialize();
        this.scheduledJobsGr.addQuery('sys_id', jobSysId);
        this.scheduledJobsGr.query();

        if (this.scheduledJobsGr.next()) {
            this.scheduledJobsGr.job_status = 'failed';

            this.scheduledJobsGr.logs += '\n[' + new Date(new GlideDateTime().getNumericValue()).toISOString() + '] ' + operation;
            this.scheduledJobsGr.logs += '\n[' + new Date(new GlideDateTime().getNumericValue()).toISOString() + '] Data discovery failed';


            this.scheduledJobsGr.job_completed = new GlideDateTime();
            this.scheduledJobsGr.update();
        }
        gs.error(message);
    },

    type: 'IllumioStartDiscovery'
};