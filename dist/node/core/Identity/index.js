"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Identity = void 0;
var commons_1 = require("./commons");
var key_extractors_1 = require("./key-extractors");
var resolvers_1 = require("./resolvers");
/**
 * @classdesc A class to represent a Decentralized Identity.
 * @property {DidDocument} doc - Decentralized Identity Document. Initialized with empty values in the constructor. Assigned later using resolve(did) method.
 * @property {DidVerificationKey[]} KeySet - A list of verification keys listed in the did-doc. Initialied empty in the constructor. Filled later using extractAuthenticationKeys method.
 */
var Identity = /** @class */ (function () {
    /**
     * @constructor
     */
    function Identity() {
        this.doc = {
            '@context': '',
            id: '',
            authentication: [],
        };
        this.keySet = [];
    }
    /**
     *
     * @param {string} did - A Decentralized Identity to resolve
     * @returns A promise which resolves to the id field of the related Decentralized Idenity Document (did-doc)
     * @remarks The combinedResolver is used to resolve did-doc.
     */
    Identity.prototype.resolve = function (did) {
        return __awaiter(this, void 0, void 0, function () {
            var result, err_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, resolvers_1.combinedDidResolver.resolve(did)];
                    case 1:
                        result = _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        err_1 = _a.sent();
                        throw new Error(commons_1.ERRORS.DOCUMENT_RESOLUTION_ERROR);
                    case 3:
                        // accept: application/ld+json;profile="https://w3id.org/did-resolution
                        result = result.didDocument;
                        if (result &&
                            //result.data.didDocument['@context'] === 'https://w3id.org/did/v1' &&
                            result.id == did &&
                            result.authentication &&
                            result.authentication.length > 0) {
                            this.doc = result;
                            this.keySet = [];
                            return [2 /*return*/, this.doc.id];
                        }
                        throw new Error(commons_1.ERRORS.INVALID_DID_ERROR);
                }
            });
        });
    };
    /**
     * @returns true/false to indicate whether the Identity has a resolved did-doc or not
     */
    Identity.prototype.isResolved = function () {
        return this.doc.id !== '';
    };
    /**
     *
     * @param {DidVerificationKeyExtractor} [extractor] - The extractor to use when extracting keys. If not provided, uniExtractor is used.
     * @returns An array of DidVerificationKey objects
     * @remarks resolve(did) method must be called before calling this method. This method returns the value of keySet property. If keySet is
     * empty then this method will extract cryptographic keys and related information from the 'authentication' field of did-doc and populate keySet property.
     * https://www.w3.org/TR/did-core/#authentication
     * 'authentication' field is an array and contains Verification Methods in following forms
     *  - A full method which has 'id' and 'type' fields
     *  - A string
     *  - An object with 'type' field and references to 'publicKey' field of did-doc as an array.
     */
    Identity.prototype.extractAuthenticationKeys = function (extractor) {
        if (!extractor)
            extractor = key_extractors_1.uniExtractor;
        if (!this.isResolved())
            throw new Error(commons_1.ERRORS.UNRESOLVED_DOCUMENT);
        if (this.keySet.length === 0) {
            var didMethod = void 0;
            var regex = new RegExp('^did:ion');
            if (regex.test(this.doc.id)) {
                didMethod = this.doc.verificationMethod;
            }
            else {
                didMethod = this.doc.authentication;
            }
            for (var _i = 0, didMethod_1 = didMethod; _i < didMethod_1.length; _i++) {
                var method = didMethod_1[_i];
                console.log('Successful get authentication: ' + JSON.stringify(method));
                if (method.id && method.type) {
                    try {
                        this.keySet.push(extractor.extract(method));
                    }
                    catch (err) {
                        console.log('method extractor error!');
                        continue;
                    }
                }
                if (method.publicKey) {
                    if (typeof method.publicKey === 'string') {
                        for (var _a = 0, _b = this.doc.publicKey; _a < _b.length; _a++) {
                            var pub = _b[_a];
                            if (pub.id === method.publicKey || pub.id === this.doc.id + method.publicKey) {
                                try {
                                    this.keySet.push(extractor.extract(pub));
                                }
                                catch (err) {
                                    console.log('string pub key extractor error!');
                                    continue;
                                }
                            }
                        }
                    }
                    else {
                        for (var _c = 0, _d = method.publicKey; _c < _d.length; _c++) {
                            var key = _d[_c];
                            for (var _e = 0, _f = this.doc.publicKey; _e < _f.length; _e++) {
                                var pub = _f[_e];
                                if (pub.id === key || pub.id === this.doc.id + key) {
                                    try {
                                        this.keySet.push(extractor.extract(pub));
                                    }
                                    catch (err) {
                                        console.log('binary pub key extractor error!');
                                        continue;
                                    }
                                }
                            }
                        }
                    }
                }
                if (typeof method === 'string') {
                    for (var _g = 0, _h = this.doc.publicKey; _g < _h.length; _g++) {
                        var pub = _h[_g];
                        if (pub.id === method) {
                            try {
                                this.keySet.push(extractor.extract(pub));
                            }
                            catch (err) {
                                continue;
                            }
                        }
                    }
                    //Implement other verification methods here
                }
            }
        }
        return this.keySet;
    };
    /**
     * @returns {DidDocument} The doc property.
     */
    Identity.prototype.getDocument = function () {
        return this.doc;
    };
    /**
     *
     * @param {DidDocument} doc
     * @param {string} did - DID related to the doc param
     * @remarks Can be used to set the doc property manually without resolving.
     */
    Identity.prototype.setDocument = function (doc, did) {
        console.log("setDocument:" + did);
        if (
        //doc['@context'] === 'https://w3id.org/did/v1' &&
        doc.id == did &&
            doc.authentication &&
            doc.authentication.length > 0) {
            this.doc = doc;
        }
        else {
            throw new Error(commons_1.ERRORS.INVALID_DOCUMENT);
        }
    };
    return Identity;
}());
exports.Identity = Identity;
var commons_2 = require("./commons");
Object.defineProperty(exports, "ERRORS", { enumerable: true, get: function () { return commons_2.ERRORS; } });
var key_extractors_2 = require("./key-extractors");
Object.defineProperty(exports, "DidVerificationKeyExtractor", { enumerable: true, get: function () { return key_extractors_2.DidVerificationKeyExtractor; } });
Object.defineProperty(exports, "uniExtractor", { enumerable: true, get: function () { return key_extractors_2.uniExtractor; } });
//# sourceMappingURL=index.js.map