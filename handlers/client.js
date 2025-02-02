import pkg from '../package.json' with { type: 'json' };
import zlib from 'node:zlib';
import WebSocket from 'ws';

/** Represents a Discord client that connects to the Discord API gateway using WebSocket. */
export default class Client {
    /**
     * Creates an instance of Client.
     *
     * @param {string} token - The authentication token for the bot.
     * @param {Object} [options={}] - Optional parameters.
     * @param {number} [options.version=10] - API version to use.
     * @param {boolean} [options.debug=false] - Should debugging features be enabled?
     * @param {boolean} [options.reconnect=true] - Whether to automatically reconnect on disconnect.
     * @param {number} [options.disconnectStatusCode=1000] - WebSocket close code for intentional disconnect.
     * @param {string} [options.api='https://discord.com/api'] - Discord API base URL.
     */

    constructor(token, options = {}) {
        /** The authentication token for the bot. */
        this.token = token;

        /** Initializing events object */
        this.events = {};

        /** API version to use. */
        this.version = 10;

        /** Should debugging features be enabled? */
        this.debug = false;

        /** Whether to automatically reconnect on disconnect. */
        this.reconnect = true;

        /** WebSocket close code for intentional disconnect. */
        this.disconnectStatusCode = 1000;

        /** Discord API base URL. */
        this.api = 'https://discord.com/api';

        /** Creating zlib inflate object with specified options */
        this.zlib = zlib.createInflate({ chunkSize: 65535 });

        // Adding optional parameters.
        Object.assign(this, options);

        // If zlib is defined, listen for 'data' events and call onMessage
        if (this.zlib) this.zlib.on('data', (chunk) => this.onMessage(chunk.toString('utf-8')));
    }

    /**
     * Connects the client to the Discord API gateway.
     *
     * @returns {Promise<Response>} A promise resolving to the API response when connected.
     */

    async connect() {
        // Fetching gateway information from Discord API
        const response = await fetch(`${this.api}/v${this.version}/gateway/bot`, { headers: { Authorization: `Bot ${this.token}` } });

        // The json response.
        const json = await response.json();

        // Assigning fetched data to the instance
        Object.assign(this, json);

        // Checking if the response is OK.
        if (response.ok) {
            // If zlib compression exists, reset it.
            this.zlib?.reset();

            /** Establishing WebSocket connection to the gateway */
            this.socket = new WebSocket(`${this.url}/?v=${this.version}&encoding=json&${this.zlib ? 'compress=zlib-stream' : ''}`);

            // Make sure the client is fully restarted.
            delete this.disconnected;

            // Adding event handlers for the websocket "open" event.
            this.socket.on('open', this.onOpen.bind(this));

            // Adding event handlers for the websocket "close" event.
            this.socket.on('close', this.onClose.bind(this));

            // Adding event handlers for the websocket "error" event.
            this.socket.on('error', this.onError.bind(this));

            // Adding event handlers for the websocket "message" event.
            this.socket.on('message', (data) => (this.hasOwnProperty('zlib') ? this.zlib.write(data) : this.onMessage(data)));
        }

        // Returning the response as the function's response.
        return { response, json };
    }

    /** Disconnects the client from the Discord API gateway. */
    disconnect() {
        // If the socket doesn't exist, do nothing.
        if (!this.socket) return;

        // Creating a new disconnect log.
        if (this.debug) console.log('The client has been disconnected');

        /** This flag indicates whether the client is manually disconnected or not. Used for automatic reconnections. */
        this.disconnected = true;

        // Closing WebSocket connection initiated by the client
        this.socket.close(this.disconnectStatusCode, 'Client initiated disconnect');

        // Deleting the socket property
        delete this.socket;
    }

    /** Handles the 'open' event of the WebSocket connection. */
    onOpen() {
        // Logging connection status if debug mode is enabled.
        if (this.debug) console.log('Connected to the gateway');
    }

    /**
     * Handles the 'close' event of the WebSocket connection.
     *
     * @param {number} code - The WebSocket close code.
     * @param {string} reason - The reason for closing the WebSocket connection.
     */

    onClose(code, reason) {
        // Logging disconnection details if debug mode is enabled.
        if (this.debug) console.log(`Disconnected from the gateway with code: ${code}, reason: ${reason}`);

        // Attempting to reconnect under specific conditions
        if (!this.disconnected && this.reconnect) this.connect();
    }

    /**
     * Handles WebSocket errors.
     *
     * @param {Error} error - The WebSocket error object.
     */

    onError(error) {
        // Logging WebSocket errors if debug mode is enabled.
        if (this.debug) console.error('WebSocket error:', error);
    }

    /**
     * Handles incoming messages from the Discord API gateway.
     *
     * @param {string} message - The received message.
     */

    onMessage(message) {
        try {
            // Handling incoming messages from the gateway.
            message = JSON.parse(message);
        } catch {
            // In case of any issues, the message should be an empty object.
            message = {};
        }

        switch (message.op) {
            case 10: {
                /** Opcode 10: Initial connection information */
                this.heartbeatInterval = message.d.heartbeat_interval;

                // Start sending heartbeats
                this.heartbeat();

                // Identify with the server
                this.identify();

                break;
            }

            case 11: {
                // Opcode 11: Heartbeat acknowledgment
                if (this.debug) console.log('Heartbeat acknowledged');

                break;
            }

            case 0: {
                // Opcode 0: Dispatch event
                this.handleDispatch(message);

                break;
            }
        }
    }

    /** Starts sending periodic heartbeats to the Discord API gateway. */
    heartbeat() {
        // Creating a new log in debug mode.
        if (this.debug) console.log('The heartbeat period has been started');

        // Sending heartbeat messages periodically
        const interval = setInterval(() => (this.socket ? this.socket.send(JSON.stringify({ op: 1, d: this.sequence })) : clearInterval(interval)), this.heartbeatInterval);
    }

    /** Sends identification payload to the Discord API gateway. */
    identify() {
        // Creating a new log in debug mode.
        if (this.debug) console.log('Identification payload has been sent');

        // Sending identification payload to the gateway
        this.socket.send(JSON.stringify({ op: 2, d: { token: this.token, compress: this.hasOwnProperty('zlib'), properties: { os: { darwin: 'macos', win32: 'windows' }[process.platform] || process.platform, browser: pkg.name, device: pkg.name }, intents: this.intents } }));
    }

    /**
     * Handles incoming dispatch events from the Discord API gateway.
     *
     * @param {Object} data - The dispatched data object.
     */

    handleDispatch(data) {
        /** Handling incoming dispatch events*/
        this.sequence = data.s;

        // Assigning 'READY' data to the instance
        if (data.t === 'READY') Object.assign(this, data.d);

        // Creating a new log in debug mode.
        if (this.debug) console.log('Received event:', data.t);

        // Emitting event to registered handlers
        this.emit(data.t, data.d);
    }

    /**
     * Registers an event handler for a specific event.
     *
     * @param {string} event - The event name.
     * @param {Function} handler - The event handler function.
     */

    on(event, handler) {
        // Creating a new log in debug mode.
        if (this.debug) console.log('Registered event:', event);

        // Registering event handlers
        (this.events[event] ||= []).push(handler);
    }

    /**
     * Emits an event to all registered event handlers.
     *
     * @param {string} event - The event name to emit.
     * @param {any} data - The data to pass to event handlers.
     */

    emit(event, data) {
        // Creating a new log in debug mode.
        if (this.debug) console.log('Emited event:', event);

        // Emitting events to registered handlers
        this.events[event]?.forEach((handler) => handler(data));
    }
}
