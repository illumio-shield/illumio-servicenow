(function executeRule(current, previous /*null when async*/) {
    
    var workloadMappingsStageGR = new GlideRecord('x_illu2_illumio_illumio_pce_workloads_mapping_stage');
    workloadMappingsStageGR.addQuery("sys_created_on","<=",current.sys_updated_on);
    workloadMappingsStageGR.deleteMultiple();
    
    var labelsMappingStageGR = new GlideRecord('x_illu2_illumio_illumio_pce_labels_mapping_stage');
    labelsMappingStageGR.addQuery("sys_created_on","<=",current.sys_updated_on);
    labelsMappingStageGR.deleteMultiple();
    
    
})(current, previous);