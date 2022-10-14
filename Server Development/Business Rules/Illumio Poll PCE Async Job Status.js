// Check if both jobs are finished and then trigger CMDB discovery
function updateJob(sys_id) {
    var grAsync = new GlideRecord('x_illu2_illumio_illumio_pce_async_jobs');
    if (grAsync.get(sys_id)) {
        grAsync.job_status = 'completed';
        if (!grAsync.update()) {
            gs.error('Error while updating the record from x_illu2_illumio_illumio_pce_async_jobs table having sys id: ' + sys_id);
        }
    }
}

(function executeRule(current, previous /*null when async*/ ) {

    var utils = new IllumioUtils();
    try {

        // If status is ready_to_map, dump data to mapping table from staging table
        if (current.job_status + "" == 'ready_to_map') {
            var data = [];
            var mappingTableGr = new GlideRecord(current.mapping_table_name + "");
            var stagingTableGr = new GlideRecord(current.result_table_name + "");
            stagingTableGr.query();

            while (stagingTableGr.next()) {
                var json_data = stagingTableGr.getValue('json_data');
                if (json_data.trim() == '<see_attachment/>') {
                    data = data.concat(JSON.parse(utils.downloadAttachmentData(current.result_table_name + "", stagingTableGr.getUniqueValue())));
                } else {
                    data = data.concat(JSON.parse(stagingTableGr.json_data + ""));
                }
            }

            if (data.length) {
                try {
                    mappingTableGr.deleteMultiple();
                    var keysToMap = JSON.parse(current.keys_to_map + "");
                    for (var index = 0, dataLength = data.length; index < dataLength; index++) {
                        mappingTableGr.initialize();
                        for (var key in keysToMap) {
                            mappingTableGr[keysToMap[key]] = data[index][keysToMap[key]] + "";
                        }
                        mappingTableGr.insert();
                    }

                    stagingTableGr.initialize();
                    stagingTableGr.deleteMultiple();
                    updateJob(current.sys_id);
                } catch (ex) {
                    gs.error("Exception Occured while creating workloads for mapping table: " + ex);
                }

            } else {

                mappingTableGr.deleteMultiple();
                gs.info('No data present to map in {0} table', stagingTableGr);
                updateJob(current.sys_id);

            }
            // New record is inserted, start polling for the job status
        } else {

            var when = new GlideDateTime();
            // Add delay to wait for retry interval
            when.addSeconds(parseInt(current.retry_interval));

            gs.eventQueueScheduled("x_illu2_illumio.illumio_poll_async_statu", current, "", "", when);
        }

    } catch (e) {
        var jobContent = {
            logs: "Exception occured while creating/getting the status of the async job " + e,
            current_operation: "Fetching PCE data",
            job_status: "failed",
            job_completed: new GlideDateTime(),
        };
        new IllumioUtils().updateJobRecord(current.illumio_job_id, jobContent);
        gs.error('Exception occurred: {0}', e + "");
    }


})(current, previous);