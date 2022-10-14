(function executeRule(current, previous /*null when async*/) {

    // trigger event to invalidate the job after certain minutes
    var seconds;
    if(current.job_type+''=='connectivity_check'){
        seconds = gs.getProperty('x_illu2_illumio.invalidate_authentication_job_limit') || 300;
        
    }
    else{
        seconds = gs.getProperty('x_illu2_illumio.invalidate_running_job_limit') || 1800;
    }
    var when = new GlideDateTime();
    when.addSeconds(seconds);
    gs.eventQueueScheduled("x_illu2_illumio.invalidate_running_job", current, "", "", when);

})(current, previous);