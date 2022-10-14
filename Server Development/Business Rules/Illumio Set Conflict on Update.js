(function executeRule(current, previous /*null when async*/) {

    var mappedFields = new IllumioGetPCEConfiguration().getMappedFields();
    mappedFields = mappedFields.fields;
    // Set conflicts to true if any label mismatch present
    if (
        (((current.select_application + "").trim()).toLowerCase() != ((current.pce_application + "").trim()).toLowerCase() && mappedFields.application) ||
        (((current.select_environment + "").trim()).toLowerCase() != ((current.pce_environment + "").trim()).toLowerCase() && mappedFields.environment) ||
        (((current.select_location + "").trim()).toLowerCase() != ((current.pce_location + "").trim()).toLowerCase() && mappedFields.location) ||
        (((current.select_role + "").trim()).toLowerCase() != ((current.pce_role + "").trim()).toLowerCase() && mappedFields.role)
    ) {

        current.conflicts = true;

    } else {
        current.conflicts = false;
        if (current.known_to_pce == "unmanaged") {
            var NUMBER_OF_FIELDS = 6;
            for (var index = 0; index < NUMBER_OF_FIELDS; index++) {
                if ((index == 0 && current["select_ip_address"] != current["pce_ip_address"] && mappedFields.ip_address) ||
                    (current["select_ip_address_" + index] != current["pce_ip_address_" + index] && mappedFields["ip_address_" + index])) {
                    current.conflicts = true;
                    break;
                }
            }
        }
    }

})(current, previous);