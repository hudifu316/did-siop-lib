import { JWK } from 'jose';
import { eddsa as EdDSA, ec as EC } from 'elliptic';
import * as base58 from 'bs58';
import base64url from 'base64url';
const NodeRSA = require('node-rsa');

export const ERRORS = Object.freeze({
    INVALID_KEY_FORMAT: 'Invalid key format error',
});

export namespace KeyObjects{
    interface BasicKeyObject{
        kty: string;
        use: string;
        kid: string;
        alg: string;
    }

    export interface RSAPrivateKeyObject extends BasicKeyObject{
        p: string;
        q: string;
        d: string;
        e: string;
        qi: string;
        dp: string;
        dq: string;
        n: string;
    }

    export interface RSAPublicKeyObject extends BasicKeyObject{
        e: string;
        n: string;
    }

    export interface ECPrivateKeyObject extends BasicKeyObject{
        crv: string;
        d: string;
        x: string;
        y: string;
    }

    export interface ECPublicKeyObject extends BasicKeyObject {
        crv: string;
        x: string;
        y: string;
    }

    export interface OKPPrivateKeyObject extends BasicKeyObject {
        crv: string;
        d: string;
        x: string;
    }

    export interface OKPPublicKeyObject extends BasicKeyObject {
        crv: string;
        x: string;
    }

    export interface SymmetricKeyObject extends BasicKeyObject {
        k: string;
    }
}

enum KTYS{
    'RSA',
    'EC',
    'OKP',
    'oct',
}

enum ALGS{
    'RS256',
    'ES256K',
    'EdDSA',
}

export class RS256Key{
    private kty: string;
    private alg: string;
    private kid: string;
    private use: string; 
    private p?: string;
    private q?: string;
    private d?: string;
    private e: string;
    private qi?: string;
    private dp?: string;
    private dq?: string;
    private n: string;
    private isPrivate: boolean;

    constructor(kid: string, kty: KTYS, alg: ALGS, n: string, e: string, sig: boolean){
        this.kid = kid;
        this.kty = KTYS[kty];
        this.alg = ALGS[alg];
        this.use = sig? 'sig': 'enc';
        this.n = n;
        this.e = e;
        this.isPrivate = false;
    }

    static fromPublicKey(key: string| KeyObjects.RSAPublicKeyObject, kid: string, sig: boolean = true): RS256Key{
        if(typeof key === 'object'){
            return new RS256Key(key.kid, KTYS.RSA, ALGS.RS256, key.n, key.e, sig);
        }
        else{
            let rsaKey = new NodeRSA();
            let format = key.indexOf('-----BEGIN RSA PUBLIC KEY-----') > -1 ? 'pkcs1-public-pem' : 'pkcs8-public-pem';
            rsaKey.importKey(key, format);
            let n = base64url.encode(rsaKey.keyPair.n.toBuffer().slice(1));
            let e = rsaKey.keyPair.e.toString(16);
            e = (e % 2 === 0) ? e : '0' + e;
            e = Buffer.from(e, 'hex').toString('base64');
            return new RS256Key(kid, KTYS.RSA, ALGS.RS256, n, e, sig);
        }
    }

    static fromPrivateKey(key: string| KeyObjects.RSAPrivateKeyObject, kid: string, sig: boolean = true): RS256Key {
        if (typeof key === 'object') {
            let rs256Key =  new RS256Key(key.kid, KTYS.RSA, ALGS.RS256, key.n, key.e, sig);
            rs256Key.isPrivate = true;
            rs256Key.p = key.p;
            rs256Key.q = key.q;
            rs256Key.d = key.d;
            rs256Key.qi = key.qi;
            rs256Key.dp = key.dp;
            rs256Key.dq = key.dq;
            return rs256Key;
        }
        else {
            let rsaKey = new NodeRSA();
            let format = key.indexOf('-----BEGIN RSA PRIVATE KEY-----') > -1 ? 'pkcs1-private-pem' : 'pkcs8-private-pem';
            rsaKey.importKey(key, format);
            let n = base64url.encode(rsaKey.keyPair.n.toBuffer().slice(1));
            let e = rsaKey.keyPair.e.toString(16);
            e = (e % 2 === 0) ? e : '0' + e;
            e = Buffer.from(e, 'hex').toString('base64');

            let rs256Key = new RS256Key(kid, KTYS.RSA, ALGS.RS256, n, e, sig);
            rs256Key.isPrivate = true;
            rs256Key.p = base64url.encode(rsaKey.keyPair.p.toBuffer().slice(1));
            rs256Key.q = base64url.encode(rsaKey.keyPair.q.toBuffer().slice(1));
            rs256Key.d = base64url.encode(rsaKey.keyPair.d.toBuffer());
            rs256Key.qi = base64url.encode(rsaKey.keyPair.coeff.toBuffer());
            rs256Key.dp = base64url.encode(rsaKey.keyPair.dmp1.toBuffer());
            rs256Key.dq = base64url.encode(rsaKey.keyPair.dmq1.toBuffer());
            return rs256Key;
        }
    }

    toJWK(): KeyObjects.RSAPrivateKeyObject | KeyObjects.RSAPublicKeyObject{
        if(this.isPrivate){
            return {
                kty: this.kty,
                use: this.use,
                kid: this.kid,
                alg: this.alg,
                p: this.p,
                q: this.q,
                d: this.d,
                e: this.e,
                qi: this.qi,
                dp: this.dp,
                dq: this.dq,
                n: this.n,
            }
        }
        else{
            return{
                kty: this.kty,
                use: this.use,
                kid: this.kid,
                alg: this.alg,
                e: this.e,
                n: this.n,
            }
        }
    }

    toPEM(format: string = 'pkcs8'): string {
        let rsaKey = new NodeRSA();
        if(this.isPrivate){
            format = format + '-private-pem';
            rsaKey.importKey({
                n: base64url.toBuffer(this.n + ''),
                e: base64url.toBuffer(this.e + ''),
                p : base64url.toBuffer(this.p + ''),
                q : base64url.toBuffer(this.q + ''),
                d : base64url.toBuffer(this.d + ''),
                coeff : base64url.toBuffer(this.qi + ''),
                dmp1 : base64url.toBuffer(this.dp + ''),
                dmq1 : base64url.toBuffer(this.dq + ''),
            }, 'components');
        }
        else{
            format = format + '-public-pem'; rsaKey.importKey({
                n: base64url.toBuffer(this.n + ''),
                e: base64url.toBuffer(this.e + ''),
            }, 'components-public');
        }

        return rsaKey.exportKey(format);
    }
}

export enum KEYFORMATS{
    publicKeyPem,
    publicKeyHex,
    publicKeyBase58,
    publicKeyBase64,
}

export function getOKP(key_str: string, kid: string, keyFormat: KEYFORMATS, isPublic: boolean = true): JWK.OKPKey {
    let key_buffer = Buffer.alloc(1);
    try {
        switch(keyFormat){
            case KEYFORMATS.publicKeyBase58: key_buffer = base58.decode(key_str); break;
            case KEYFORMATS.publicKeyBase64: key_buffer = base64url.toBuffer(base64url.fromBase64(key_str)); break;
            case KEYFORMATS.publicKeyHex: key_buffer = Buffer.from(key_str, 'hex'); break;
            default: throw new Error(ERRORS.INVALID_KEY_FORMAT);
        }
    } catch (err) {
        throw new Error(ERRORS.INVALID_KEY_FORMAT);
    }

    let ed = new EdDSA('ed25519');
    let edKey; 

    try {
        if (isPublic) {
            edKey = ed.keyFromPublic(key_buffer);
            return JWK.asKey({
                "kty": "OKP",
                "crv": "Ed25519",
                "kid": kid,
                "x": base64url.encode(edKey.getPublic()),
                "alg": "EdDSA"
            });
        }
        else{
            edKey = ed.keyFromSecret(key_buffer);
            return JWK.asKey({
                "kty": "OKP",
                "d": base64url.encode(edKey.getSecret()),
                "crv": "Ed25519",
                "kid": kid,
                "x": base64url.encode(edKey.getPublic()),
                "alg": "EdDSA"
            });
        }
    } catch (err) {
        throw new Error(ERRORS.INVALID_KEY_FORMAT);
    }
}

export function getECKey(key_str: string, kid: string, keyFormat: KEYFORMATS, isPublic: boolean = true): JWK.ECKey{
    let key_buffer = Buffer.alloc(1);
    try {
        switch (keyFormat) {
            case KEYFORMATS.publicKeyBase58: key_buffer = base58.decode(key_str); break;
            case KEYFORMATS.publicKeyBase64: key_buffer = base64url.toBuffer(base64url.fromBase64(key_str)); break;
            case KEYFORMATS.publicKeyHex: key_buffer = Buffer.from(key_str, 'hex'); break;
            default: throw new Error(ERRORS.INVALID_KEY_FORMAT);
        }
    } catch (err) {
        throw new Error(ERRORS.INVALID_KEY_FORMAT);
    }

    let ec = new EC('secp256k1');
    let ecKey;

    try {
        if (isPublic) {
            ecKey = ec.keyFromPublic(key_buffer);
            return JWK.asKey({
                "kty": "EC",
                "crv": "secp256k1",
                "kid": kid,
                "x": base64url.encode(ecKey.getPublic().getX().toArrayLike(Buffer)),
                "y": base64url.encode(ecKey.getPublic().getY().toArrayLike(Buffer)),
                "alg": "ES256K"
            });
        }
        else {
            ecKey = ec.keyFromPrivate(key_buffer);
            return JWK.asKey({
                "kty": "EC",
                "d": base64url.encode(ecKey.getPrivate().toArrayLike(Buffer)),
                "crv": "secp256k1",
                "kid": kid,
                "x": base64url.encode(ecKey.getPublic().getX().toArrayLike(Buffer)),
                "y": base64url.encode(ecKey.getPublic().getY().toArrayLike(Buffer)),
                "alg": "ES256K"
            });
        }
    } catch (err) {
        throw new Error(ERRORS.INVALID_KEY_FORMAT);
    }
}