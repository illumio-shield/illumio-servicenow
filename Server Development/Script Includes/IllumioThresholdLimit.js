var IllumioThresholdLimit = Class.create();
IllumioThresholdLimit.prototype = {
    initialize: function() {},
    
    /**
     * Starts the authentication via MID server for check PCE configuration
     * @params {String} labelsToCreate labels to create.
     * @params {String} wlToModify workloads to modify.
     * @params {String} wlTocreate workloads to create.
     * @params {String} wlTodelete workloads to delete.
     * @return {JSON} if has errors and if limit has exceeded.
     */
    checkThresholdLimit: function(labelsToCreate, wlToModify, wlTocreate,wlTodelete) {
        try {
            var pceConfig = new IllumioGetPCEConfiguration().getConfiguration();
            labelsToCreate = parseInt(labelsToCreate);
            wlToModify = parseInt(wlToModify);
            wlTocreate = parseInt(wlTocreate);

            var utils = new IllumioUtils();
            var message = [];
            var flag = false;

            if (pceConfig.enable_limit) {
                var totalWorkloads = utils.getTotalRecords("x_illu2_illumio_illumio_servicenow_servers");
                if (pceConfig.limit_on_label_creation) {
                    if (!gs.nil(pceConfig.label_creation_limit)) {
                        var totalLabels = utils.getTotalRecords("x_illu2_illumio_illumio_pce_labels_mapping");
                        var labelLimit = pceConfig.label_creation_limit;
                        if (pceConfig.label_creation_limit.includes("%")) {

                            labelLimit = Math.floor((totalLabels * parseInt(pceConfig.label_creation_limit) / 100));

                        }
                        if (parseInt(labelLimit) < labelsToCreate) {
                            flag = true;
                            message.push("label creation");
                        }
                    }
                }
                if (pceConfig.limit_on_wl_modification) {

                    if (!gs.nil(pceConfig.wl_modification_limit)) {
                        var workloadLimit = pceConfig.wl_modification_limit;
                        if (pceConfig.wl_modification_limit.includes("%")) {
                            workloadLimit = Math.floor((totalWorkloads * parseInt(pceConfig.wl_modification_limit) / 100));
                        }
                        if (parseInt(workloadLimit) < wlToModify) {
                            flag = true;
                            message.push("workload modification");
                        }
                    }
                }
                if (pceConfig.limit_on_wl_creation) {
                    if (!gs.nil(pceConfig.wl_creation_limit)) {
                        var ukwLimit = pceConfig.wl_creation_limit;
                        if (pceConfig.wl_creation_limit.includes("%")) {
                            ukwLimit = Math.floor((totalWorkloads * parseInt(pceConfig.wl_creation_limit) / 100));
                        }
                        if (parseInt(ukwLimit) < wlTocreate) {
                            flag = true;
                            if(message.length == 2){
                                message.push("and workload creation");
                            }
                            else{
                                message.push("workload creation");
                            }
                            
                        }
                    }
                }
                if (pceConfig.limit_on_wl_deletion) {
                    if (!gs.nil(pceConfig.wl_deletion_limit)) {
                        var delLimit = pceConfig.wl_deletion_limit;
                        if (pceConfig.wl_deletion_limit.includes("%")) {
                            delLimit = Math.floor((totalWorkloads * parseInt(pceConfig.wl_deletion_limit) / 100));
                        }
                        if (parseInt(delLimit) < wlTodelete) {
                            flag = true;
                            if(message.length == 2){
                                message.push("and workload deletion");
                            }
                            else{
                                message.push("workload deletion");
                            }
                            
                        }
                    }
                }
                
            }
            if (flag) {
                var description;
                if(message.length == 1){
                    description = "Sync stopped as " + (message + '').split(',').join(', ') + " limit has exceeded";
                }
                else{
                    description = "Sync stopped as " + (message + '').split(',').join(', ') + " limits have exceeded";
                }
                return {
                    hasError: false,
                    limitExceed: true,
                    description: description
                };
            }
            return {
                hasError: false,
                limitExceed: false
            };



        } catch (ex) {
            gs.error("[IllumioThresholdLimit] Exception occured while checking threshold limit. Exception: " + ex);
            return {
                hasError: true,
                description: "Error occured while checking threshold limit."
            };
        }

    },

    type: 'IllumioThresholdLimit'
};