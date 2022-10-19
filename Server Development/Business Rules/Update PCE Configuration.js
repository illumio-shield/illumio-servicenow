gs.include('IllumioConstants');
(function executeRule(current, previous /*null when async*/ ) {

    // set default organization id to 1 if not present
    if (current.organization_id == '') {
        current.organization_id = '1';
    }

    // there must be a single configuration, so deleting existing configuration while adding new one
    if (current.operation() == 'insert') {
        var configurationGr = new GlideRecord('x_illu2_illumio_illumio_pce_conf');
        configurationGr.query();
        configurationGr.deleteMultiple();
        gs.info('New configuration added by {0}({1})', gs.getUserName(), gs.getUserID());
    } else {
        gs.info('{0}({1}) updated configuration', gs.getUserName(), gs.getUserID());
    }

    // Trimming threshold limit values
    current.new_label_creation_limit = (current.new_label_creation_limit + '').trim();
    current.workload_label_modifications_limit = (current.workload_label_modifications_limit + '').trim();
    current.number_of_workloads_to_be_created_from_servicenow = (current.number_of_workloads_to_be_created_from_servicenow + '').trim();

    // Validating threshold limit input

    var workloads_arr = [current.new_label_creation_limit + '', current.workload_label_modifications_limit + '', current.number_of_workloads_to_be_created_from_servicenow + '', current.workload_deletion_limit + ''];
    var limits_arr = [current.set_limit_on_new_label_creation, current.set_limit_on_workload_label_modifications, current.create_unmanaged_workloads_on_pce_from_cmdb_records, current.set_limit_on_workload_deletion];
    var regex = new RegExp(/^[0-9]+%?$/);

    for (var i = 0; i < workloads_arr.length; i++) {
        if (limits_arr[i] && !gs.nil(workloads_arr[i])) {
            if (workloads_arr[i].match(regex)) {
                if (workloads_arr[i].indexOf('%') >= 0) {
                    var value = parseInt(workloads_arr[i].split('%'));
                    if (value > 100) {
                        current.setAbortAction(true);
                        return;
                    }
                }
            } else {
                current.setAbortAction(true);
                return;
            }
        }

    }
    // trimming critical label group values
    current.critical_label_group_application = (current.critical_label_group_application + '').trim();
    current.critical_label_group_location = (current.critical_label_group_location + '').trim();
    current.critical_label_group_environment = (current.critical_label_group_environment + '').trim();
    current.critical_label_group_role = (current.critical_label_group_role + '').trim();

    //Retry mechanism Validations
    try {
        var retryCount = !gs.nil(current.getValue('http_retry_count')) ? parseInt(current.getValue('http_retry_count')) : HTTP_RETRY_COUNT;
        var maxRetryInterval = !gs.nil(current.getValue('http_retry_interval_max')) ? parseInt(current.getValue('http_retry_interval_max')) : HTTP_RETRY_INTERVAL_MAX;
        var retryIntervalIncrement = !gs.nil(current.getValue('http_retry_interval_increment')) ? parseInt(current.getValue('http_retry_interval_increment')) : HTTP_RETRY_INTERVAL_INCREMENT;

        if (!(0 <= retryCount && retryCount <= 100)) {
            gs.addErrorMessage('The Retry count should be in the range of 0 to 100');
            current.setAbortAction(true);
            return;
        }
        if (!(0 <= maxRetryInterval && maxRetryInterval <= 600)) {
            gs.addErrorMessage('The HTTP Retry interval max should be in the range of 0 to 600');
            current.setAbortAction(true);
            return;
        }
        if (!(0 <= retryIntervalIncrement && retryIntervalIncrement <= 600)) {
            gs.addErrorMessage('The HTTP Retry interval increment should be in the range of 0 to 600');
            current.setAbortAction(true);
            return;
        }
        current.http_retry_count = retryCount;
        current.http_retry_interval_max = maxRetryInterval;
        current.http_retry_interval_increment = retryIntervalIncrement;
    } catch (e) {
        gs.addErrorMessage('Please enter integer values in the retry mechanism section');
        current.setAbortAction(true);
    }
})(current, previous);