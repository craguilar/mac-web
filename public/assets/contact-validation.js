/* Shared browser/server contract. Values not listed here are never forwarded. */
(function (root) {
  'use strict';
  function validateContact(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return {ok:false, errors:{form:'invalid'}};
    const errors = {}, value = {};
    for (const [field,max] of Object.entries({name:160,email:254,message:3000,company:160})) {
      const optional = field === 'company';
      const raw = optional && input[field] == null ? '' : input[field];
      if (typeof raw !== 'string') { errors[field]='required'; continue; }
      const text = raw.trim();
      if (!text && !optional) errors[field]='required';
      else if (!text) continue;
      else if (text.length>max) errors[field]='too_long';
      else if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(text)) errors[field]='invalid';
      else value[field]=text;
    }
    if (value.email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email) || /[\r\n]/.test(value.email))) errors.email='invalid';
    for (const field of ['name','company']) if (value[field] && /[\r\n]/.test(value[field])) errors[field]='invalid';
    if (!['es','en'].includes(input.language)) errors.language='invalid';
    else value.language=input.language;
    if (input.topic != null && input.topic !== '') {
      if (!['build','architecture','delivery'].includes(input.topic)) errors.topic='invalid';
      else value.topic=input.topic;
    }
    return Object.keys(errors).length ? {ok:false,errors} : {ok:true,value};
  }
  if (typeof module !== 'undefined' && module.exports) module.exports={validateContact};
  else root.macContactValidation=Object.freeze({validateContact});
})(typeof window !== 'undefined' ? window : globalThis);
