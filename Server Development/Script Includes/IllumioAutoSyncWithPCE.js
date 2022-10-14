gs.include("IllumioConstants");
var IllumioAutoSyncWithPCE = Class.create();
IllumioAutoSyncWithPCE.prototype = {
    initialize: function() {
        this.sys_ids = [];
        this.managedWorkloadsList = [];
        this.unManagedWorkloadsList = [];
        this.unknownWorkloadsList = [];
        this.payloadSysIds = [];
        this.workloadsToDelete = 0;
        this.maxSizeOfWorkloadPayload =
            gs.getProperty(
                "x_illu2_illumio.max_workloads_in_each_payload_for_autosync"
            ) || 10000;
    },
    /**
     * Starts the process of auto sync
     * @params {string} illumioJobId Job Id of the scheduled job
     **/
    process: function(illumioJobId) {


        var workload_object = [],
            labelsToCreate = 0;
        var utils = new IllumioUtils();
        var thresholdLimit = new IllumioThresholdLimit();
        var skippedWorkloads = 0;
        try {
            var checkedRecordsSysID, count;
            var sys_ids = [];
            var partial_success = "false";

            var illumioScheduledJobsGr = new GlideRecord(
                "x_illu2_illumio_illumio_scheduled_jobs"
            );
            illumioScheduledJobsGr.addQuery("sys_id", illumioJobId);
            illumioScheduledJobsGr.query();
            illumioScheduledJobsGr.next();

            var userGr = illumioScheduledJobsGr.job_owner;
            var userFirstName = userGr.first_name;
            var userLastName = userGr.last_name;
            var userName = userFirstName + " " + userLastName;
            var pceConfig = new IllumioGetPCEConfiguration().getConfiguration();
            var asyncJobId = illumioScheduledJobsGr.sys_id + "";
            var limit = pceConfig.create_workload_limit;
            limit = parseInt(limit);
            var counter = 0;
            var recordsData = [];
            var selected = [];
            var allWorkloads, allServersGr;

            allWorkloads = new GlideRecord(
                "x_illu2_illumio_illumio_servicenow_servers"
            );

            allWorkloads.addEncodedQuery('duplicate=false^conflicts=true^ORknown_to_pce=unknown');
            allWorkloads.addQuery('deleted_from_pce', false);
            allWorkloads.orderBy("known_to_pce");
            allWorkloads.query();
            while (allWorkloads.next()) {
                // Add to recordsData
                sys_ids.push(allWorkloads.sys_id + '');
                selected.push(allWorkloads.sys_id + '');
            }
            var status = utils.fetchLabelGroupsAndLabelsFromPCE();
            if (!status) {
                gs.error("Mid Server is down");
                return;
            }

            count = utils.countLabelGroups();
            checkedRecordsSysID = utils.skipRecordsForSync(sys_ids);
            if (checkedRecordsSysID.length < selected.length) {
                partial_success = "true";
                skippedWorkloads = selected.length - checkedRecordsSysID.length;
            }

            var mappedFields = new IllumioGetPCEConfiguration().getMappedFields();
            // Process all servers
            for (var i = 0; i < checkedRecordsSysID.length; i++) {

                allServersGr = new GlideRecord(
                    "x_illu2_illumio_illumio_servicenow_servers"
                );
                if (allServersGr.get("sys_id", checkedRecordsSysID[i])) {
                    // Add to recordsData
                    var interfacesObject = utils.getInterfacesObject(checkedRecordsSysID[i], mappedFields.fields);
                    var dataObj = {
                        sys_id: (allServersGr.sys_id + "").trim(),
                        status: "success",
                        hostname: (allServersGr.hostname + "").trim(),
                        href: (allServersGr.pce_workload_href + "").trim(),
                        known_to_pce: (allServersGr.known_to_pce + "").trim(),
                        conflicts: allServersGr.conflicts + "",

                        // ServiceNow label data
                        application: mappedFields.fields.application ? (allServersGr.select_application + "").trim() : (allServersGr.pce_application + "").trim(),
                        environment: mappedFields.fields.environment ? (allServersGr.select_environment + "").trim() : (allServersGr.pce_environment + "").trim(),
                        location: mappedFields.fields.location ? (allServersGr.select_location + "").trim() : (allServersGr.pce_location + "").trim(),
                        role: mappedFields.fields.role ? (allServersGr.select_role + "").trim() : (allServersGr.pce_role + "").trim(),
                        ip_address: (allServersGr.select_ip_address + "").trim(),
                        interfaces: interfacesObject,
                        // PCE label data
                        pce_application: (allServersGr.pce_application + "").trim(),
                        pce_environment: (allServersGr.pce_environment + "").trim(),
                        pce_location: (allServersGr.pce_location + "").trim(),
                        pce_role: (allServersGr.pce_role + "").trim(),
                    };

                    for (var j = 1; j < MAX_IP_ADDRESSES; j++) {
                        var umw = 'umw' + j;
                        var selectIPAddress = 'select_ip_address_' + (j + 1);
                        dataObj[umw] = (allServersGr[selectIPAddress] + "").trim();
                    }
                    recordsData.push(dataObj);
                }
            }


            //Delete Retired Worklaods 
            var retiredWorkloads = new GlideRecord("x_illu2_illumio_illumio_servicenow_servers");
            retiredWorkloads.addQuery('deleted_from_pce', true);
            retiredWorkloads.query();

            /**
             * Generate the managed and unmanaged workloads' list
             * Make AJAX call to forward the processed workload objects after fetching their labels' details
             */
            if (recordsData.length == 0 && !retiredWorkloads.hasNext()) {
                // Table is empty
                gs.info(
                    "Auto synchronization : No unknown or inconsistent or retired workload found."
                );
                illumioScheduledJobsGr.logs +=
                    "\n[" +
                    new Date(new GlideDateTime().getNumericValue()).toISOString() +
                    '] Total critical label groups fetched : ' + count;
                illumioScheduledJobsGr.logs +=
                    "\n[" +
                    new Date(new GlideDateTime().getNumericValue()).toISOString() +
                    "] No unknown or inconsistent or retired workload found";
                illumioScheduledJobsGr.logs +=
                    "\n[" +
                    new Date(new GlideDateTime().getNumericValue()).toISOString() +
                    "] Synchronization with PCE completed" + '\n -------------------------------------\nTotal workloads: ' + skippedWorkloads + '\n Created unknown workloads: 0\n Updated managed workloads: 0\n Updated unmanaged workloads: 0\n Skipped workloads: ' + skippedWorkloads;
                illumioScheduledJobsGr.current_operation =
                    "Synchronization with PCE completed";
                if (partial_success == "true") {
                    illumioScheduledJobsGr.job_status = "partial_success";
                } else {
                    illumioScheduledJobsGr.job_status = "completed";
                }

                illumioScheduledJobsGr.job_completed = new GlideDateTime();
                illumioScheduledJobsGr.update();
                return;
            }

            var labelsToMap;

            // Create list of managed,unmanaged and unknown workloads
            var unknownWorkloadsSelected = 0;
            var unmanagedworkloadSelected = 0;
            var managedworkloadSelected = 0;

            for (var index = 0, len = recordsData.length; index < len; index++) {
                labelsToMap = {};
                var labelKeys = {
                    application: "app",
                    environment: "env",
                    location: "loc",
                    role: "role",
                };

                // Prepare the labelsToMap object
                for (var labelKeyLong in labelKeys) {
                    var labelKey = labelKeys[labelKeyLong];
                    // Push to labelsToMap only if value is non-empty
                    if (recordsData[index][labelKeyLong]) {
                        labelsToMap[labelKey] = recordsData[index][labelKeyLong] + "";
                    }
                }

                // Workload object with common items
                workload_object = {
                    hostname: recordsData[index]["hostname"],
                    sys_id: recordsData[index]["sys_id"],
                    labels: [],
                    createlabels: [],
                };

                // Populate the labels and createLabels lists
                workload_object = this.getUseCreateLabelsList(
                    workload_object,
                    labelsToMap
                );
                var instanceURL = gs.getProperty('glide.servlet.uri');
                instanceURL = instanceURL.replace('https://', '');
                instanceURL = instanceURL.replace('/', '');

                labelsToCreate += workload_object.createlabels.length;
                if (recordsData[index]["known_to_pce"] == "managed") {
                    if (recordsData[index]["conflicts"] == "true") {
                        // If the workload is managed and has conflicts
                        workload_object["href"] = recordsData[index]["href"];

                        // Add note about update
                        workload_object["description"] =
                            "Updated by " +
                            userName +
                            " [" + instanceURL + "] at " +
                            new Date().toLocaleString();

                        workload_object["updateFields"] = mappedFields.updateFields;
                        managedworkloadSelected += 1;
                        this.managedWorkloadsList.push(workload_object);
                        counter = this.addObjectToPayload(false, counter);
                    }
                } else if (recordsData[index]["known_to_pce"] == "unmanaged") {
                    if (recordsData[index]["conflicts"] == "true") {
                        // If the workload is unmanaged and has conflicts
                        workload_object["href"] = recordsData[index]["href"];

                        // Add note about update
                        workload_object["description"] =
                            "Updated by " +
                            userName +
                            " [" + instanceURL + "] at " +
                            new Date().toLocaleString();

                        workload_object["updateFields"] = mappedFields.updateFields;
                        workload_object["known_to_pce"] = recordsData[index]["known_to_pce"];
                        workload_object["interfaces"] = recordsData[index]["interfaces"];
                        gs.info("Unknown Workload Interfaces: " + JSON.stringify(workload_object["interfaces"]));
                        if (recordsData[index]["conflicts"] == "true") {
                            unmanagedworkloadSelected += 1;
                            this.unManagedWorkloadsList.push(workload_object);
                            counter = this.addObjectToPayload(false, counter);
                        }
                    }
                } else {
                    if (limit == 0 || (limit != 0 && this.unknownWorkloadsList.length < limit)) {
                        workload_object["description"] =
                            "Created by " +
                            userName +
                            " [" + instanceURL + "] at " +
                            new Date().toLocaleString();
                        if (recordsData[index]["ip_address"] != "") {
                            workload_object["ip_address"] = recordsData[index]["ip_address"];
                        }
                        workload_object.interfaces = recordsData[index]["interfaces"];
                        this.unknownWorkloadsList.push(workload_object);
                        counter = this.addObjectToPayload(false, counter);
                        unknownWorkloadsSelected += 1;
                    } else {
                        continue;
                    }
                }
            }
            //process retired workloads
            var retired_workloads_object = {};
            while (retiredWorkloads.next()) {
                var retiredSysId = retiredWorkloads.sys_id + '';
                var retiredHostName = retiredWorkloads.hostname.trim() + '';
                var mappingTableGr = new GlideRecord("x_illu2_illumio_illumio_pce_workloads_mapping");
                mappingTableGr.addQuery('hostname', retiredHostName);
                mappingTableGr.addQuery('agent', false);
                mappingTableGr.setLimit(1);
                mappingTableGr.query();
                gs.info("Found Retired Workload");
                if (mappingTableGr.next()) {
                    this.workloadsToDelete++;
                    retired_workloads_object[mappingTableGr.href + ''] = retiredSysId;
                } else {
                    var workloadGr = new GlideRecord('x_illu2_illumio_illumio_servicenow_servers');
                    if (workloadGr.get(retiredSysId)) {
                        workloadGr['deleted_from_pce'] = false;
                        workloadGr.update();
                    }
                }
            }
            var wlToModify = unmanagedworkloadSelected + managedworkloadSelected;
            var checkThreshold = thresholdLimit.checkThresholdLimit(labelsToCreate, wlToModify, unknownWorkloadsSelected, this.workloadsToDelete);
            if (!checkThreshold.hasError && checkThreshold.limitExceed) {
                var notDeletedworkload = new GlideRecord('x_illu2_illumio_illumio_servicenow_servers');
                notDeletedworkload.addQuery('deleted_from_pce', true);
                notDeletedworkload.query();
                while (notDeletedworkload.next()) {
                    notDeletedworkload['deleted_from_pce'] = false;
                    notDeletedworkload.update();
                }
                gs.error(checkThreshold.description);
                illumioScheduledJobsGr.logs +=
                    "\n[" +
                    new Date(new GlideDateTime().getNumericValue()).toISOString() +
                    "] " + checkThreshold.description;

                illumioScheduledJobsGr.job_status = "failed";

                illumioScheduledJobsGr.job_completed = new GlideDateTime();
                if (!illumioScheduledJobsGr.update()) {
                    gs.error("Error while updating process monitor.");
                }
                return;
            } else if (checkThreshold.hasError) {
                illumioScheduledJobsGr.logs +=
                    "\n[" +
                    new Date(new GlideDateTime().getNumericValue()).toISOString() +
                    "] " + checkThreshold.description;
                illumioScheduledJobsGr.current_operation =
                    "Synchronization with PCE Failed";

                illumioScheduledJobsGr.job_status = "failed";

                illumioScheduledJobsGr.job_completed = new GlideDateTime();
                if (!illumioScheduledJobsGr.update()) {
                    gs.error("Error while updating process monitor.");
                }

                return;
            }

            gs.info("Sync process started");

            try {
                // Skip the operation if no workload to process
                if (
                    this.managedWorkloadsList.length +
                    this.unManagedWorkloadsList.length +
                    this.unknownWorkloadsList.length ==
                    0 &&
                    this.payloadSysIds.length == 0 && this.workloadsToDelete == 0
                ) {
                    gs.info(
                        "Auto synchronization : No unknown or inconsistent workload found."
                    );
                    illumioScheduledJobsGr.logs +=
                        "\n[" +
                        new Date(new GlideDateTime().getNumericValue()).toISOString() +
                        '] Total critical label groups fetched : ' + count;
                    illumioScheduledJobsGr.logs +=
                        "\n[" +
                        new Date(new GlideDateTime().getNumericValue()).toISOString() +
                        "] No unknown or inconsistent workload found";

                    illumioScheduledJobsGr.logs += "\n[" + new Date(new GlideDateTime().getNumericValue()).toISOString() + "] Synchronization with PCE completed" + '\n -------------------------------------\nTotal workloads: ' + skippedWorkloads + '\n Created unknown workloads: ' + this.unknownWorkloadsList.length + '\n Updated managed workloads: ' + this.managedWorkloadsList.length + '\n Updated unmanaged workloads: ' + this.unManagedWorkloadsList.length + '\n Skipped workloads: ' + skippedWorkloads;
                    illumioScheduledJobsGr.current_operation =
                        "Synchronization with PCE completed";
                    if (partial_success == "true") {
                        illumioScheduledJobsGr.job_status = "partial_success";
                    } else {
                        illumioScheduledJobsGr.job_status = "completed";
                    }
                    illumioScheduledJobsGr.job_completed = new GlideDateTime();
                    illumioScheduledJobsGr.update();
                    return;
                }
                pceConfig = new IllumioGetPCEConfiguration().getConfiguration();
                var mappingOfFields = new IllumioGetPCEConfiguration().getMappedFields();
                mappingOfFields = JSON.stringify(mappingOfFields.fields);
                var operation = "updateCreate";
                this.addObjectToPayload(true, counter);

                // The probe parameters to the ECC request
                var parameters = {
                    autoSync: "true",
                    payloadSysIds: this.payloadSysIds + "",
                    jobSysId: asyncJobId,
                    partialSucc: partial_success,
                    skipped: skippedWorkloads,
                    count: count,
                    operation: operation,
                    pce_url: pceConfig.pceUrl,
                    pce_secret: pceConfig.pceSecret,
                    pce_username: pceConfig.pceUsername,
                    fieldMappings: mappingOfFields,
                    pce_org_id: pceConfig.pceOrganizationID + "",
                    pce_authorization: gs.base64Encode(
                        pceConfig.pceUsername + ":" + pceConfig.pceSecret
                    ),
                    time_zone: gs.getSession().getTimeZoneName(),
                    batch_size: gs.getProperty(
                        "x_illu2_illumio.bulk_operation_batch_size",
                        1000
                    ),
                    workloads_to_delete: JSON.stringify(retired_workloads_object),
                    pce_mid_proxy: pceConfig.enable_pce_mid_proxy,
                    retry_params: JSON.stringify(pceConfig.retry_params)
                };
                // Add the request to ECC queue
                var illumioAddToECCQueue = new IllumioAddToECCQueue(
                    "IllumioUpdateWorkloads",
                    pceConfig.midServer,
                    parameters
                );
                illumioAddToECCQueue.insert();

                gs.info("Started auto synchronization");
            } catch (exception) {
                gs.error(
                    "Exception occurred while preparing request data. Exception: " +
                    exception);
            }

            /**
             * Fetch value of label if exist in mapping table and append to labelsToUse
             * If not present, append the key-value pair to labelsToCreate
             */
        } catch (e) {
            gs.error("Exception occurred while syncing " + e);
        }
    },

    /**
     * 
     * @param {JSON} workload_object Object of the workload
     * @param {JSON} labelsToMap Object of the labels to map
     * @returns updated object of the workload
     */
    getUseCreateLabelsList: function(workload_object, labelsToMap) {
        var labelsGr = new GlideRecord(
            "x_illu2_illumio_illumio_pce_labels_mapping"
        );
        for (var labelType in labelsToMap) {
            labelsGr.initialize();
            labelsGr.addQuery("key", labelType);
            labelsGr.addQuery("value", labelsToMap[labelType]);
            labelsGr.query();
            var found = false;
            while (labelsGr.next()) {
                if (labelsToMap[labelType] && labelsToMap[labelType] == labelsGr.getValue('value')) {
                    // Append to labels to use
                    workload_object.labels.push({
                        href: labelsGr.getValue("href"),
                    });
                    found = true;
                }
            }

            if (!found) {
                // Append to labels to be created if not empty
                if (labelsToMap[labelType]) {
                    workload_object.createlabels.push({
                        key: labelType,
                        value: labelsToMap[labelType],
                    });
                }
            }
        }
        return workload_object;
    },

    /**
     * this function will add the workload payload to table if couter exceeds or if its a last batch
     * @param {boolean} pushBundle
     * @param {number} objCounter
     */
    addObjectToPayload: function(pushBundle, objCounter) {
        objCounter++;

        var sys_id = "";

        if (objCounter >= this.maxSizeOfWorkloadPayload || pushBundle == true) {
            if (
                (this.managedWorkloadsList.length +
                    this.unManagedWorkloadsList.length +
                    this.unknownWorkloadsList.length + this.workloadsToDelete) !=
                0
            ) {
                var grPayload = new GlideRecord(
                    "x_illu2_illumio_illumio_autosync_payload"
                );
                grPayload.initialize();
                var payload = {
                    updateManaged: this.managedWorkloadsList,
                    updateUnManaged: this.unManagedWorkloadsList,
                    createUnknown: this.unknownWorkloadsList,
                    isAutoSync: true,
                };
                JSON.stringify("Payloadxyz: " + JSON.stringify(payload));
                grPayload.payload = JSON.stringify(payload);
                sys_id = grPayload.insert();
                if (gs.nil(sys_id)) {
                    gs.error(
                        "[IllumioAutoSyncWithPCE] Error while inserting record in payload table"
                    );
                } else {
                    this.payloadSysIds.push(sys_id);
                    this.managedWorkloadsList = [];
                    this.unManagedWorkloadsList = [];
                    this.unknownWorkloadsList = [];
                    this.workloadsToDelete = 0;
                    objCounter = 0;
                }
            }
        }
        return objCounter;
    },
    type: "IllumioAutoSyncWithPCE",
};