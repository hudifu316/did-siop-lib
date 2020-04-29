import { eddsa as EdDSA, ec as EC} from 'elliptic';
import * as base58 from 'bs58';
import base64url from 'base64url';
const NodeRSA = require('node-rsa');
const rs256 = require('jwa')('RS256');
import { createHash } from 'crypto';
import { leftpad } from './Utils';

export const ERRORS = Object.freeze({
    INVALID_KEY_FORMAT: 'Invalid key format error',
    NO_PRIVATE_KEY: 'Not a private key',
    INVALID_SIGNATURE: 'Invalid signature',
});

export namespace KeyObjects{
    export interface BasicKeyObject{
        kty: string;
        use: 'enc'|'sig';
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

export namespace KeyInputs{
    export enum FORMATS {
        PEM,
        HEX,
        BASE58,
        BASE64,
    }

    interface KeyInfo {
        key: string;
        kid: string;
        use: 'enc' | 'sig';
        format: FORMATS;
    }

    export type RSAPrivateKeyInput = KeyInfo | KeyObjects.RSAPrivateKeyObject;
    export type RSAPublicKeyInput = KeyInfo | KeyObjects.RSAPublicKeyObject;
    export type ECPrivateKeyInput = KeyInfo | KeyObjects.ECPrivateKeyObject;
    export type ECPublicKeyInput = KeyInfo | KeyObjects.ECPublicKeyObject;
    export type OKPPrivateKeyInput = KeyInfo | KeyObjects.OKPPrivateKeyObject;
    export type OKPPublicKeyInput = KeyInfo | KeyObjects.OKPPublicKeyObject;
    export type SymmetricKeyInput = KeyInfo | KeyObjects.SymmetricKeyObject;
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

export class Key{
    protected kty: string;
    protected alg: string;
    protected kid: string;
    protected use: 'enc' | 'sig'; 

    protected constructor(kid: string, kty: KTYS, alg: ALGS, use: 'enc' | 'sig'){
        this.kid = kid;
        this.kty = KTYS[kty];
        this.alg = ALGS[alg];
        this.use = use;
    }
}

export class RSAKey extends Key{
    private p?: string;
    private q?: string;
    private d?: string;
    private e: string;
    private qi?: string;
    private dp?: string;
    private dq?: string;
    private n: string;
    private private: boolean;

    private constructor(kid: string, kty: KTYS, alg: ALGS, n: string, e: string, use: 'enc'|'sig'){
        super(kid, kty, alg, use);
        this.n = n;
        this.e = e;
        this.private = false;
    }

    static fromPublicKey(keyInput: KeyInputs.RSAPublicKeyInput): RSAKey{
        if('kty' in keyInput){
            return new RSAKey(keyInput.kid, KTYS.RSA, ALGS.RS256, keyInput.n, keyInput.e, keyInput.use);
        }
        else{
            let rsaKey = new NodeRSA();
            let format = keyInput.key.indexOf('-----BEGIN RSA PUBLIC KEY-----') > -1 ? 'pkcs1-public-pem' : 'pkcs8-public-pem';
            rsaKey.importKey(keyInput.key, format);
            let n = base64url.encode(rsaKey.keyPair.n.toBuffer().slice(1));
            let e = rsaKey.keyPair.e.toString(16);
            e = (e % 2 === 0) ? e : '0' + e;
            e = Buffer.from(e, 'hex').toString('base64');
            return new RSAKey(keyInput.kid, KTYS.RSA, ALGS.RS256, n, e, keyInput.use);
        }
    }

    static fromPrivateKey(keyInput: KeyInputs.RSAPrivateKeyInput): RSAKey {
        if ('kty' in keyInput) {
            let rs256Key =  new RSAKey(keyInput.kid, KTYS.RSA, ALGS.RS256, keyInput.n, keyInput.e, keyInput.use);
            rs256Key.private = true;
            rs256Key.p = keyInput.p;
            rs256Key.q = keyInput.q;
            rs256Key.d = keyInput.d;
            rs256Key.qi = keyInput.qi;
            rs256Key.dp = keyInput.dp;
            rs256Key.dq = keyInput.dq;
            return rs256Key;
        }
        else {
            let rsaKey = new NodeRSA();
            let format = keyInput.key.indexOf('-----BEGIN RSA PRIVATE KEY-----') > -1 ? 'pkcs1-private-pem' : 'pkcs8-private-pem';
            rsaKey.importKey(keyInput.key, format);
            let n = base64url.encode(rsaKey.keyPair.n.toBuffer().slice(1));
            let e = rsaKey.keyPair.e.toString(16);
            e = (e % 2 === 0) ? e : '0' + e;
            e = Buffer.from(e, 'hex').toString('base64');

            let rs256Key = new RSAKey(keyInput.kid, KTYS.RSA, ALGS.RS256, n, e, keyInput.use);
            rs256Key.private = true;
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
        if(this.private){
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

    toPEM(format: 'pkcs8'|'pkcs1' = 'pkcs8'): string {
        let rsaKey = new NodeRSA();
        let exportFormat;
        if(this.private){
            exportFormat = format + '-private-pem';
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
            exportFormat = format + '-public-pem'; rsaKey.importKey({
                n: base64url.toBuffer(this.n + ''),
                e: base64url.toBuffer(this.e + ''),
            }, 'components-public');
        }

        return rsaKey.exportKey(exportFormat);
    }

    isPrivate(): boolean{
        return this.private;
    }

    sign(msg: string): string{
        if(this.private){
            let signature = rs256.sign(msg, this.toPEM());
            return signature;
        }
        else{
            throw new Error(ERRORS.NO_PRIVATE_KEY);
        }
    }

    verify(msg: string, signature: string): boolean{
        try {
            return rs256.verify(msg, signature, this.toPEM());
        } catch (err) {
            throw new Error(ERRORS.INVALID_SIGNATURE);
        }
    }
}

export class ECKey extends Key{
    private crv: string;
    private x: string;
    private y: string;
    private d?: string;
    private private: boolean;

    private constructor(kid: string, kty: KTYS, alg: ALGS, crv: string, x: string, y: string, use: 'enc' | 'sig'){
        super(kid, kty, alg, use);
        this.crv = crv;
        this.x = x;
        this.y = y;
        this.private = false;
    }

    static fromPublicKey(keyInput: KeyInputs.ECPublicKeyInput): ECKey{
        if('kty' in keyInput){
            return new ECKey(keyInput.kid, KTYS.EC, ALGS.ES256K, keyInput.crv, keyInput.x, keyInput.y, keyInput.use);
        }
        else{
            let key_buffer = Buffer.alloc(1);
            try {
                switch (keyInput.format) {
                    case KeyInputs.FORMATS.BASE58: key_buffer = base58.decode(keyInput.key); break;
                    case KeyInputs.FORMATS.BASE64: key_buffer = base64url.toBuffer(base64url.fromBase64(keyInput.key)); break;
                    case KeyInputs.FORMATS.HEX: key_buffer = Buffer.from(keyInput.key, 'hex'); break;
                    default: throw new Error(ERRORS.INVALID_KEY_FORMAT);
                }
            } catch (err) {
                throw new Error(ERRORS.INVALID_KEY_FORMAT);
            }

            let ec = new EC('secp256k1');
            let ellipticKey;
            ellipticKey = ec.keyFromPublic(key_buffer);
            let x = base64url.encode(ellipticKey.getPublic().getX().toArrayLike(Buffer));
            let y = base64url.encode(ellipticKey.getPublic().getY().toArrayLike(Buffer));
            return new ECKey(keyInput.kid, KTYS.EC, ALGS.ES256K, 'secp256k1', x, y, keyInput.use);
        }
    }

    static fromPrivateKey(keyInput: KeyInputs.ECPrivateKeyInput): ECKey{
        if ('kty' in keyInput) {
            let ecKey = new ECKey(keyInput.kid, KTYS.EC, ALGS.ES256K, keyInput.crv, keyInput.x, keyInput.y, keyInput.use);
            ecKey.private = true;
            ecKey.d = keyInput.d;
            return ecKey;
        }
        else {
            let key_buffer = Buffer.alloc(1);
            try {
                switch (keyInput.format) {
                    case KeyInputs.FORMATS.BASE58: key_buffer = base58.decode(keyInput.key); break;
                    case KeyInputs.FORMATS.BASE64: key_buffer = base64url.toBuffer(base64url.fromBase64(keyInput.key)); break;
                    case KeyInputs.FORMATS.HEX: key_buffer = Buffer.from(keyInput.key, 'hex'); break;
                    default: throw new Error(ERRORS.INVALID_KEY_FORMAT);
                }
            } catch (err) {
                throw new Error(ERRORS.INVALID_KEY_FORMAT);
            }

            let ec = new EC('secp256k1');
            let ellipticKey;
            ellipticKey = ec.keyFromPrivate(key_buffer);
            let x = base64url.encode(ellipticKey.getPublic().getX().toArrayLike(Buffer));
            let y = base64url.encode(ellipticKey.getPublic().getY().toArrayLike(Buffer));
            let ecKey = new ECKey(keyInput.kid, KTYS.EC, ALGS.ES256K, 'secp256k1', x, y, keyInput.use);
            ecKey.d = base64url.encode(ellipticKey.getPrivate().toArrayLike(Buffer));
            ecKey.private = true;
            return ecKey;
        }
    }

    toJWK(): KeyObjects.ECPrivateKeyObject | KeyObjects.ECPublicKeyObject{
        if (this.private) {
            return {
                kty: this.kty,
                use: this.use,
                kid: this.kid,
                alg: this.alg,
                crv: this.crv,
                x: this.x,
                y: this.y,
                d: this.d,
            }
        }
        else {
            return {
                kty: this.kty,
                use: this.use,
                kid: this.kid,
                alg: this.alg,
                crv: this.crv,
                x: this.x,
                y: this.y,
            }
        }
    }

    toHex(): string {
        let ec = new EC('secp256k1');
        if(this.private){
            return ec.keyFromPrivate(base64url.toBuffer(this.d + '')).getPrivate().toString(16);
        }
        else{
            let pub = {
                x: base64url.decode(this.x, 'hex'),
                y: base64url.decode(this.y, 'hex')
            }
            return ec.keyFromPublic(pub).getPublic().encode('hex', false);
        }
    }

    isPrivate(): boolean{
        return this.private;
    }

    sign(msg: string): Buffer{
        if(this,this.private){
            let ec = new EC('secp256k1');
            let sha256 = createHash('sha256');

            let hash = sha256.update(msg).digest('hex');

            let key = ec.keyFromPrivate(this.toHex());

            let ec256k_signature = key.sign(hash);

            let signature = Buffer.alloc(64);
            Buffer.from(leftpad(ec256k_signature.r.toString('hex')), 'hex').copy(signature, 0);
            Buffer.from(leftpad(ec256k_signature.s.toString('hex')), 'hex').copy(signature, 32);

            return signature;
        }
        else{
            throw new Error(ERRORS.NO_PRIVATE_KEY);
        }
    }

    verify(msg: string, signature: Buffer): boolean{
        try {
            let sha256 = createHash('sha256');
            let ec = new EC('secp256k1');
    
            let hash = sha256.update(msg).digest();
    
            if (signature.length !== 64) throw new Error(ERRORS.INVALID_SIGNATURE);
            let signatureObj = {
                r: signature.slice(0, 32).toString('hex'),
                s: signature.slice(32, 64).toString('hex')
            }
    
            let key = ec.keyFromPublic(this.toHex(), 'hex');
    
            return key.verify(hash, signatureObj);
        } catch (err) {
            throw new Error(ERRORS.INVALID_SIGNATURE);
        }
    }
}

export class OKP extends Key{
    private crv: string;
    private x: string;
    private d?: string;
    private private: boolean;

    private constructor(kid: string, kty: KTYS, alg: ALGS, crv: string, x: string, use: 'enc' | 'sig') {
        super(kid, kty, alg, use);
        this.crv = crv;
        this.x = x;
        this.private = false;
    }

    static fromPublicKey(keyInput: KeyInputs.OKPPublicKeyInput): OKP {
        if ('kty' in keyInput) {
            return new OKP(keyInput.kid, KTYS.OKP, ALGS.EdDSA, keyInput.crv, keyInput.x, keyInput.use);
        }
        else {
            let key_buffer = Buffer.alloc(1);
            try {
                switch (keyInput.format) {
                    case KeyInputs.FORMATS.BASE58: key_buffer = base58.decode(keyInput.key); break;
                    case KeyInputs.FORMATS.BASE64: key_buffer = base64url.toBuffer(base64url.fromBase64(keyInput.key)); break;
                    case KeyInputs.FORMATS.HEX: key_buffer = Buffer.from(keyInput.key, 'hex'); break;
                    default: throw new Error(ERRORS.INVALID_KEY_FORMAT);
                }
            } catch (err) {
                throw new Error(ERRORS.INVALID_KEY_FORMAT);
            }

            let ed = new EdDSA('ed25519');
            let ellipticKey;
            ellipticKey = ed.keyFromPublic(key_buffer);
            let x = base64url.encode(ellipticKey.getPublic());
            return new OKP(keyInput.kid, KTYS.OKP, ALGS.EdDSA, 'Ed25519', x, keyInput.use);
        }
    }

    static fromPrivateKey(keyInput: KeyInputs.OKPPrivateKeyInput): OKP {
        if ('kty' in keyInput) {
            let ecKey = new OKP(keyInput.kid, KTYS.OKP, ALGS.EdDSA, keyInput.crv, keyInput.x, keyInput.use);
            ecKey.private = true;
            ecKey.d = keyInput.d;
            return ecKey;
        }
        else {
            let key_buffer = Buffer.alloc(1);
            try {
                switch (keyInput.format) {
                    case KeyInputs.FORMATS.BASE58: key_buffer = base58.decode(keyInput.key); break;
                    case KeyInputs.FORMATS.BASE64: key_buffer = base64url.toBuffer(base64url.fromBase64(keyInput.key)); break;
                    case KeyInputs.FORMATS.HEX: key_buffer = Buffer.from(keyInput.key, 'hex'); break;
                    default: throw new Error(ERRORS.INVALID_KEY_FORMAT);
                }
            } catch (err) {
                throw new Error(ERRORS.INVALID_KEY_FORMAT);
            }

            let ed = new EdDSA('ed25519');
            let ellipticKey;
            ellipticKey = ed.keyFromSecret(key_buffer);
            let x = base64url.encode(ellipticKey.getPublic());
            let ecKey = new OKP(keyInput.kid, KTYS.OKP, ALGS.EdDSA, 'Ed25519', x, keyInput.use);
            ecKey.d = base64url.encode(ellipticKey.getSecret());
            ecKey.private = true;
            return ecKey;
        }
    }

    toJWK(): KeyObjects.OKPPrivateKeyObject | KeyObjects.OKPPublicKeyObject {
        if (this.private) {
            return {
                kty: this.kty,
                use: this.use,
                kid: this.kid,
                alg: this.alg,
                crv: this.crv,
                x: this.x,
                d: this.d,
            }
        }
        else {
            return {
                kty: this.kty,
                use: this.use,
                kid: this.kid,
                alg: this.alg,
                crv: this.crv,
                x: this.x,
            }
        }
    }

    toHex(): string {
        let ed = new EdDSA('ed25519');
        if (this.private) {
            return ed.keyFromSecret(base64url.toBuffer(this.d + '')).getSecret().toString('hex');
        }
        else {
            return ed.keyFromPublic(base64url.toBuffer(this.x)).getPublic().toString('hex');
        }
    }

    toBase58(): string {
        let ed = new EdDSA('ed25519');
        if (this.private) {
            return base58.encode(ed.keyFromSecret(base64url.toBuffer(this.d + '')).getSecret());
        }
        else {
            return base58.encode(ed.keyFromPublic(base64url.toBuffer(this.x)).getPublic());
        }
    }

    isPrivate(): boolean {
        return this.private;
    }

    sign(msg: string): Buffer{
        if(this.private){
            let ec = new EdDSA('ed25519');

            let key = ec.keyFromSecret(this.toHex());

            let edDsa_signature = key.sign(Buffer.from(msg));

            return edDsa_signature.toBytes();
        }
        else{
            throw new Error(ERRORS.NO_PRIVATE_KEY);
        }
    }

    verify(msg: string, signature: Buffer): boolean{
        try {
            let ec = new EdDSA('ed25519');
    
            let key = ec.keyFromPublic(this.toHex());
    
            return key.verify(Buffer.from(msg), signature);
        } catch (err) {
            throw new Error(ERRORS.INVALID_SIGNATURE);
        }
    }
}