function getPCEAsyncJobStatus() {

    var illumioPollAsyncJobStatus = new IllumioPollAsyncJobStatus(
        current.job_location, 
        current.retry_interval, 
        current.sys_id,
        current.primary_key_to_map,
        current.result_table_name,
        current.keys_to_map,
        current.retry_count,
        current.illumio_job_id,
        current.job_identifier
    );
    illumioPollAsyncJobStatus.execute();
}
getPCEAsyncJobStatus();