(function executeRule(current, previous /*null when async*/) {

    var mappedFields = new IllumioGetPCEConfiguration().getMappedFields();
    mappedFields = mappedFields.fields;
    // Set conflicts to true if any label mismatch present
    current.conflicts = new IllumioUtils().checkConflict(current,mappedFields);

})(current, previous);