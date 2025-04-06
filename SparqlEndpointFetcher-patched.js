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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SparqlEndpointFetcher = void 0;
const isStream = require("is-stream");
const n3_1 = require("n3");
const readable_from_web_1 = require("readable-from-web");
const sparqljs_1 = require("sparqljs");
const sparqljson_parse_1 = require("sparqljson-parse");
const sparqlxml_parse_1 = require("sparqlxml-parse");
const stringifyStream = require("stream-to-string");
/**
 * A SparqlEndpointFetcher can send queries to SPARQL endpoints,
 * and retrieve and parse the results.
 */
class SparqlEndpointFetcher {
    constructor(args) {
        console.log('!!!! my SparqlEndpointFetcher !!!!');
        var _a, _b, _c;
        this.method = (_a = args === null || args === void 0 ? void 0 : args.method) !== null && _a !== void 0 ? _a : 'POST';
        this.timeout = args === null || args === void 0 ? void 0 : args.timeout;
        this.additionalUrlParams = (_b = args === null || args === void 0 ? void 0 : args.additionalUrlParams) !== null && _b !== void 0 ? _b : new URLSearchParams();
        this.defaultHeaders = (_c = args === null || args === void 0 ? void 0 : args.defaultHeaders) !== null && _c !== void 0 ? _c : new Headers();
        this.fetchCb = args === null || args === void 0 ? void 0 : args.fetch;
        this.accessToken = args?.accessToken ?? process.env.ACCESS_TOKEN; // Mine
        this.sparqlJsonParser = new sparqljson_parse_1.SparqlJsonParser(args);
        this.sparqlXmlParser = new sparqlxml_parse_1.SparqlXmlParser(args);
        this.sparqlParsers = {
            [SparqlEndpointFetcher.CONTENTTYPE_SPARQL_JSON]: {
                parseBooleanStream: sparqlResponseStream => this.sparqlJsonParser.parseJsonBooleanStream(sparqlResponseStream),
                parseResultsStream: sparqlResponseStream => this.sparqlJsonParser.parseJsonResultsStream(sparqlResponseStream),
            },
            [SparqlEndpointFetcher.CONTENTTYPE_SPARQL_XML]: {
                parseBooleanStream: sparqlResponseStream => this.sparqlXmlParser.parseXmlBooleanStream(sparqlResponseStream),
                parseResultsStream: sparqlResponseStream => this.sparqlXmlParser.parseXmlResultsStream(sparqlResponseStream),
            },
        };
    }
    /**
     * Get the query type of the given query.
     *
     * This will parse the query and thrown an exception on syntax errors.
     *
     * @param {string} query A query.
     * @return {'SELECT' | 'ASK' | 'CONSTRUCT' | 'UNKNOWN'} The query type.
     */
    getQueryType(query) {
        const parsedQuery = new sparqljs_1.Parser({ sparqlStar: true }).parse(query);
        if (parsedQuery.type === 'query') {
            return parsedQuery.queryType === 'DESCRIBE' ? 'CONSTRUCT' : parsedQuery.queryType;
        }
        return 'UNKNOWN';
    }
    /**
     * Get the query type of the given update query.
     *
     * This will parse the update query and thrown an exception on syntax errors.
     *
     * @param {string} query An update query.
     * @return {'UNKNOWN' | UpdateTypes} The included update operations.
     */
    getUpdateTypes(query) {
        const parsedQuery = new sparqljs_1.Parser({ sparqlStar: true }).parse(query);
        if (parsedQuery.type === 'update') {
            const operations = {};
            for (const update of parsedQuery.updates) {
                if ('type' in update) {
                    operations[update.type] = true;
                }
                else {
                    operations[update.updateType] = true;
                }
            }
            return operations;
        }
        return 'UNKNOWN';
    }
    /**
     * Send a SELECT query to the given endpoint URL and return the resulting bindings stream.
     * @see IBindings
     * @param {string} endpoint A SPARQL endpoint URL. (without the `?query=` suffix).
     * @param {string} query    A SPARQL query string.
     * @return {Promise<NodeJS.ReadableStream>} A stream of {@link IBindings}.
     */
    fetchBindings(endpoint, query) {
        console.log('!!!! FetchBindings SparqlEndpointFetcher !!!!');
        return __awaiter(this, void 0, void 0, function* () {
            const [contentType, responseStream] = yield this.fetchRawStream(endpoint, query, SparqlEndpointFetcher.CONTENTTYPE_SPARQL);
            const parser = this.sparqlParsers[contentType];
            if (!parser) {
                throw new Error(`Unknown SPARQL results content type: ${contentType}`);
            }
            return parser.parseResultsStream(responseStream);
        });
    }
    /**
     * Send an ASK query to the given endpoint URL and return a promise resolving to the boolean answer.
     * @param {string} endpoint A SPARQL endpoint URL. (without the `?query=` suffix).
     * @param {string} query    A SPARQL query string.
     * @return {Promise<boolean>} A boolean resolving to the answer.
     */
    fetchAsk(endpoint, query) {
        return __awaiter(this, void 0, void 0, function* () {
            const [contentType, responseStream] = yield this.fetchRawStream(endpoint, query, SparqlEndpointFetcher.CONTENTTYPE_SPARQL);
            const parser = this.sparqlParsers[contentType];
            if (!parser) {
                throw new Error(`Unknown SPARQL results content type: ${contentType}`);
            }
            return parser.parseBooleanStream(responseStream);
        });
    }
    /**
     * Send a CONSTRUCT/DESCRIBE query to the given endpoint URL and return the resulting triple stream.
     * @param {string} endpoint A SPARQL endpoint URL. (without the `?query=` suffix).
     * @param {string} query    A SPARQL query string.
     * @return {Promise<Stream>} A stream of triples.
     */
    fetchTriples(endpoint, query) {
        console.log('!!!! FetchTriples  SparqlEndpointFetcher !!!!');
        return __awaiter(this, void 0, void 0, function* () {
            const [contentType, responseStream] = yield this.fetchRawStream(endpoint, query, SparqlEndpointFetcher.CONTENTTYPE_TURTLE);
            return responseStream.pipe(new n3_1.StreamParser({ format: contentType }));
        });
    }
    /**
     * Send an update query to the given endpoint URL using POST.
     *
     * @param {string} endpoint     A SPARQL endpoint URL. (without the `?query=` suffix).
     * @param {string} query        A SPARQL query string.
     */
    fetchUpdate(endpoint, query) {
        return __awaiter(this, void 0, void 0, function* () {
            const abortController = new AbortController();
            const defaultHeadersRaw = {};
            // Headers object does not have other means to iterate it according to the typings
            // eslint-disable-next-line unicorn/no-array-for-each
            this.defaultHeaders.forEach((value, key) => {
                defaultHeadersRaw[key] = value;
            });
            const init = {
                method: 'POST',
                headers: Object.assign(Object.assign({}, defaultHeadersRaw), { 'content-type': 'application/sparql-update' }),
                body: query,
                signal: abortController.signal,
            };
            yield this.handleFetchCall(endpoint, init, { ignoreBody: true });
            abortController.abort();
        });
    }
    /**
     * Send a query to the given endpoint URL and return the resulting stream.
     *
     * This will only accept responses with the application/sparql-results+json content type.
     *
     * @param {string} endpoint     A SPARQL endpoint URL. (without the `?query=` suffix).
     * @param {string} query        A SPARQL query string.
     * @param {string} acceptHeader The HTTP accept to use.
     * @return {Promise<[string, NodeJS.ReadableStream]>} The content type and SPARQL endpoint response stream.
     */
    fetchRawStream(endpoint, query, acceptHeader) {
        console.log('!!!! my fetchRawStream SparqlEndpointFetcher !!!!');
        return __awaiter(this, void 0, void 0, function* () {
            let url = this.method === 'POST' ? endpoint : `${endpoint}?query=${encodeURIComponent(query)}`;
            // Initiate request
            let body;
            const headers = new Headers(this.defaultHeaders);
            headers.append('Accept', acceptHeader);
            // patch
            if (this.accessToken) {
                headers.set('Authorization', `Bearer ${this.accessToken}`);
            }
            console.log("ajout de l'access token dans le header:"+this.accessToken);
            // fin patch
            if (this.method === 'POST') {
                headers.append('Content-Type', 'application/x-www-form-urlencoded');
                body = new URLSearchParams();
                body.set('query', query);
                for (const [key, value] of this.additionalUrlParams.entries()) {
                    body.set(key, value);
                }
                headers.append('Content-Length', body.toString().length.toString());
            }
            else if (this.additionalUrlParams.toString().length > 0) {
                url += `&${this.additionalUrlParams.toString()}`;
            }
            return this.handleFetchCall(url, { headers, method: this.method, body });
        });
    }
    /**
     * Helper function to generalize internal fetch calls.
     *
     * @param {string}      url     The URL to call.
     * @param {RequestInit} init    Options to pass along to the fetch call.
     * @param {any}         options Other specific fetch options.
     * @return {Promise<[string, NodeJS.ReadableStream]>} The content type and SPARQL endpoint response stream.
     */
    handleFetchCall(url, init, options) {
        console.log('!!!! HandleFetchCall SparqlEndpointFetcher !!!!');
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            let timeout;
            let responseStream;
            if (this.timeout) {
                const controller = new AbortController();
                init.signal = controller.signal;
                timeout = setTimeout(() => controller.abort(), this.timeout);
            }
            const httpResponse = yield ((_a = this.fetchCb) !== null && _a !== void 0 ? _a : fetch)(url, init);
            clearTimeout(timeout);
            // Handle response body
            if (!(options === null || options === void 0 ? void 0 : options.ignoreBody) && httpResponse.body) {
                // Wrap WhatWG readable stream into a Node.js readable stream
                // If the body already is a Node.js stream (in the case of node-fetch), don't do explicit conversion.
                responseStream = (isStream(httpResponse.body) ? httpResponse.body : (0, readable_from_web_1.readableFromWeb)(httpResponse.body));
            }
            // Emit an error if the server returned an invalid response
            if (!httpResponse.ok || (!responseStream && !(options === null || options === void 0 ? void 0 : options.ignoreBody))) {
                const simpleUrl = url.split('?').at(0);
                const bodyString = responseStream ? yield stringifyStream(responseStream) : 'empty response';
                throw new Error(`Invalid SPARQL endpoint response from ${simpleUrl} (HTTP status ${httpResponse.status}):\n${bodyString}`);
            }
            // Determine the content type
            const contentType = (_c = (_b = httpResponse.headers.get('Content-Type')) === null || _b === void 0 ? void 0 : _b.split(';').at(0)) !== null && _c !== void 0 ? _c : '';
            return [contentType, responseStream];
        });
    }
}
exports.SparqlEndpointFetcher = SparqlEndpointFetcher;
SparqlEndpointFetcher.CONTENTTYPE_SPARQL_JSON = 'application/sparql-results+json';
SparqlEndpointFetcher.CONTENTTYPE_SPARQL_XML = 'application/sparql-results+xml';
SparqlEndpointFetcher.CONTENTTYPE_TURTLE = 'text/turtle';
SparqlEndpointFetcher.CONTENTTYPE_SPARQL = `${SparqlEndpointFetcher.CONTENTTYPE_SPARQL_JSON};q=1.0,${SparqlEndpointFetcher.CONTENTTYPE_SPARQL_XML};q=0.7`;
//# sourceMappingURL=SparqlEndpointFetcher.js.map