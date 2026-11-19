import {isRecord} from './http.ts';
export type Language = 'es' | 'en';
export type Topic = 'build' | 'architecture' | 'delivery';
export interface ContactMessage {name:string; email:string; message:string; company?:string; topic?:Topic; language:Language;}
export type ContactErrors = Partial<Record<keyof ContactMessage | 'form', 'required' | 'too_long' | 'invalid'>>;
export type ContactValidation = {ok:true; value:ContactMessage} | {ok:false; errors:ContactErrors};

  export function validateContact(input: unknown): ContactValidation {
    if (!isRecord(input)) return {ok:false, errors:{form:'invalid'}};
    const errors: ContactErrors = {}, value: Partial<ContactMessage> = {};
    for (const [field,max] of [['name',160],['email',254],['message',3000],['company',160]] as const) {
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
    for (const field of ['name','company'] as const) if (value[field] && /[\r\n]/.test(value[field])) errors[field]='invalid';
    if (input.language !== 'es' && input.language !== 'en') errors.language='invalid';
    else value.language=input.language;
    if (input.topic != null && input.topic !== '') {
      if (input.topic !== 'build' && input.topic !== 'architecture' && input.topic !== 'delivery') errors.topic='invalid';
      else value.topic=input.topic;
    }
    return Object.keys(errors).length ? {ok:false,errors} : {ok:true,value:value as ContactMessage};
  }
