/// <reference path="event-handler.js" />
/// <reference path="constants.js" />

/**
 * @class StreamDeck
 * StreamDeck object containing all required code to establish
 * communication with SD-Software and the Property Inspector
 */
class StreamDeck {
	#port;
	#uuid;
	#messageType;
	#actionInfo;
	#websocket;
	#language;
	#localization;
	#appInfo;
	#on = EventHandler.on;
	#emit = EventHandler.emit;

	constructor() {
		if (StreamDeck.__instance) {
			return StreamDeck.__instance;
		}

		StreamDeck.__instance = this;
	}

	/**
	 * Connect to Stream Deck
	 * @param port
	 * @param uuid
	 * @param messageType
	 * @param appInfoString
	 * @param actionString
	 * @private
	 */
	connect([port, uuid, messageType, appInfoString, actionString]) {
		this.#port = port;
		this.#uuid = uuid;
		this.#messageType = messageType;
		this.#actionInfo = actionString ? JSON.parse(actionString) : null;
		this.#appInfo = JSON.parse(appInfoString);
		this.#language = this.#appInfo?.application?.language ?? null;

		if (this.#websocket) {
			this.#websocket.close();
			this.#websocket = null;
		}

		this.#websocket = new WebSocket('ws://127.0.0.1:' + this.#port);

		this.#websocket.onopen = () => {
			const json = {
				event: this.#messageType,
				uuid: this.#uuid,
			};

			this.#websocket.send(JSON.stringify(json));

			this.#emit('connected', {
				connection: this.#websocket,
				port: this.#port,
				uuid: this.#uuid,
				actionInfo: this.#actionInfo,
				appInfo: this.#appInfo,
				messageType: this.#messageType,
			});
		};

		this.#websocket.onerror = (evt) => {
			const error = `WEBOCKET ERROR: ${evt}, ${evt.data}, ${SocketErrors[evt?.code]}`;
			console.warn(error);
			this.log(error);
		};

		this.#websocket.onclose = (evt) => {
			console.warn('WEBOCKET CLOSED:', SocketErrors[evt?.code]);
		};

		this.#websocket.onmessage = (evt) => {
			let message;
			const data = evt?.data ? JSON.parse(evt.data) : {};
			const { action, event } = data;

			if (!action) {
				message = event;
			} else {
				switch (this.#messageType) {
					case 'registerPlugin':
						message = `${action}.${event}`;
						break;
					case 'registerPropertyInspector':
						message = 'sendToPropertyInspector';
						break;
					default:
						this.log(`Invalid message type: ${this.#messageType}`);
				}
			}

			if (message && message !== '') this.#emit(message, data);
		};
	}

	/**
	 * Write to log file
	 * @param message
	 */
	log(message) {
		try {
			if (this.#websocket) {
				const json = {
					event: 'logMessage',
					payload: {
						message: message,
					},
				};
				this.#websocket.send(JSON.stringify(json));
			}
		} catch (e) {
			console.log('Websocket not defined');
		}
	}

	/**
	 * Fetches the specified language json file
	 * @param pathPrefix
	 * @returns {Promise<void>}
	 */
	async loadLocalization(pathPrefix) {
		const manifest = await this.readJson(`${pathPrefix}${this.#language}.json`);
		this.#localization = manifest['Localization'] ?? null;

		if (this.#messageType === 'registerPropertyInspector' && this.#localization) {
			const elements = document.querySelectorAll('[data-localize]');

			elements.forEach((element) => {
				element.textContent =
					this.#localization[element.textContent] ?? element.textContent;
			});
		}
	}

	/**
	 *
	 * @param {*} path
	 * @returns
	 */
	async readJson(path) {
		return new Promise((resolve, reject) => {
			const req = new XMLHttpRequest();
			req.onerror = reject;
			req.overrideMimeType('application/json');
			req.open('GET', path, true);
			req.onreadystatechange = (response) => {
				if (req.readyState === 4) {
					const jsonString = response?.target?.response;
					if (jsonString) {
						resolve(JSON.parse(response?.target?.response));
					} else {
						reject();
					}
				}
			};

			req.send();
		});
	}

	/**
	 * Send JSON payload to StreamDeck
	 * @param context
	 * @param fn
	 * @param payload
	 */
	send(context, fn, payload) {
		const pl = Object.assign({}, { event: fn, context: context }, payload);
		this.#websocket && this.#websocket.send(JSON.stringify(pl));
	}

	/**
	 * Request the actions's persistent data. StreamDeck does not return the data, but trigger the actions's didReceiveSettings event
	 * @param context
	 */
	getSettings(context) {
		this.send(context ?? this.#uuid, 'getSettings', {});
	}

	/**
	 * Save the actions's persistent data.
	 * @param payload
	 * @param context
	 */
	setSettings(payload, context) {
		this.send(context ?? this.#uuid, 'setSettings', {
			action: StreamDeck?.actionInfo?.action,
			payload: payload || {},
			targetContext: StreamDeck?.actionInfo?.context,
		});
	}

	/**
	 * Request the plugin's persistent data. StreamDeck does not return the data, but trigger the plugin/property inspectors didReceiveGlobalSettings event
	 */
	getGlobalSettings() {
		this.send(this.#uuid, 'getGlobalSettings', {});
	}

	/**
	 * Save the plugin's persistent data
	 * @param payload
	 */
	setGlobalSettings(payload) {
		this.send(this.#uuid, 'setGlobalSettings', {
			payload: payload,
		});
	}

	/**
	 * Opens a URL in the default web browser
	 * @param urlToOpen
	 */
	openUrl(urlToOpen) {
		this.send(this.#uuid, 'openUrl', {
			payload: {
				url: urlToOpen,
			},
		});
	}

	/**
	 * Send payload from the property inspector to the plugin
	 * @param payload
	 * @param context
	 */
	sendToPlugin(payload, context) {
		this.send(
			context ?? this.#uuid,
			'sendToPlugin',
			{
				action: StreamDeck?.actionInfo?.action,
				payload: payload || {},
				targetContext: StreamDeck?.actionInfo?.context,
			},
			false
		);
	}

	/**
	 * Display alert triangle on actions key
	 * @param context
	 */
	showAlert(context) {
		this.send(context, 'showAlert', {});
	}

	/**
	 * Display ok check mark on actions key
	 * @param context
	 */
	showOk(context) {
		this.send(context, 'showOk', {});
	}

	/**
	 * Set the state of the actions
	 * @param context
	 * @param payload
	 */
	setState(context, payload) {
		this.send(context, 'setState', {
			payload: {
				state: 1 - Number(payload === 0),
			},
		});
	}

	/**
	 * Set the title of the actions's key
	 * @param context
	 * @param title
	 * @param target
	 */
	setTitle(context, title, target) {
		this.send(context, 'setTitle', {
			payload: {
				title: '' + title || '',
				target: target || Destination.HARDWARE_AND_SOFTWARE,
			},
		});
	}

	/**
	 * Send payload to property inspector
	 * @param context
	 * @param payload
	 */
	sendToPropertyInspector(context, payload) {
		this.send(context, 'sendToPropertyInspector', {
			action: this.#actionInfo.action,
			payload: payload,
		});
	}

	/**
	 * Set the actions key image
	 * @param context
	 * @param img
	 * @param target
	 */
	setImage(context, img, target) {
		this.send(context, 'setImage', {
			payload: {
				image: img || '',
				target: target || Destination.HARDWARE_AND_SOFTWARE,
			},
		});
	}

	/**
	 * Registers a callback function for when Stream Deck is connected
	 * @param {*} fn
	 */
	registerConnected(fn) {
		this.#on('connected', (jsn) => fn(jsn));
	}

	registerSendToPropertyInspector(fn) {
		this.#on('sendToPropertyInspector', (jsn) => fn(jsn));
	}

	registerPIDataChanged(fn) {
		this.#on('piDataChanged', (jsn) => fn(jsn));
	}
}

/**
 * connectElgatoStreamDeckSocket
 * This is the first function StreamDeck Software calls, when
 * establishing the connection to the plugin or the Property Inspector
 * @param {string} port - The socket's port to communicate with StreamDeck software.
 * @param {string} uuid - A unique identifier, which StreamDeck uses to communicate with the plugin
 * @param {string} messageType - Identifies, if the event is meant for the property inspector or the plugin.
 * @param {string} appInfoString - Information about the host (StreamDeck) application
 * @param {string} actionInfo - Context is an internal identifier used to communicate to the host application.
 */
function connectElgatoStreamDeckSocket() {
	new StreamDeck().connect(arguments);
}
