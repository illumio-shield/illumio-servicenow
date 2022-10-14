/**
 * This script will fetch the existing field mappings from PCE configuration
 * and add that field mapping to Illumio PCE Field Mappings table(x_illu2_illumio_illumio_pce_field_mapping)
 */

gs.info('Running "Add exisiting mapping to other table" fix script of Illumio');

// fetching PCE configuration record
var grPCEConfig = new GlideRecord('x_illu2_illumio_illumio_pce_conf');
grPCEConfig.setLimit(1);
grPCEConfig.query();

// check if record exists
if (grPCEConfig.next()) {

    if (!gs.nil(grPCEConfig.servicenow_source_table) && !gs.nil(grPCEConfig.host_name)) {

        // creating record in PCE field mapping
        var grPCEFieldMapping = new GlideRecord('x_illu2_illumio_illumio_pce_field_mapping');
        grPCEFieldMapping.servicenow_source_table = grPCEConfig.servicenow_source_table;
        grPCEFieldMapping.host_name = grPCEConfig.host_name;
        grPCEFieldMapping.pce_configuration = grPCEConfig.sys_id;

        if (!gs.nil(grPCEConfig.application)) {
            grPCEFieldMapping.application = grPCEConfig.application;
        }
        if (!gs.nil(grPCEConfig.location)) {
            grPCEFieldMapping.location = grPCEConfig.location;
        }
        if (!gs.nil(grPCEConfig.role)) {
            grPCEFieldMapping.role = grPCEConfig.role;
        }
        if (!gs.nil(grPCEConfig.environment)) {
            grPCEFieldMapping.environment = grPCEConfig.environment;
        }
        if (!gs.nil(grPCEConfig.ip_address)) {
            grPCEFieldMapping.ip_address = grPCEConfig.ip_address;
        }

        if (!grPCEFieldMapping.insert()) {
            gs.error('Error while inserting field mapping record in PCE configuration');
        } else {
            gs.info('Successfully added field mapping in PCE field mapping table');
        }
    } else {
        gs.info('Source table or Host name is not selected in PCE configuration. Hence skipping the record creation for field mapping');
    }
} else {
    gs.info('No PCE configuration found for Illumio application. Hence skipping the record creation for field mapping');
}