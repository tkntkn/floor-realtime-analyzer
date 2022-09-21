(function(){"use strict";self.addEventListener("message",t=>{const e=t.data,a=e[0].time;for(const s of e)s.time-a,self.postMessage(s);self.close()})})();
