var fieldMappingGr = new GlideRecord('x_illu2_illumio_illumio_pce_field_mapping');
fieldMappingGr.setLimit(1);
fieldMappingGr.query();
if (!fieldMappingGr.hasNext()) {
    gs.addErrorMessage('Can not start the discovery as there is no PCE field mapping configured');
    gs.error('Can not start the discovery as there is no PCE field mapping configured');
    current.setAbortAction(true);
} else {

    var midGr = current.mid_server;
    var utils = new IllumioUtils();
    if (utils.canStartJob(current, midGr)) {
        var runningJobsCount = new GlideAggregate("x_illu2_illumio_illumio_scheduled_jobs");
        runningJobsCount.addQuery('job_status', 'running');
        runningJobsCount.addAggregate('COUNT');
        runningJobsCount.query();
        if (runningJobsCount.next()) {
            if (runningJobsCount.getAggregate('COUNT') > 0) {
                gs.addErrorMessage('Can not start discovery as there is already one job in running status.');
                gs.info('Can not start discovery as there is already one job in running status.');
            } else {
                gs.addInfoMessage("The Discovery process may take a few minutes to complete.");
                current.update();
                var startDiscovery = new IllumioStartDiscovery();
                startDiscovery.process();
            }
        }
    }
}