import methods from '../json/methods.json' with { type: 'json' };
import https from 'node:https';

/** Represents an API client for interacting with Discord API endpoints. */
export default class API {
    /**
     * Creates an instance of API.
     *
     * @param {string} token - The authentication token for the API requests.
     * @param {Object} [options={}] - Optional parameters.
     * @param {number} [options.version=10] - API version to use.
     * @param {boolean} [rateLimitRetry=true] - If the bot runs into a rate limit, it will automatically send a request again after the limitation has ended.
     * @param {string} [options.api='https://discord.com/api'] - Discord API base URL.
     */

    constructor(token, options = {}) {
        /** The authentication token for the API requests. */
        this.token = token;

        /** API version to use. */
        this.version = 10;

        /** If the bot runs into a rate limit, it will automatically send a request again after the limitation has ended. */
        this.rateLimitRetry = true;

        /** Discord API base URL. */
        this.api = 'https://discord.com/api';

        // Assigning optional parameters.
        Object.assign(this, options);

        // Dynamically create methods based on imported API methods
        Object.entries(methods).forEach(([name, { method, endpoint }]) => {
            // Convert method name to camelCase
            name = name.charAt(0).toLocaleLowerCase() + name.slice(1);

            // Replace dashes and spaces
            name = name.replace(/-/g, ' ').replace(/ /g, '');

            /**
             * Executes a Discord API request.
             *
             * @param {Object} parameters - Request parameters.
             * @param {Object} headers - Request headers.
             *
             * @returns {Promise<Object>} A promise resolving to the JSON response from the API.
             */

            this[name] = (parameters, headers) => {
                // The data received from the promise.
                const promise = new Promise((resolve, reject) => {
                    // The address of the target URL.
                    const address = `${this.api}/v${this.version}/${endpoint.replace(/{([^}]+)}/g, (_, i) => parameters[i])}`;

                    // Constructing the full URL for the API endpoint.
                    const url = new URL(address);

                    // If the request method is GET, encode parameters into the query string.
                    if (method === 'GET') url.search = new URLSearchParams(parameters).toString();

                    // Construct request options
                    const options = {
                        // The specified request method.
                        method,
                        // The request's headers.
                        headers: {
                            // This header is used for the bot's authentication process.
                            'Authorization': `Bot ${this.token}`,
                            // The request's content-type.
                            'Content-Type': 'application/json',
                            // Optional request headers.
                            ...headers
                        }
                    };

                    // Making the HTTP request.
                    const req = https.request(url, options, (res) => {
                        // The template where the new incoming data will be written.
                        let data = '';

                        // Collect the response data.
                        res.on('data', (chunk) => (data += chunk));

                        // Handle the end of the response.
                        res.on('end', () => {
                            try {
                                // Try to parse the JSON data and resolve it.
                                resolve(JSON.parse(data));
                            } catch {
                                // If the parsing process failed, return the data if it exists; if not, return an empty object.
                                resolve(data || {});
                            }
                        });
                    });

                    // Handle request errors.
                    req.on('error', (error) => reject(error));

                    // Include request body if method is not GET.
                    if (method !== 'GET') req.write(JSON.stringify(parameters));

                    // End the request.
                    req.end();
                });

                // If the promise faced rate limitations, check if it should retry, and if it should, retry sending the request.
                promise.then(({ retry_after }) => retry_after && this.rateLimitRetry && setTimeout(() => this[name](parameters, headers), retry_after * 1000));

                // Return the data received from the promise.
                return promise;
            };
        });
    }
}
