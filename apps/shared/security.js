import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto';
export function sameSecret(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const x=Buffer.from(a), y=Buffer.from(b);
  return x.length===y.length && timingSafeEqual(x,y);
}
export const randomToken=()=>randomBytes(32).toString('base64url');
export function signSession(id, secret) {return `${id}.${createHmac('sha256',secret).update(id).digest('base64url')}`;}
export function readSession(cookie, secret) {
  const token=(cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('agy_session='))?.slice(12);
  if (!token) return null;
  const [id,sig,...rest]=token.split('.');
  if (!id || rest.length || !sameSecret(signSession(id,secret).split('.')[1],sig)) return null;
  return id;
}
export function validOrigin(origin, expected) {return typeof origin==='string' && origin===expected;}
export function requireSecret(name) {const value=process.env[name]; if(!value || value.length<32) throw new Error(`${name} must contain at least 32 characters`); return value;}
