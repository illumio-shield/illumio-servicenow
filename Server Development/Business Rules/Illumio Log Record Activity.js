(function executeRule(current, previous /*null when async*/) {

    if(current.operation() == 'insert') {
        gs.info('New record created in \'Illumio PCE workload\' table by {0}({1}) with sys_id {2}', gs.getUserName(), gs.getUserID(), current.sys_id + "");
    } else {
        gs.info('Record with sys_id {0} in \'Illumio PCE workload\' table updated by {1}({2})', current.sys_id + "", gs.getUserName(), gs.getUserID());
    }

})(current, previous);