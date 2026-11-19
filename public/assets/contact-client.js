(function (root) {
  'use strict';
  async function sendContact(endpoint, message, fetcher = fetch) {
    if (typeof endpoint !== 'string' || !/^https:\/\/[a-z0-9]+\.execute-api\.us-east-2\.amazonaws\.com\/contact$/.test(endpoint)) return {ok:false, reason:'unavailable'};
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetcher(endpoint, {method:'POST', mode:'cors', credentials:'omit', headers:{'Content-Type':'application/json'}, body:JSON.stringify(message), signal:controller.signal});
      if (response.status === 429) return {ok:false, reason:'busy'};
      if (response.status === 400) return {ok:false, reason:'invalid'};
      if (!response.ok) return {ok:false, reason:'failed'};
      const result = await response.json();
      return result.ok === true ? {ok:true} : {ok:false, reason:'failed'};
    } catch { return {ok:false, reason:'failed'}; }
    finally { clearTimeout(timer); }
  }
  if (typeof module !== 'undefined' && module.exports) module.exports={sendContact};
  else root.macContactClient=Object.freeze({sendContact});
})(typeof window !== 'undefined' ? window : globalThis);
