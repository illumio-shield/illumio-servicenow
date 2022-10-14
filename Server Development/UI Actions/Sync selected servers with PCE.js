function doSyncWithPCE() {
    // jshint maxerr:100
    // get the selected servers
    var checkedRecordsSysID = g_list.getChecked();
    //var selected = [];
    var selected, labelsToCreate, instanceURL;
    var partial_succ = "false",
        status, count = 0;

    var selectedRecordsData = [],
        gaCustomTableData,
        gaCustomTableData2,
        gaCustomTableData3,
        managedWorkloads = [],
        unmanagedWorkloads = [],
        unknownWorkloads = [],
        jobSysId,
        ans, skippedWorkloads = 0,
        answer,
        fieldMapping;

    var managed_workloads_list = [];
    var unmanaged_workloads_list = [];
    var unknown_workloads_list = [];

    var userFirstName = g_user.firstName;
    var userLastName = g_user.lastName;
    var userName = userFirstName + " " + userLastName;
    var validWorkloads;
    var combinedWorkloads = {};
    var loadingDialog = new GlideModal();

    loadingDialog.setTitle("Starting sync process");
    loadingDialog.setWidth(400);
    loadingDialog.renderWithContent(
        '<html><body><div class="row loading-container" id="loadingDialog"><label style="font-size: medium;">Validating Sync process...</label><br /><div class="loading-indicator icon-loading icon-lg"></div></div></html>'
    );

    gaCustomTableData = new GlideAjax("GetLabelGroupsAjax");
    gaCustomTableData.addParam("sysparm_name", "filterRecords");
    gaCustomTableData.addParam("sysparm_sys_ids", checkedRecordsSysID);
    gaCustomTableData.getXML(gaParseIdResponse);

    function gaParseIdResponse(response) {
        ans = response.responseXML.documentElement.getAttribute("answer");
        ans = JSON.parse(ans);
        checkedRecordsSysID = ans;
        checkedRecordsSysID = selected = checkedRecordsSysID + "";
        fetchDataFromPCE();
    }

    function fetchDataFromPCE() {
        gaCustomTableData = new GlideAjax("GetLabelGroupsAjax");
        gaCustomTableData.addParam("sysparm_name", "fetchCriticalLabels");
        gaCustomTableData.getXML(gaParseResponse);

        function gaParseResponse(response) {
            ans = response.responseXML.documentElement.getAttribute("answer");
            status = JSON.parse(ans);
            if (!status) {
                loadingDialog.destroy();
                var dialog = new GlideDialogWindow("x_illu2_illumio_IllumioInfoPopup");
                dialog.setTitle(
                    "Can not start data sync process as MID server is down"
                );
                dialog.render();
                return;
            }
            getLabelGroups();
        }
    }

    function getLabelGroups() {
        gaCustomTableData = new GlideAjax("GetLabelGroupsAjax");
        gaCustomTableData.addParam("sysparm_name", "fetchLabelsForLabelGroups");
        gaCustomTableData.addParam("sysparm_sys_ids", JSON.stringify(checkedRecordsSysID));
        gaCustomTableData.getXML(gaParseLResponse);

        /**
         * Callback function for AJAX call to IllumioGetCustomTableRecord
         */
        function gaParseLResponse(response) {
            answer = response.responseXML.documentElement.getAttribute("answer");

            answer = JSON.parse(answer);
            checkedRecordsSysID = answer;
            getLabelGroupsCount();
        }
    }

    function getLabelGroupsCount() {
        gaCustomTableData = new GlideAjax('GetLabelGroupsAjax');
        gaCustomTableData.addParam('sysparm_name', 'countCriticalGroupsFetched');
        gaCustomTableData.getXML(gaParseLCResponse);

        function gaParseLCResponse(response) {
            answer = response.responseXML.documentElement.getAttribute("answer");
            count = answer;
            getCustomtableRecord();
        }
    }

    function getCustomtableRecord() {
        loadingDialog.destroy();
        if (checkedRecordsSysID.length < selected.split(",").length) {
            skippedWorkloads = parseInt(selected.split(',').length) - parseInt(checkedRecordsSysID.length);
            skippedWorkloads = skippedWorkloads + '';
            partial_succ = "true";
        }
        if (checkedRecordsSysID.length == 0) {
            var dialog = new GlideDialogWindow("x_illu2_illumio_IllumioInfoPopup");
            dialog.setTitle("Cannot sync a workload that has a critical label.");
            dialog.render();
            return;
        }

        gaCustomTableData = new GlideAjax("IllumioGetCustomTableRecord");
        gaCustomTableData.addParam("sysparm_name", "getData");
        gaCustomTableData.addParam("sysparm_sys_ids", checkedRecordsSysID);
        gaCustomTableData.getXML(gaParseTableResponse);

        /**
         * Callback function for AJAX call to IllumioGetCustomTableRecord
         */
        function gaParseTableResponse(response) {
            answer = response.responseXML.documentElement.getAttribute("answer");
            answer = JSON.parse(answer);

            // Filter the successful responses
            for (var index = 0, len = answer.length; index < len; index++) {
                if (answer[index]["status"] == "success") {
                    selectedRecordsData.push(answer[index]);
                }
            }
            getLabelCounter();
        }
    }

    function getLabelCounter() {
        var gaLabel = new GlideAjax("GetLabelGroupsAjax");
        gaLabel.addParam("sysparm_name", "getCreateLabelCounter");
        gaLabel.addParam("sysparm_selectedRecordsData", JSON.stringify(selectedRecordsData));
        gaLabel.getXML(processLabelCounter);

        function processLabelCounter(response1) {
            var ans1 = response1.responseXML.documentElement.getAttribute("answer");
            ans1 = JSON.parse(ans1);
            if (!ans1.hasError) {
                labelsToCreate = parseInt(ans1.counter);
                instanceURL = ans1.instanceURL;
                preparePayload();
            } else {
                var dialog = new GlideDialogWindow("x_illu2_illumio_IllumioInfoPopup");
                dialog.setTitle(ans1.message);
                dialog.render();
            }

        }
    }

    /**
     * Generate the managed and unmanaged workloads' list
     * Make AJAX call to forward the processed workload objects after fetching their labels' details
     */
    function preparePayload() {
        var dialog;
        if (selectedRecordsData.length == 0) {
            dialog = new GlideDialogWindow("x_illu2_illumio_IllumioInfoPopup");
            dialog.setTitle("No valid workload selected.");
            dialog.render();
            return false;
        }

        for (var index = 0, len = selectedRecordsData.length; index < len; index++) {

            // If the workload is knonw to PCE
            if (selectedRecordsData[index]["known_to_pce"] == "managed") {
                if (selectedRecordsData[index]["conflicts"] == "true") {
                    managedWorkloads.push({
                        known_to_pce: selectedRecordsData[index]["known_to_pce"],
                        sys_id: selectedRecordsData[index]["sys_id"],
                        href: selectedRecordsData[index]["href"],
                        hostname: selectedRecordsData[index]["hostname"],
                        application: selectedRecordsData[index]["application"],
                        environment: selectedRecordsData[index]["environment"],
                        location: selectedRecordsData[index]["location"],
                        role: selectedRecordsData[index]["role"],
                        operation: "update",
                    });
                }
            } else if (selectedRecordsData[index]["known_to_pce"] == "unmanaged") {
                if (selectedRecordsData[index]["conflicts"] == "true") {
                    unmanagedWorkloads.push({
                        known_to_pce: selectedRecordsData[index]["known_to_pce"],
                        sys_id: selectedRecordsData[index]["sys_id"],
                        href: selectedRecordsData[index]["href"],
                        hostname: selectedRecordsData[index]["hostname"],
                        application: selectedRecordsData[index]["application"],
                        environment: selectedRecordsData[index]["environment"],
                        location: selectedRecordsData[index]["location"],
                        role: selectedRecordsData[index]["role"],
                        interfaces: selectedRecordsData[index]["interfaces"],
                        operation: "update",
                    });
                }
            } else {
                unknownWorkloads.push({
                    known_to_pce: selectedRecordsData[index]["known_to_pce"],
                    sys_id: selectedRecordsData[index]["sys_id"],
                    hostname: selectedRecordsData[index]["hostname"],
                    application: selectedRecordsData[index]["application"],
                    environment: selectedRecordsData[index]["environment"],
                    location: selectedRecordsData[index]["location"],
                    role: selectedRecordsData[index]["role"],
                    select_ip_address: selectedRecordsData[index]["ip_address"],
                    select_ip_address_2: selectedRecordsData[index]["umw1"],
                    select_ip_address_3: selectedRecordsData[index]["umw2"],
                    select_ip_address_4: selectedRecordsData[index]["umw3"],
                    select_ip_address_5: selectedRecordsData[index]["umw4"],
                    select_ip_address_6: selectedRecordsData[index]["umw5"],
                    operation: "create",
                });
            }
        }

        // If there is no workload selected
        if (unknownWorkloads.length + managedWorkloads.length + unmanagedWorkloads.length == 0) {
            dialog = new GlideDialogWindow("x_illu2_illumio_IllumioInfoPopup");
            dialog.setTitle("No valid workload selected.");
            dialog.render();
        } else {

            var wlToModify = managedWorkloads.length + unmanagedWorkloads.length;
            var workloadToCreate = unknownWorkloads.length;
            var gaThreshold = new GlideAjax("GetLabelGroupsAjax");
            gaThreshold.addParam("sysparm_name", "checkThresholdLimit");
            gaThreshold.addParam('sysparm_labelsToCreate', labelsToCreate + '');
            gaThreshold.addParam('sysparm_wlToModify', wlToModify + '');
            gaThreshold.addParam('sysparm_workloadToCreate', workloadToCreate + '');
            gaThreshold.getXML(function(response) {
                ans = response.responseXML.documentElement.getAttribute("answer");
                ans = JSON.parse(ans);
                if (!ans.limitExceed) {
                    createScheduledJob();
                } else {
                    dialog = new GlideDialogWindow("x_illu2_illumio_IllumioInfoPopup");
                    dialog.setTitle(ans.description);
                    dialog.render();
                }

            });


        }

    }

    function createScheduledJob() {
        validWorkloads =
            unknownWorkloads.length +
            managedWorkloads.length +
            unmanagedWorkloads.length;

        //Creating new data sync job
        var createJob = new GlideAjax("IllumioManageJobs");
        createJob.addParam("sysparm_name", "createScheduledJob");
        createJob.addParam("sysparm_job_status", "running");
        createJob.addParam("sysparm_type_flag", "false");
        createJob.addParam(
            "sysparm_current_operation",
            "Sync process for " + validWorkloads + " workload(s) has started"
        );
        createJob.addParam(
            "sysparm_logs",
            "Sync process for " + validWorkloads + " workload(s) has started"
        );
        createJob.addParam("sysparm_job_type", "data sync");
        createJob.getXML(gaGetJobSysID);
        // Process the managed workloads
        /**
         * Callback function for AJAX call to IllumioManageJobs
         */
        function gaGetJobSysID(response) {
            jobSysId = response.responseXML.documentElement.getAttribute("answer");
            // Check if sceduled job is created or not
            if (jobSysId == null) {
                var dialog = new GlideDialogWindow("x_illu2_illumio_IllumioInfoPopup");
                dialog.setTitle(
                    "Can not start data sync process as there is data collection in running state."
                );
                dialog.render();
            } else {
                dialog = new GlideDialogWindow("x_illu2_illumio_IllumioInfoPopup");
                dialog.setTitle("Sync process started");
                dialog.render();
                processWorkloads();

            }
        }

    }

    function processWorkloads() {

        var ga_fields = new GlideAjax("IllumioPrepareWorkload");
        ga_fields.addParam("sysparm_name", "getMappedFields");

        ga_fields.getXML(gaParseFieldsResponse);

        function gaParseFieldsResponse(responseFields) {
            fieldMapping = JSON.parse(responseFields.responseXML.documentElement.getAttribute("answer"));

            var labelsToMap;
            for (var mw = 0; mw < managedWorkloads.length; mw++) {
                labelsToMap = {
                    app: managedWorkloads[mw].application,
                    env: managedWorkloads[mw].environment,
                    loc: managedWorkloads[mw].location,
                    role: managedWorkloads[mw].role,
                };


                gaCustomTableData = new GlideAjax("IllumioPrepareWorkload");
                gaCustomTableData.addParam("sysparm_name", "getHrefs");
                gaCustomTableData.addParam(
                    "sysparm_labels_to_map",
                    JSON.stringify(labelsToMap)
                );
                gaCustomTableData.addParam(
                    "sysparm_workload",
                    JSON.stringify(managedWorkloads[mw])
                );

                gaCustomTableData.getXML(function(response) {
                    gaParseLabelsResponse(response, combinedWorkloads);
                });
            }

            // Process the unmanaged workloads
            for (var umw = 0; umw < unmanagedWorkloads.length; umw++) {
                labelsToMap = {
                    app: unmanagedWorkloads[umw].application,
                    env: unmanagedWorkloads[umw].environment,
                    loc: unmanagedWorkloads[umw].location,
                    role: unmanagedWorkloads[umw].role,
                };

                gaCustomTableData2 = new GlideAjax("IllumioPrepareWorkload");
                gaCustomTableData2.addParam("sysparm_name", "getHrefs");
                gaCustomTableData2.addParam(
                    "sysparm_labels_to_map",
                    JSON.stringify(labelsToMap)
                );
                gaCustomTableData2.addParam(
                    "sysparm_workload",
                    JSON.stringify(unmanagedWorkloads[umw])
                );

                gaCustomTableData2.getXML(function(response) {
                    gaParseLabelsResponse(response, combinedWorkloads);
                });
            }
            // Process the unknown workloads
            for (var uk = 0; uk < unknownWorkloads.length; uk++) {
                labelsToMap = {
                    app: unknownWorkloads[uk].application,
                    env: unknownWorkloads[uk].environment,
                    loc: unknownWorkloads[uk].location,
                    role: unknownWorkloads[uk].role,
                };
                gaCustomTableData3 = new GlideAjax("IllumioPrepareWorkload");
                gaCustomTableData3.addParam("sysparm_name", "getHrefs");
                gaCustomTableData3.addParam(
                    "sysparm_labels_to_map",
                    JSON.stringify(labelsToMap)
                );
                gaCustomTableData3.addParam(
                    "sysparm_workload",
                    JSON.stringify(unknownWorkloads[uk])
                );

                gaCustomTableData3.getXML(function(response) {

                    gaParseLabelsResponse(response, combinedWorkloads);
                });
            }
        }
    }

    /**
     * Get the label details for a PCE and push the workload to the global list
     */
    function gaParseLabelsResponse(response, combinedWorkloads) {
        var href, answer, limit;
        var answer_raw = JSON.parse(
            response.responseXML.documentElement.getAttribute("answer")
        );

        href = answer_raw.workload.href;
        answer = answer_raw.retVal;

        // The object to be pushed to the global list
        var workload_object = {
            href: href,
            hostname: answer_raw.workload.hostname,
            sys_id: answer_raw.workload.sys_id,
            labels: [],
            createlabels: [],
        };

        // Filter the label response and push the existing labels in "labels" and non existant ones to "createlabels" list
        for (var lr = 0; lr < answer.length; lr++) {
            var label_response = answer[lr];
            if (label_response.status == "success") {
                workload_object.labels.push({
                    href: label_response["href"],
                });
            } else if (
                label_response.status == "failed" &&
                label_response.value != ""
            ) {
                workload_object.createlabels.push({
                    key: label_response.key,
                    value: label_response.value,
                });
            }
        }

        var ga_update;

        if (answer_raw.workload.known_to_pce == "unknown") {
            limit = unknownWorkloads.length;
            workload_object["description"] =
                "Created by " +
                userName +
                " [" + instanceURL + "] at " +
                new Date().toLocaleString();
            if (answer_raw.workload.select_ip_address != "") {
                workload_object["ip_address"] = answer_raw.workload.select_ip_address;
            }
            if (answer_raw.workload.select_ip_address_2 != "") {
                workload_object["umw1"] = answer_raw.workload.select_ip_address_2;
            }
            if (answer_raw.workload.select_ip_address_3 != "") {
                workload_object["umw2"] = answer_raw.workload.select_ip_address_3;
            }
            if (answer_raw.workload.select_ip_address_4 != "") {
                workload_object["umw3"] = answer_raw.workload.select_ip_address_4;
            }
            if (answer_raw.workload.select_ip_address_5 != "") {
                workload_object["umw4"] = answer_raw.workload.select_ip_address_5;
            }
            if (answer_raw.workload.select_ip_address_6 != "") {
                workload_object["umw5"] = answer_raw.workload.select_ip_address_6;
            }

            unknown_workloads_list.push(workload_object);

            // Check if the global workload list is completely updated

            combinedWorkloads["createUnknown"] = unknown_workloads_list;

            if (unknown_workloads_list.length == limit) {
                if ((managedWorkloads.length == 0 || (managedWorkloads.length && combinedWorkloads["updateManaged"])) && (unmanagedWorkloads.length == 0 || (unmanagedWorkloads.length && combinedWorkloads["updateUnManaged"]))) {
                    ga_update = new GlideAjax("IllumioUpdatePCE");
                    ga_update.addParam("sysparm_name", "action");
                    ga_update.addParam("sysparm_operation", "updateCreate");
                    ga_update.addParam("sysparm_skipped_count", skippedWorkloads + "");
                    ga_update.addParam("sysparm_jobSysId", jobSysId);
                    ga_update.addParam("sysparm_partial", partial_succ);
                    ga_update.addParam("sysparm_count", count + "");
                    ga_update.addParam("sysparm_custom_record_sys_id", checkedRecordsSysID);
                    ga_update.addParam("sysparm_payload", JSON.stringify(combinedWorkloads));
                    ga_update.getXML();
                }
            }
        } else if (answer_raw.workload.known_to_pce == "managed") {
            // Update operation
            limit = managedWorkloads.length;
            workload_object["description"] =
                "Updated by " +
                userName +
                " [" + instanceURL + "] at " +
                new Date().toLocaleString();

            workload_object["updateFields"] = fieldMapping.updateFields;
            managed_workloads_list.push(workload_object);
            // Check if the global workload list is completely updated
            if (managed_workloads_list.length == limit) {
                combinedWorkloads["updateManaged"] = managed_workloads_list;
                if (
                    (unknownWorkloads.length == 0 ||
                        (unknownWorkloads.length && combinedWorkloads["createUnknown"])) &&
                    (unmanagedWorkloads.length == 0 ||
                        (unmanagedWorkloads.length && combinedWorkloads["updateUnManaged"]))
                ) {
                    ga_update = new GlideAjax("IllumioUpdatePCE");
                    ga_update.addParam("sysparm_name", "action");
                    ga_update.addParam("sysparm_operation", "updateCreate");
                    ga_update.addParam("sysparm_skipped_count", skippedWorkloads + "");
                    ga_update.addParam("sysparm_jobSysId", jobSysId);
                    ga_update.addParam("sysparm_partial", partial_succ);
                    ga_update.addParam("sysparm_count", count + "");
                    ga_update.addParam("sysparm_custom_record_sys_id", checkedRecordsSysID);
                    ga_update.addParam("sysparm_payload", JSON.stringify(combinedWorkloads));
                    ga_update.getXML();
                }
            }
        } else if (answer_raw.workload.known_to_pce == "unmanaged") {
            // Update operation
            limit = unmanagedWorkloads.length;
            workload_object["description"] =
                "Updated by " +
                userName +
                " [" + instanceURL + "] at " +
                new Date().toLocaleString();

            workload_object["updateFields"] = fieldMapping.updateFields;
            workload_object["known_to_pce"] = answer_raw.workload.known_to_pce;
            workload_object["interfaces"] = answer_raw.workload.interfaces;
            unmanaged_workloads_list.push(workload_object);
            // Check if the global workload list is completely updated
            if (unmanaged_workloads_list.length == limit) {
                combinedWorkloads["updateUnManaged"] = unmanaged_workloads_list;
                if (
                    (managedWorkloads.length == 0 ||
                        (managedWorkloads.length && combinedWorkloads["updateManaged"])) &&
                    (unknownWorkloads.length == 0 ||
                        (unknownWorkloads.length && combinedWorkloads["createUnknown"]))
                ) {
                    //var ga_update;
                    ga_update = new GlideAjax("IllumioUpdatePCE");
                    ga_update.addParam("sysparm_name", "action");
                    ga_update.addParam("sysparm_operation", "updateCreate");
                    ga_update.addParam("sysparm_skipped_count", skippedWorkloads + "");
                    ga_update.addParam("sysparm_jobSysId", jobSysId);
                    ga_update.addParam("sysparm_partial", partial_succ);
                    ga_update.addParam("sysparm_count", count + "");
                    ga_update.addParam("sysparm_custom_record_sys_id", checkedRecordsSysID);
                    ga_update.addParam("sysparm_payload", JSON.stringify(combinedWorkloads));
                    ga_update.getXML();
                }
            }
        }
    }
}