function onLoad() {

    var known_to_pce = g_form.getValue('known_to_pce').trim();
    var conflicts = g_form.getValue('conflicts').trim();
    var duplicate = g_form.getValue('duplicate').trim();

    g_form.showFieldMsg("conflicts", "A workload is marked \"Label Conflicts\" if any of the PCE labels conflict with the corresponding CMDB value.");
    g_form.showFieldMsg("duplicate", "Host name of this record matches the hostname of another record. If marked \"Duplicate\", this record will not be used.");
    g_form.showFieldMsg("duplicate_of", "In case of a \"Duplicate\" workload, this field displays the primary workload.");

    // For unknown or managed/unmanaged workload with no conflicts hide Update to PCE section
    if (known_to_pce == "unknown" || (known_to_pce != "unknown" && conflicts == "false") || duplicate == "true") {
        g_form.setSectionDisplay("sync_servertopce", false);
    }

    // Enable Add to PCE section only for unknown workloads with non-empty CMDB IP Address
    if (known_to_pce != "unknown" || duplicate == "true") {
        g_form.setSectionDisplay("sync_topce", false);
    }
    if(known_to_pce == "managed"){
        g_form.setDisplay('update_ip_address', false);
    }

    // Hide all labels having JSON value and hidden value fields

    g_form.setDisplay('pce_workload_href', false);
    g_form.setDisplay('hostname', false);
}