'use strict';
// Historical v283 suites pin the version that was current when their exact
// payout witnesses were captured. All runtime code and native workers remain
// the production implementations; the separate v284 suite uses today's default.
const current=require('./sixdrop-v283-fixture.cjs');
const REVISION=283;
module.exports={...current,R:{...current.R,CURRENT_REVISION:REVISION},
 createHost(options={}){return current.createHost({rulesRevision:REVISION,...options});},
 fullRound(seed,options={}){return current.fullRound(seed,{rulesRevision:REVISION,...options});}
};
