function checkAndUpdateJobStatus(identifier, table, illumioJobId, current) {

    var currentTableGa = new GlideAggregate(table);
    currentTableGa.addQuery('job_identifier', identifier);
    currentTableGa.addQuery('illumio_job_id', current.illumio_job_id + "");
    currentTableGa.addQuery('job_status', 'completed');
    currentTableGa.addAggregate('COUNT');
    currentTableGa.query();
    var count;

    if (currentTableGa.next()) {
        count = currentTableGa.getAggregate('COUNT');
        if (count == 1) {
            var illumioScheduledJobsGr = new GlideRecord('x_illu2_illumio_illumio_scheduled_jobs');
            illumioScheduledJobsGr.addQuery('sys_id', current.illumio_job_id + "");
            illumioScheduledJobsGr.query();

            if (illumioScheduledJobsGr.next()) {
                gs.info('Triggering cmdb discovery');
                illumioScheduledJobsGr.current_operation = 'Completed fetching PCE data';
                illumioScheduledJobsGr.logs += '\n[' + new Date(new GlideDateTime().getNumericValue()).toISOString() + '] Added PCE data to mapping table';

                illumioScheduledJobsGr.update();

                var when = new GlideDateTime();
                gs.eventQueueScheduled("x_illu2_illumio.start_discovery_and_mapp", current, illumioJobId, "", when);

            }
        }
    }
}

(function executeRule(current, previous /*null when async*/ ) {

    if (current.job_identifier == 'labels') {
        checkAndUpdateJobStatus('workloads', current.getTableName(), current.illumio_job_id, current);
    } else {
        checkAndUpdateJobStatus('labels', current.getTableName(), current.illumio_job_id, current);
    }

})(current, previous);