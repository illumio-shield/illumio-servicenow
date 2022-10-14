var MID_SERVER_UP_STATUS = "Up";
var MID_SERVER_VALIDATED_STATUS = "true";
var MID_SERVER_VERSION = gs.getProperty('mid.buildstamp', null);
var MID_SERVER_USER_ROLE = "mid_server";
var ILLUMIO_MID_SERVER_ROLE = "x_illu2_illumio.mid_server_user";
var CLIENT_ERROR_TYPE = 0;
var SERVER_ERROR_TYPE = 1;
var MAX_IP_ADDRESSES = 32;
var STATES = {
    INVALID: 0,
    VALID: 1,
    NOT_MAPPED_AND_VALID: 2,
    EMPTY: 3
};