function invalidateRunningJob() {
    if (current.job_status == 'running') {
        current.job_status = 'failed';
        current.job_completed = new GlideDateTime();
        current.logs += '\n[' + new Date(new GlideDateTime().getNumericValue()).toISOString() + '] Time Limit Exceeded';
        current.update();
    }
}

invalidateRunningJob();