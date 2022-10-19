ms.include("IllumioMIDConstants");
var IllumioUpdateWorkloads = Class.create();

IllumioUpdateWorkloads.prototype = {
    VALID_IP_REGEX: /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
    initialize: function() {
        this.logger = new IllumioLogUtil();
        this.SNOWusername = ms.getConfigParameter("mid.instance.username");
        this.SNOWpassword = ms.getConfigParameter("mid.instance.password");
        this.SNOWurl = String(ms.getConfigParameter("url"));
        if (this.SNOWurl[this.SNOWurl.length - 1] === '/') {
            this.SNOWurl = this.SNOWurl.substring(0, this.SNOWurl.length - 1);
        }
        this.jobSysId = probe.getParameter('glide.jms.jobSysId');
        this.partialSucc = probe.getParameter('glide.jms.partialSucc');

        // added for bifurcation for sync of the workload payload
        this.autoSync = probe.getParameter('glide.jms.autoSync');
        this.payloadSysIds = probe.getParameter('glide.jms.payloadSysIds');

        this.skipped = probe.getParameter('glide.jms.skipped');
        this.count = probe.getParameter('glide.jms.count');

        this.payload = probe.getParameter('glide.jms.payload');
        this.pceUrl = probe.getParameter('glide.jms.pce_url');
        this.pceAuthorization = probe.getParameter('glide.jms.pce_authorization');
        this.pceOrgId = probe.getParameter('glide.jms.pce_org_id');
        this.pceMIDProxy = probe.getParameter('glide.jms.enable_pce_mid_proxy');

        this.batchSize = parseInt(probe.getParameter('glide.jms.batch_size'));

        this.retiredWorkloads = probe.getParameter('glide.jms.workloads_to_delete');

        this.fieldMappings = JSON.parse(probe.getParameter('glide.jms.fieldMappings'));

        this.timeZone = probe.getParameter('glide.jms.time_zone');
        this.SimpleDF = Packages.java.text.SimpleDateFormat;
        this.TimeZone = Packages.java.util.TimeZone;

        this.snowDateFormat = this.SimpleDF("yyyy-MM-dd HH:mm:ss");
        this.illumioDateFormat = this.SimpleDF("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");

        this.snowDateFormat.setTimeZone(this.TimeZone.getTimeZone(this.timeZone));
        this.illumioDateFormat.setTimeZone(this.TimeZone.getTimeZone('UTC'));



        // Table Names
        this.SCHEDULED_JOB_TABLE = 'x_illu2_illumio_illumio_scheduled_jobs';


        this.newLabelsCreated = {
            "app": {},
            "env": {},
            "loc": {},
            "role": {}
        };

        // Mapping
        this.pceLabels = {
            "app": "pce_application",
            "loc": "pce_location",
            "env": "pce_environment",
            "role": "pce_role"
        };
        this.selectLabels = {
            "app": "select_application",
            "loc": "select_location",
            "env": "select_environment",
            "role": "select_role"
        };

        this.created = true;
        this.updatedManaged = true;
        this.updatedUnManaged = true;
        this.labelDetails = new Object();
        this.operation = probe.getParameter('glide.jms.operation');

        this.utils = new IllumioPCEUtils(this.timeZone);
        this.protocol = this.utils.getPortFromUrl(this.pceUrl);

        this.retryParams = DEFAULT_RETRY_PARAMS;
        try {
            this.retryParams = JSON.parse(probe.getParameter('glide.jms.retry_params'));
        } catch (e) {
            this.logger._except('IllumioUpdateWorkloads - Cannot parse the JSON of retry parameters');
        }

        var decodedAuth = this.utils.decodeBase64(this.pceAuthorization);
        decodedAuth = decodedAuth.split(":");
        this.pceUsername = decodedAuth[0];
        this.pcePassword = decodedAuth.slice(1).join(':');

        this.pceHttpClient = new IllumioHTTPClient(this.pceUrl, this.pceUsername, this.pcePassword, this.protocol, this.pceMIDProxy, this.retryParams);
        this.snHttpClient = new IllumioHTTPClient(this.SNOWurl, this.SNOWusername, this.SNOWpassword, "443", null, this.retryParams);
    },

    run: function() {
        var jobContent;
        this.payload = decodeURI(this.payload);


        // Call respective method according to the operation requested
        if (this.operation == "update") {
            try {
                var updateResult = this.update(this.payload);
                var payloadToUpdate = JSON.parse(this.payload);
                if (updateResult.count && updateResult.count != 0) {
                    jobContent = {
                        job_status: 'completed',
                        logs: 'Updated ' + payloadToUpdate[0].hostname + ' workload on PCE and ServiceNow',
                        current_operation: 'Updated ' + payloadToUpdate[0].hostname + ' workload on PCE',
                        job_completed: this.snowDateFormat.format(new Date()) + ""
                    };
                    this._updateJobRecord(this.jobSysId, jobContent);
                } else {
                    jobContent = {
                        job_status: 'failed',
                        logs: 'Failed to update ' + payloadToUpdate[0].hostname + ' workload on ' + updateResult.exception,
                        job_completed: this.snowDateFormat.format(new Date()) + ""
                    };
                    this._updateJobRecord(this.jobSysId, jobContent);
                }
            } catch (exception) {
                this.logger._except("IllumioUpdateWorkloads: Exception while updating workload on PCE : " + exception);
                jobContent = {
                    job_status: 'failed',
                    logs: "Exception while updating workload on PCE : " + exception,
                    job_completed: this.snowDateFormat.format(new Date()) + "",
                };
                this._updateJobRecord(this.jobSysId, jobContent);
            }
        }


        if (this.operation == "create") {
            try {
                var createResult = this.create(this.payload);
                var payloadToCreate = JSON.parse(this.payload);
                if (createResult.count && createResult.count != 0) {
                    jobContent = {
                        job_status: 'completed',
                        logs: 'Created ' + payloadToCreate[0].hostname + ' workload on PCE',
                        current_operation: 'Created ' + payloadToCreate[0].hostname + ' workload on PCE',
                        job_completed: this.snowDateFormat.format(new Date()) + ""
                    };
                    this._updateJobRecord(this.jobSysId, jobContent);
                } else {
                    jobContent = {
                        job_status: 'failed',
                        logs: 'Failed to create ' + payloadToCreate[0].hostname + ' workload on ' + createResult.exception,
                        job_completed: this.snowDateFormat.format(new Date()) + ""
                    };
                    this._updateJobRecord(this.jobSysId, jobContent);
                }
            } catch (exception) {
                this.logger._except("IllumioUpdateWorkloads: Exception while creating workload on PCE : " + exception);
                jobContent = {
                    job_status: 'failed',
                    logs: "Exception while creating workload on PCE : " + exception,
                    job_completed: this.snowDateFormat.format(new Date()) + "",
                };
                this._updateJobRecord(this.jobSysId, jobContent);
            }
        }


        if (this.operation == "updateCreate") {
            this.logger._debug("Type : updateCreate");
            this.collectLabelDetails();
            try {

                var unknownWorkloads, managedWorkloads, unmanagedWorkloads;
                var totalWorkloads = 0;
                var createdUnknownWorkloads = 0,
                    updatedManagedWorkloads = 0,
                    updatedUnManagedWorkloads = 0,
                    skippedWorkloads = 0;
                var deletedWorkloads = 0;
                var payload;

                var totalSysIds = (this.payloadSysIds + '').split(',');
                var counter = 0;
                do {
                    if (this.autoSync == 'true') {
                        var grPayload = new GlideRecord('x_illu2_illumio_illumio_autosync_payload');
                        if (grPayload.get(totalSysIds[counter])) {
                            payload = JSON.parse(grPayload.payload);
                            var deletePayloadUrl = TABLE_API + AUTOSYNC_PAYLOAD_TABLE + "/" + totalSysIds[counter];
                            this.snHttpClient.deleteMethod(deletePayloadUrl, '');
                            counter++;
                        } else {
                            this.logger._error('Could not get the autosync payload having sys id: ' + totalSysIds[counter]);
                            counter++;
                        }
                    } else {
                        payload = JSON.parse(this.payload);
                    }
                    var count = parseInt(this.count);
                    if (payload.createUnknown) {
                        totalWorkloads = totalWorkloads + payload.createUnknown.length;
                        // If there are unknown workloads to create
                        unknownWorkloads = JSON.stringify(payload.createUnknown);
                        jobContent = {
                            job_status: 'running',
                            logs: 'Creating ' + payload.createUnknown.length + ' unknown workload(s)',
                            current_operation: 'Creating unknown workloads'
                        };
                        this._updateJobRecord(this.jobSysId, jobContent);
                        var createdResult = this.create(unknownWorkloads);
                        if (createdResult.status) {
                            createdUnknownWorkloads = createdUnknownWorkloads + createdResult.count;
                        }
                    }

                    if (payload.updateManaged) {
                        totalWorkloads = totalWorkloads + payload.updateManaged.length;
                        // If there are managed workloads to update
                        jobContent = {
                            job_status: 'running',
                            logs: 'Total critical label groups fetched : ' + count + '\n[' + this.illumioDateFormat.format(new Date()) + '] ' + 'Updating ' + payload.updateManaged.length + ' managed workload(s)',
                            current_operation: 'Updating managed workloads'
                        };
                        this._updateJobRecord(this.jobSysId, jobContent);
                        managedWorkloads = JSON.stringify(payload.updateManaged);
                        var updatedManagedResult = this.update(managedWorkloads);
                        if (updatedManagedResult.status) {
                            updatedManagedWorkloads = updatedManagedWorkloads + updatedManagedResult.count;
                        }
                    }

                    if (payload.updateUnManaged) {
                        totalWorkloads = totalWorkloads + payload.updateUnManaged.length;
                        // If there are ummanaged workloads to update
                        jobContent = {
                            job_status: 'running',
                            logs: 'Total critical label groups fetched : ' + count + '\n[' + this.illumioDateFormat.format(new Date()) + '] ' + 'Updating ' + payload.updateUnManaged.length + ' unmanaged workload(s)',
                            current_operation: 'Updating unmanaged workloads'
                        };
                        this._updateJobRecord(this.jobSysId, jobContent);
                        unmanagedWorkloads = JSON.stringify(payload.updateUnManaged);
                        var updatedUnManagedResult = this.update(unmanagedWorkloads);
                        if (updatedUnManagedResult.status) {
                            updatedUnManagedWorkloads = updatedUnManagedWorkloads + updatedUnManagedResult.count;
                        }
                    }
                } while (counter < totalSysIds.length && this.autoSync == 'true');

                //DELETE THE RETIRED WORKLOADS
                if (this.autoSync == 'true') {
                    this.logger._debug("Process of deleting retired workloads started");
                    this.retiredWorkloads = JSON.parse(this.retiredWorkloads);
                    var allHref = [];
                    //                     var totalRetiredWorkloads = 0;
                    for (var del_href_ind in this.retiredWorkloads) {
                        deletedWorkloads++;
                        var hrefObj = {
                            "href": del_href_ind
                        };
                        allHref.push(hrefObj);
                    }
                    totalWorkloads = totalWorkloads + deletedWorkloads;
                    var notDeletedWorkloads = 0;
                    if (allHref.length > 0) {
                        var url = "/api/v2/orgs/" + this.pceOrgId + "/workloads/bulk_delete";
                        var putResponse = this.pceHttpClient.put(url, '', null, allHref);
                        if (putResponse.hasError) {
                            this.logger._debug("IllumioUpdateWorkloads: Failed deleting of the workloads on PCE.");
                            return {
                                "exception": 'PCE. Response status code: ' + putResponse.status
                            };
                        }
                        for (var href_ind = 0; href_ind < putResponse.data.length; href_ind++) {
                            var respObj = putResponse.data[href_ind];
                            notDeletedWorkloads++;
                            var delPayload = {
                                deleted_from_pce: false
                            };
                            var updatePayloadEndpoint = TABLE_API + PCE_WORKLOADS_TABLE + "/" + this.retiredWorkloads[respObj["href"] + ''];
                            var snowHttpPutResponse = this.snHttpClient.put(updatePayloadEndpoint, '', null, delPayload);
                            if (snowHttpPutResponse.hasError) {
                                this.logger._error("IllumioUpdateWorkloads: Could not update the workload mapping table for workload");
                                return {
                                    "exception": 'ServiceNow. Response status code: ' + snowHttpPutResponse.status
                                };
                            }
                            //                         delete this.retiredWorkloads[respObj["href"] + ''];
                        }
                    }

                    deletedWorkloads = deletedWorkloads - notDeletedWorkloads;
                }
                var skippedWl = parseInt(this.skipped);
                skippedWorkloads = totalWorkloads - createdUnknownWorkloads - updatedManagedWorkloads - updatedUnManagedWorkloads - deletedWorkloads;
                if (skippedWorkloads == totalWorkloads) {
                    // If no workloads are created/updated on PCE and ServiceNow
                    jobContent = {
                        job_status: 'failed',
                        logs: 'Synchronization with PCE failed',
                        job_completed: this.snowDateFormat.format(new Date()) + "",
                    };
                } else {
                    // If some or all workloads are created/updated on PCE and ServiceNow
                    var status = this.partialSucc;
                    if (status == 'true') {
                        jobContent = {
                            job_status: skippedWorkloads != 0 ? 'completed_with_error' : 'partial_success',
                            logs: 'Synchronization with PCE completed' + ' \n -------------------------------------\nTotal workloads: ' + (totalWorkloads + skippedWl) + '\n Created unknown workloads: ' + createdUnknownWorkloads + '\n Updated managed workloads: ' + updatedManagedWorkloads + '\n Updated unmanaged workloads: ' + updatedUnManagedWorkloads + '\n Skipped workloads: ' + (skippedWorkloads + skippedWl) + '\n Deleted workloads: ' + deletedWorkloads,
                            job_completed: this.snowDateFormat.format(new Date()) + "",
                            current_operation: 'Synchronization with PCE completed'
                        };
                    } else {
                        jobContent = {
                            job_status: skippedWorkloads != 0 ? 'completed_with_error' : 'completed',
                            logs: 'Synchronization with PCE completed' + ' \n -------------------------------------\n Total workloads: ' + (totalWorkloads + skippedWl) + '\n Created unknown workloads: ' + createdUnknownWorkloads + '\n Updated managed workloads: ' + updatedManagedWorkloads + '\n Updated unmanaged workloads: ' + updatedUnManagedWorkloads + '\n Skipped workloads: ' + (skippedWorkloads + skippedWl) + '\n Deleted workloads: ' + deletedWorkloads,
                            job_completed: this.snowDateFormat.format(new Date()) + "",
                            current_operation: 'Synchronization with PCE completed'
                        };
                    }

                }
                this._updateJobRecord(this.jobSysId, jobContent);
            } catch (exception) {
                this.logger._except("IllumioUpdateWorkloads: Exception while updating or creating workload on PCE : " + exception);
                jobContent = {
                    job_status: 'failed',
                    logs: "Exception while updating or creating workload on PCE : " + exception,
                    job_completed: this.snowDateFormat.format(new Date()) + "",
                };
                this._updateJobRecord(this.jobSysId, jobContent);
            }
        }
    },

    /**
     * Create the required workloads on the PCE
     * @param {Array} payload list of payload to create on pce.
     * @return {JSON} Object with status and count of workload created.
     */
    create: function(payload) {

        this.logger._info("IllumioUpdateWorkloads: Initiating creating the workloads on PCE");
        var labelsToUse, hostname, public_ip, created_workloads = 0,
            sys_id;
        var payloadList = JSON.parse(payload);

        var payloadBody = [];
        var snowUpdateQueue = []; // List of payloads for updating snow tables
        // Filtered list acc to workloads status after PCE REST Call

        for (var payloadIndex = 0; payloadIndex < payloadList.length; payloadIndex++) {
            public_ip = '';
            payload = payloadList[payloadIndex];

            // Skip processing the workload if custom record's sys_id is not known
            if (payload.sys_id) {
                sys_id = payload.sys_id;
            } else {
                this.logger._debug("IllumioUpdateWorkloads: Sys ID not found in the payload object : SKIPPED");
                continue;
            }

            var description = payload.description;
            var labelsToCreate = payload.createlabels;

            labelsToUse = payload.labels;
            hostname = payload.hostname;
            this.interfaces = payload.interfaces;
            if (payload.ip_address != undefined && payload.ip_address != "") {
                if (payload.ip_address.match(this.VALID_IP_REGEX)) {
                    public_ip = payload.ip_address;
                } else {
                    this.logger._error('Skipped creating workload ' + payload.hostname + ' as the IP Address ' + payload.ip_address + ' is invalid.');
                    continue;
                }
            }

            var snowUpdateObject = {
                "sys_id": sys_id,
                "hostname": hostname,
                "public_ip": public_ip,
                "payloadPut": {}
            };

            if (labelsToCreate.length > 0) {
                this.logger._debug("IllumioUpdateWorkloads: Creating required labels");
            }
            if (!this.createLabels(labelsToCreate, labelsToUse)) {
                this.logger._error("IllumioUpdateWorkloads: Failed to Create workload. Reason : Failed to create required labels");
                continue;
            }

            var workloadBody = {
                "labels": labelsToUse,
                "hostname": hostname,
                "description": description
            };

            if (public_ip != "" && public_ip != undefined) {
                workloadBody.public_ip = public_ip;
            }
            snowUpdateObject["interfaces"] = this.interfaces.length > 0 ? this.interfaces : [];
            workloadBody.interfaces = this.interfaces.length > 0 ? this.interfaces : [];

            payloadBody.push(workloadBody);

            // Update snow_update queue
            snowUpdateObject["labels"] = labelsToUse;


            for (var label_index = 0, label_length = labelsToUse.length; label_index < label_length; label_index++) {
                var label, labelDetails, key, value;
                label = labelsToUse[label_index];
                labelDetails = this.getLabelDetails(label);
                if (labelDetails) {
                    key = labelDetails.key;
                    value = labelDetails.value;

                    snowUpdateObject.payloadPut[this.pceLabels[key]] = value;
                    snowUpdateObject.payloadPut[this.selectLabels[key]] = value;
                } else {
                    this.logger._error('Could not find label having href: ' + label.href);
                }
            }
            var interface_length = this.interfaces.length;
            for (var interface_index = 0; interface_index < interface_length; interface_index++) {
                var interface_name = this.interfaces[interface_index].name;
                var interface_address = this.interfaces[interface_index].address;
                var intIndex = parseInt(interface_name.substring(3));
                var pce_column = intIndex > 0 ? 'pce_ip_address_' + (intIndex + 1) : 'pce_ip_address';
                snowUpdateObject.payloadPut[pce_column] = interface_address;
            }
            snowUpdateQueue.push(snowUpdateObject);
        }

        if (payloadBody.length == 0) {
            return {
                "exception": 'PCE. Check MID Server logs for details.'
            };
        }

        // Make the put call to create the workloads on PCE
        this.logger._debug("IllumioUpdateWorkloads: Making PUT call to create the worklads on PCE.");
        var payloadBody_chunked = [];
        var snowUpdateQueue_chunked = [];
        var payloadBody_length = payloadBody.length;
        var snowUpdateQueue_length = snowUpdateQueue.length;
        var myChunk, index;

        for (index = 0; index < payloadBody_length; index += this.batchSize) {
            myChunk = payloadBody.slice(index, index + this.batchSize);
            // Do something if you want with the group
            payloadBody_chunked.push(myChunk);
        }

        for (index = 0; index < snowUpdateQueue_length; index += this.batchSize) {
            myChunk = snowUpdateQueue.slice(index, index + this.batchSize);
            // Do something if you want with the group
            snowUpdateQueue_chunked.push(myChunk);
        }
        var payloadBody_chunked_length = payloadBody_chunked.length;
        for (var i = 0; i < payloadBody_chunked_length; i++) {
            this.logger._info("IllumioUpdateWorkloads: Creating workloads. Batch: " + (i + 1));
            var snowUpdateQueueFinal = [];
            var url = "/api/v2/orgs/" + this.pceOrgId + "/workloads/bulk_create";
            var putResponse = this.pceHttpClient.put(url, '', '', payloadBody_chunked[i]);
            if (putResponse.hasError) {
                this.logger._debug("IllumioUpdateWorkloads: Failed create the workloads on PCE.");
                return {
                    "exception": 'PCE. Response status code: ' + putResponse.status
                };
            }
            var putResponseObject = putResponse.data;

            for (var putResponseIndex = 0; putResponseIndex < putResponseObject.length; putResponseIndex++) {
                if (putResponseObject[putResponseIndex].status == "created") {
                    snowUpdateQueueFinal.push(snowUpdateQueue_chunked[i][putResponseIndex]);
                } else {
                    this.logger._error("IllumioUpdateWorkloads: Error while creating a workload : SKIPPED");
                    this.logger._error("IllumioUpdateWorkloads: Message : " + putResponseObject[putResponseIndex].message);
                }
            }

            // Update custom table with newly assigned labels
            var payloadPut = {};

            this.logger._info("IllumioUpdateWorkloads: Updating the custom table records and mapping table records in SNOW.");
            for (var p = 0; p < snowUpdateQueueFinal.length; p++) {
                payloadPut = snowUpdateQueueFinal[p].payloadPut;
                payloadPut["pce_ip_address"] = snowUpdateQueueFinal[p].public_ip;
                payloadPut["known_to_pce"] = "unmanaged";
                payloadPut["conflicts"] = false;
                payloadPut["pce_workload_href"] = putResponseObject[p]['href'];
                for (var interfaceIndex = 1; interfaceIndex < MAX_IP_ADDRESSES; interfaceIndex++) {
                    if (snowUpdateQueueFinal[p]["umw" + interfaceIndex])
                        payloadPut["pce_ip_address_" + (interfaceIndex + 1)] = snowUpdateQueueFinal[p]["umw" + interfaceIndex];
                }
                snowUpdateQueueFinal[p].interfaces = this.interfaces;

                var putEndpoint = TABLE_API + PCE_WORKLOADS_TABLE + "/" + snowUpdateQueueFinal[p].sys_id;
                var snowHttpPutResponse = this.snHttpClient.put(putEndpoint, '', null, payloadPut);

                if (snowHttpPutResponse.hasError) {
                    this.logger._error("IllumioUpdateWorkloads: Could not update the workload mapping table for workload" + snowUpdateQueueFinal[p].hostname);
                    return {
                        "exception": 'ServiceNow. Response status code: ' + snowHttpPutResponse.status
                    };
                }

                this.logger._debug("IllumioUpdateWorkloads: Creating entry in the workload mapping table");
                var payloadPost = {
                    "hostname": snowUpdateQueueFinal[p].hostname,
                    "public_ip": snowUpdateQueueFinal[p].public_ip,
                    "href": putResponseObject[p]['href'],
                    "labels": JSON.stringify(snowUpdateQueueFinal[p].labels),
                    "interfaces": snowUpdateQueueFinal[p].interfaces ? JSON.stringify(snowUpdateQueueFinal[p].interfaces) : "[]"
                };
                for (interfaceIndex = 1; interfaceIndex < MAX_IP_ADDRESSES; interfaceIndex++) {
                    payloadPost["umw" + interfaceIndex] = snowUpdateQueueFinal[p]["umw" + interfaceIndex] ? snowUpdateQueueFinal[p]["umw" + interfaceIndex] : "";
                }


                var postEndpoint = TABLE_API + PCE_WORKLOADS_MAPPING_TABLE;
                // Update the workload mapping table with newly assigned labels.
                var snowHttpPostResponse = this.snHttpClient.post(postEndpoint, '', null, payloadPost);

                if (snowHttpPostResponse.hasError) {
                    this.logger._error("IllumioUpdateWorkloads: Failed to update the mapping table record for host - " + snowUpdateQueueFinal[p].hostname);
                } else {
                    created_workloads++;
                    this.logger._debug("IllumioUpdateWorkloads: Successfully updated the SNOW custom table and mapping table");
                }
            }
        }

        this.logger._info("IllumioUpdateWorkloads: Workload creation complete");
        return {
            "status": true,
            "count": created_workloads
        };
    },

    /**
     * Process the list of payloads and upload them on PCE.
     * @param {Array} payload list of payload to upload on pce.
     * @return {JSON} Object with status and count of workload uploaded.
     */
    update: function(payload) {

        this.logger._info("IllumioUpdateWorkloads: Initiating updating the workloads on PCE ");

        var href, labelsToUse, updated_workloads = 0;
        var index;
        var payloadList = JSON.parse(payload);

        var payloadBody = [];
        var snowUpdateQueue = []; // List of payloads for updating snow tables

        // Prepare the payload with list of workloads to be updated
        for (var payloadIndex = 0; payloadIndex < payloadList.length; payloadIndex++) {

            payload = payloadList[payloadIndex];

            var workloadBody = {};
            var labelsToCreate = payload.createlabels;

            var description = payload.description;
            var sys_id;

            href = payload.href;
            labelsToUse = payload.labels;

            var snowUpdateObject = {};

            // Skip processing the workload if custom record's sys_id is not known
            if (payload.sys_id) {
                sys_id = payload.sys_id;
            } else {
                this.logger._debug("IllumioUpdateWorkloads: Sys ID not found in the payload object : SKIPPED");
                continue;
            }

            if (labelsToCreate.length > 0) {
                this.logger._debug("IllumioUpdateWorkloads: Creating required labels.");
            }
            if (!this.createLabels(labelsToCreate, labelsToUse)) {
                // Create the unknown labels
                this.logger._error("IllumioUpdateWorkloads: Failed to update workload. Reason : Failed to create required labels " + href);
                continue;
            }
            snowUpdateObject["sys_id"] = sys_id;
            snowUpdateObject["href"] = href;
            snowUpdateObject["labels"] = labelsToUse;
            snowUpdateObject["hostname"] = payload.hostname;
            snowUpdateObject["payloadPut"] = {};

            workloadBody["href"] = href;
            workloadBody["labels"] = labelsToUse;
            workloadBody["description"] = description;
            if ("known_to_pce" in payload && payload.known_to_pce == "unmanaged") {
                var PCEIpFieldMapping = {
                    "umw0": "pce_ip_address",
                };

                for (var i = 1; i < MAX_IP_ADDRESSES; i++) {
                    PCEIpFieldMapping["umw" + i] = "pce_ip_address_" + (i + 1);
                }
                var IPsCameWithInterfaces = [];
                if ("interfaces" in payload) {
                    var interfaces;
                    if (!payload.interfaces || payload.interfaces.length == 0) {
                        interfaces = [];

                    } else {
                        interfaces = payload.interfaces;
                    }
                    workloadBody["interfaces"] = interfaces;
                    snowUpdateObject["interfaces"] = interfaces;
                    var interfacesLength = interfaces.length;
                    for (index = 0; index < interfacesLength; index++) {
                        snowUpdateObject.payloadPut[PCEIpFieldMapping[interfaces[index].name]] = interfaces[index].address;
                        if (interfaces[index].name == "umw0" && interfaces[index].address != undefined && interfaces[index].address != "") {
                            workloadBody["public_ip"] = interfaces[index].address;
                        }
                        IPsCameWithInterfaces.push(interfaces[index].name);
                    }

                    for (var IP in PCEIpFieldMapping) {
                        if (IPsCameWithInterfaces.indexOf(IP) == -1 && this.fieldMappings[PCEIpFieldMapping[IP].slice(4)]) {
                            snowUpdateObject.payloadPut[PCEIpFieldMapping[IP]] = "";
                        }
                    }

                }
            }

            // Add the object to the list in payload
            payloadBody.push(workloadBody);




            /*
             * Make PCE labels blank in payload for the ones checked by user
             * So that the labels excluded from labelsToUse hold a value ""
             * It was not in labelsToUse because the user marked it and was empty on SNOW side
             */
            if (payload.updateFields) {
                for (var labelKey in this.pceLabels) {
                    if (payload.updateFields.indexOf(labelKey) > -1) {
                        snowUpdateObject.payloadPut[this.pceLabels[labelKey]] = "";
                    }
                }
            }

            // Prepare the object to push to snow update queue
            for (var labelsToUse_i = 0; labelsToUse_i < labelsToUse.length; labelsToUse_i++) {
                var label, labelDetails, key, value;
                label = labelsToUse[labelsToUse_i];
                labelDetails = this.getLabelDetails(label);
                if (labelDetails) {
                    key = labelDetails.key;
                    value = labelDetails.value;

                    snowUpdateObject.payloadPut[this.pceLabels[key]] = value;

                    // If there are fields to update
                    if (payload.updateFields) {
                        // If the labels is to be updated, update the payloadPut object
                        if (payload.updateFields.indexOf(key) > -1) {
                            snowUpdateObject.payloadPut[this.selectLabels[key]] = value;
                        }
                    }
                } else {
                    this.logger._error('Could not find label having href: ' + label.href);
                }
            }
            snowUpdateQueue.push(snowUpdateObject);
        }
        if (payloadBody.length == 0) {
            return {
                "exception": 'PCE. Check MID Server logs for details.'
            };
        }
        var payloadBody_chunked = [];
        var snowUpdateQueue_chunked = [];
        var payloadBody_length = payloadBody.length;
        var snowUpdateQueue_length = snowUpdateQueue.length;
        var myChunk;

        for (index = 0; index < payloadBody_length; index += this.batchSize) {
            myChunk = payloadBody.slice(index, index + this.batchSize);
            // Do something if you want with the group
            payloadBody_chunked.push(myChunk);
        }

        for (index = 0; index < snowUpdateQueue_length; index += this.batchSize) {
            myChunk = snowUpdateQueue.slice(index, index + this.batchSize);
            // Do something if you want with the group
            snowUpdateQueue_chunked.push(myChunk);
        }
        var payloadBody_chunked_length = payloadBody_chunked.length;
        for (i = 0; i < payloadBody_chunked_length; i++) {

            this.logger._info("IllumioUpdateWorkloads: Updating workloads. Batch: " + (i + 1));

            var snowUpdateQueueFinal = []; // Filtered list acc to workloads status after PCE REST Call

            var url = "/api/v2/orgs/" + this.pceOrgId + "/workloads/bulk_update";
            var putResponse = this.pceHttpClient.put(url, '', '', payloadBody_chunked[i]);

            // If the PUT call failed
            if (putResponse.hasError) {
                this.logger._error("IllumioUpdateWorkloads: Failed to update the workload on PCE.");
                return {
                    "exception": 'PCE. Response status code: ' + putResponse.status
                };
            }

            var putResponseObject = putResponse.data;
            // Create the final SNOW update payload by filtering payloads from failed operations
            for (var putResponseIndex = 0; putResponseIndex < putResponseObject.length; putResponseIndex++) {
                if (putResponseObject[putResponseIndex].status == "updated") {
                    snowUpdateQueueFinal.push(snowUpdateQueue_chunked[i][putResponseIndex]);
                } else {
                    this.logger._error("IllumioUpdateWorkloads: Failed to update a workload on PCE : " + putResponseObject[putResponseIndex].message);
                }
            }

            this.logger._debug("IllumioUpdateWorkloads: Updating the records in the custom table and workload mapping table on SNOW");
            var payloadPut = {};
            for (var p = 0; p < snowUpdateQueueFinal.length; p++) {
                var snowUpdatePayload = {};
                this.logger._debug("IllumioUpdateWorkloads: Updating SNOW table records for workload : " + snowUpdateQueueFinal[p].hostname);
                payloadPut = snowUpdateQueueFinal[p].payloadPut;
                payloadPut["conflicts"] = "false";

                putEndpoint = TABLE_API + PCE_WORKLOADS_TABLE + "/" + snowUpdateQueueFinal[p].sys_id;
                var snowHttpPutResponse = this.snHttpClient.put(putEndpoint, '', '', payloadPut);

                if (snowHttpPutResponse.hasError) {
                    this.logger._error("IllumioUpdateWorkloads: Could not update custom table record for workload - " + snowUpdateQueueFinal[p].hostname);
                    return {
                        "exception": 'ServiceNow. Response status code: ' + snowHttpPutResponse.status
                    };
                } else {
                    this.logger._debug("IllumioUpdateWorkloads: SNOW custom table updated successfully");
                }

                // Update the workload mapping table on SNOW
                this.logger._debug("IllumioUpdateWorkloads: Updating the workload mapping table");
                var snowGetUrl = TABLE_API + PCE_WORKLOADS_MAPPING_TABLE + "?sysparm_query=href=" + snowUpdateQueueFinal[p].href;
                snowGetUrl = encodeURI(snowGetUrl);
                var snowGetResponse = this.snHttpClient.get(snowGetUrl, '');
                if (snowGetResponse.hasError) {
                    // If SNOW table could not be updated
                    this.logger._error("IllumioUpdateWorkloads: Unable to fetch unique identifier from SNOW workload mapping table. Updating the record SKIPPED");
                    continue;
                }

                if (snowGetResponse) {
                    var workloadMappingSysId = snowGetResponse.data.result[0].sys_id;
                }
                snowUpdatePayload["labels"] = JSON.stringify(snowUpdateQueueFinal[p].labels);
                if (snowUpdateQueueFinal[p].payloadPut.select_ip_address != "" && snowUpdateQueueFinal[p].payloadPut.select_ip_address != undefined) {
                    snowUpdatePayload["public_ip"] = snowUpdateQueueFinal[p].payloadPut.select_ip_address;
                }
                if ("interfaces" in snowUpdateQueueFinal[p] && snowUpdateQueueFinal[p].interfaces && snowUpdateQueueFinal[p].interfaces.length > 0) {
                    snowUpdatePayload["interfaces"] = JSON.stringify(snowUpdateQueueFinal[p].interfaces);
                }
                var putEndpoint = TABLE_API + PCE_WORKLOADS_MAPPING_TABLE + "/" + workloadMappingSysId;
                var workloadPutSnowResponse = this.snHttpClient.put(putEndpoint, '', '', snowUpdatePayload);

                if (workloadPutSnowResponse.hasError) {
                    this.logger._error("IllumioUpdateWorkloads: Error while updating mapping table for workload - " + snowUpdateQueueFinal[p].hostname);
                } else {
                    this.logger._info("IllumioUpdateWorkloads: SNOW workload mapping table updated.");
                    updated_workloads++;
                }
            }
        }
        this.logger._info("IllumioUpdateWorkloads: Workload updation complete");
        return {
            "status": true,
            "count": updated_workloads
        };
    },

    /**    * Receive the list of labels to create and the labels to use.
     * Create the required labels and push them to the list of  labels to be used.
     * @param {String} labelsToCreate labels to create.
     * @param {String} labelsToUse labels to use.
     * @return {Boolean} labels were successfully created or not.
     */
    createLabels: function(labelsToCreate, labelsToUse) {

        for (var l = 0, labelLen = labelsToCreate.length; l < labelLen; l++) {
            var label = labelsToCreate[l];
            var storedLabelValue = label.value + "";
            // If the label was created recently use that instead of attempting to create again
            if (this.newLabelsCreated[label.key][label.value]) {
                this.logger._debug("Label already exist : " + label.key + " -> " + label.value);
                labelsToUse.push(this.newLabelsCreated[label.key][label.value]);
                continue;
            }
            // Make the HTTP call to create new the label
            var url = "/api/v2/orgs/" + this.pceOrgId + "/labels/";
            this.logger._debug("Creating Label: " + JSON.stringify(label));
            var response = this.pceHttpClient.post(url, '', null, label);
            if (response.hasError && response.status != 406) {
                this.logger._error("IllumioUpdateWorkloads: Error while creating label -> " + label.key + " : " + label.value);
                return false;
            }

            var status = response.status;
            var respBody = response.data;

            // If the label was created successfully
            if (status == "201" || status == "406") {

                if (status == "406") {
                    this.logger._debug("IllumioUpdateWorkloads: Label is already exist on PCE -> " + label.key + " : " + label.value);
                    this.logger._debug("IllumioUpdateWorkloads: Fetching label details from PCE -> " + label.key + " : " + label.value);
                    url = "/api/v2/orgs/" + this.pceOrgId + "/labels";
                    var queryString = encodeURI("key=" + label.key + "&value=" + label.value);
                    var labelDetails = this.pceHttpClient.get(url, queryString);
                    respBody = null;
                    if (!labelDetails.hasError) {
                        for (var item in labelDetails.data) {
                            if (labelDetails.data[item].key == label.key && (labelDetails.data[item].value + '').toLowerCase() == (label.value + '').toLowerCase()) {
                                respBody = labelDetails.data[item];
                                break;
                            }
                        }
                    } else {
                        this.logger._error("IllumioUpdateWorkloads: Error while fetching label from PCE. Status : " + labelDetails.status);
                        return false;
                    }
                    if (respBody == null) {
                        this.logger._error("IllumioUpdateWorkloads: Could not find label on PCE -> " + label.key + " : " + label.value);
                        return false;
                    }
                } else {
                    this.logger._info("Created label -> " + label.key + " : " + label.value);
                }
                // Append to the list of recently created labels
                this.newLabelsCreated[label.key][storedLabelValue] = {
                    "href": respBody.href
                };
                labelsToUse.push({
                    "href": respBody.href
                });

                // Payload for the request to update labels mapping on SNOW
                var payloadPost = {
                    key: label.key,
                    value: storedLabelValue,
                    href: respBody.href
                };

                var postEndpoint = TABLE_API + PCE_LABELS_MAPPING_TABLE;
                // Make the HTTP call to update the labels mapping table on SNOW.
                var postSnowResponse = this.snHttpClient.post(postEndpoint, '', '', payloadPost);
                // If label creation failed
                if (!postSnowResponse) {
                    this.logger._error("IllumioUpdateWorkloads: Error while updating labels mapping table on SNOW.");
                }
            } else {
                this.logger._error("IllumioUpdateWorkloads: Error while creating label. Status : " + status);
                return false;
            }
        }
        return true;
    },

    /**
     * collect the label details from the ServiceNow
     * @param {string} href 
     */
    collectLabelDetails: function(href) {
        var gr = new GlideRecord('x_illu2_illumio_illumio_pce_labels_mapping');
        if (href) {
            gr.addQuery('href', href);
        }
        gr.query();
        while (gr.next()) {
            this.labelDetails[gr.href + ''] = {
                key: gr.key + '',
                value: gr.value + ''
            };
        }

    },
    /**
     * Fetch and return the details of the labels from PCE
     * @param {JSON} label object.
     * @return {JSON} details of label.
     */
    getLabelDetails: function(label) {

        if (this.labelDetails[label.href]) {
            return this.labelDetails[label.href];
        }
        this.collectLabelDetails(label.href);
        if (this.labelDetails[label.href]) {
            return this.labelDetails[label.href];
        }
        var url = this.pceUrl + "/api/v2" + label.href;
        var labelDetails = this.httpClientObj.PCE_HTTP_GET(
            url,
            this.pceAuthorization,
            this.protocol
        );
        if (!labelDetails.hasError) {
            this.labelDetails[label.href]['key'] = labelDetails.data.key;
            this.labelDetails[label.href]['value'] = labelDetails.data.value;
            return labelDetails[label.href];
        }
        return null;
    },
    /**
     * Check if job is invalidated or not
     * @return {Boolean} running job was invalidated or not.
     */
    _checkInvalidatedJob: function() {
        var jobGr = new GlideRecord(this.SCHEDULED_JOB_TABLE);
        if (jobGr.get(this.jobSysId)) {
            if (jobGr.job_status == "invalidated") {
                this.logger._debug('[run] Given job is invalidated. Aborting further actions.');
                return true;
            }
            return false;
        } else {
            this.logger._error('[run] Error while checking status of given job on ServiceNow. Proceeding with further actions.');
            return false;
        }
    },

    /**
     * Updates scheduled job record with given parameters
     *
     * @param {String} jobId sys_id of the job record
     * @param {String} jobContent content of job
     *
     */
    _updateJobRecord: function(jobSysId, jobContent) {
        if (!this._checkInvalidatedJob()) {

            var jobGr = new GlideRecord(this.SCHEDULED_JOB_TABLE);

            if (jobGr.get(jobSysId)) {
                // Update only if job is not invalidated
                if (jobGr.job_status != 'failed') {
                    for (var key in jobContent) {
                        if (jobContent.hasOwnProperty(key)) {
                            if (key != "logs") {
                                jobGr[key] = jobContent[key];
                            } else {
                                jobGr[key] += '\n' + "[" + this.illumioDateFormat.format(new Date()) + "] " + jobContent[key];
                            }
                        }
                    }
                    jobGr.update();
                } else {
                    this.logger._info('[_updateJobRecord] Given job is invalidated. Aborting further actions.');
                }
            } else {
                this.logger._error('[_updateJobRecord] Data sync job record for given sys_id (' + this.jobSysId + ') does not exist.');
            }
        }
    },

};