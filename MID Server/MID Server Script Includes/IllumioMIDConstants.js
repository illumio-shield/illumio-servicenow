ms.include("IllumioHttpIncludes");
var METHODS = {
    GET: "GET",
    POST: "POST",
    PUT: "PUT",
    DELETE: "DELETE"    
};
var METHOD_CLASSES = {
    GET: GetMethod,
    POST: PostMethod,
    PUT: PutMethod,
    DELETE: DeleteMethod
};
var SUCCESS_CODES = [200, 201, 202, 204];
var RETRY_CODES = [429];
var MAX_IP_ADDRESSES = 32;
var MAX_RETRY_COUNTS = 3;
var TABLE_API = "/api/now/table/";
var SCHEDULED_JOB_TABLE = "x_illu2_illumio_illumio_scheduled_jobs";
var ASYNC_JOB_TABLE = "x_illu2_illumio_illumio_pce_async_jobs";
var AUTOSYNC_PAYLOAD_TABLE = "x_illu2_illumio_illumio_autosync_payload";
var PCE_WORKLOADS_TABLE = "x_illu2_illumio_illumio_servicenow_servers";
var PCE_WORKLOADS_MAPPING_TABLE = "x_illu2_illumio_illumio_pce_workloads_mapping";
var PCE_LABELS_MAPPING_TABLE = "x_illu2_illumio_illumio_pce_labels_mapping";