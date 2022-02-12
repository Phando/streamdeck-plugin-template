/// <reference path="event-handler.js" />

/**
 * @class StreamDeck
 * StreamDeck object containing all required code to establish
 * communication with SD-Software and the Property Inspector
 */
class StreamDeck {
	static #port;
	static uuid;
	static messageType;
	static appInfo;
	static actionInfo;
	static websocket;
	static language;
	static localization;

	static events = new EventHandler().eventEmitter();
	static on = this.events.on;
	static emit = this.events.emit;

	/**
	 * Connect to Stream Deck
	 * @param port
	 * @param uuid
	 * @param messageType
	 * @param appInfoString
	 * @param actionString
	 */
	static connect([port, uuid, messageType, appInfoString, actionString]) {
		this.#port = port;
		this.uuid = uuid;
		this.messageType = messageType;
		this.appInfo = JsonUtils.parse(appInfoString);
		this.actionInfo =
			actionString !== 'undefined' ? JsonUtils.parse(actionString) : actionString;
		this.language = this.appInfo?.application?.language ?? null;

		if (this.websocket) {
			this.websocket.close();
			this.websocket = null;
		}
		this.websocket = new WebSocket('ws://127.0.0.1:' + this.#port);

		this.websocket.onopen = () => {
			const json = {
				event: this.messageType,
				uuid: this.uuid,
			};

			this.websocket.send(JSON.stringify(json));

			this.emit('connected', {
				connection: this.websocket,
				port: this.#port,
				uuid: this.uuid,
				actionInfo: this.actionInfo,
				appInfo: this.appInfo,
				messageType: this.messageType,
			});
		};

		this.websocket.onerror = (evt) => {
			console.warn('WEBOCKET ERROR', evt, evt.data, SocketUtils.getErrorMessage(evt?.code));
		};

		this.websocket.onclose = (evt) => {
			console.warn(
				'[STREAMDECK]***** WEBOCKET CLOSED **** reason:',
				SocketUtils.getErrorMessage(evt?.code)
			);
		};

		this.websocket.onmessage = (evt) => {
			let m;
			const jsonObj = JsonUtils.parse(evt.data);

			if (!jsonObj.hasOwnProperty('action')) {
				m = jsonObj.event;
				// console.log('%c%s', 'color: white; background: red; font-size: 12px;', '[deck.js]onmessage:', m);
			} else {
				switch (this.messageType) {
					case 'registerPlugin':
						m = jsonObj['action'] + '.' + jsonObj['event'];
						break;
					case 'registerPropertyInspector':
						m = 'sendToPropertyInspector';
						break;
					default:
						console.log(
							'%c%s',
							'color: white; background: red; font-size: 12px;',
							'[STREAMDECK] websocket.onmessage +++++++++  PROBLEM ++++++++'
						);
						console.warn('UNREGISTERED MESSAGETYPE:', this.messageType);
				}
			}

			if (m && m !== '') this.events.emit(m, jsonObj);
		};
	}

	/**
	 * Write to log file
	 * @param message
	 */
	static log(message) {
		try {
			if (this.websocket) {
				const json = {
					event: 'logMessage',
					payload: {
						message: message,
					},
				};
				this.websocket.send(JSON.stringify(json));
			}
		} catch (e) {
			console.log('Websocket not defined');
		}
	}

	/**
	 * Fetches the specified language json file
	 * @param lang
	 * @param pathPrefix
	 * @param cb
	 * @returns {Promise<void>}
	 */
	static async loadLocalization(lang, pathPrefix) {
		const manifest = await JsonUtils.read(`${pathPrefix}${lang}.json`);
		this.localization =
			manifest && manifest.hasOwnProperty('Localization') ? manifest['Localization'] : {};
		this.events.emit('localizationLoaded', {
			language: this.language,
		});
	}

	/**
	 * Send JSON payload to StreamDeck
	 * @param context
	 * @param fn
	 * @param payload
	 */
	static send(context, fn, payload) {
		const pl = Object.assign({}, { event: fn, context: context }, payload);
		this.websocket && this.websocket.send(JSON.stringify(pl));
	}

	/**
	 * Request the actions's persistent data. StreamDeck does not return the data, but trigger the actions's didReceiveSettings event
	 * @param context
	 */
	static getSettings(context) {
		this.send(context ?? this.uuid, 'getSettings', {});
	}

	/**
	 * Save the actions's persistent data.
	 * @param payload
	 * @param context
	 */
	static setSettings(payload, context) {
		this.send(context ?? this.uuid, 'setSettings', {
			action: StreamDeck?.actionInfo?.action,
			payload: payload || {},
			targetContext: StreamDeck?.actionInfo?.context,
		});
	}

	/**
	 * Request the plugin's persistent data. StreamDeck does not return the data, but trigger the plugin/property inspectors didReceiveGlobalSettings event
	 */
	static getGlobalSettings() {
		this.send(this.uuid, 'getGlobalSettings', {});
	}

	/**
	 * Save the plugin's persistent data
	 * @param payload
	 */
	static setGlobalSettings(payload) {
		this.send(this.uuid, 'setGlobalSettings', {
			payload: payload,
		});
	}

	/**
	 * Opens a URL in the default web browser
	 * @param urlToOpen
	 */
	static openUrl(urlToOpen) {
		this.send(this.uuid, 'openUrl', {
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
	static sendToPlugin(payload, context) {
		this.send(
			context ?? this.uuid,
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
	static showAlert(context) {
		this.send(context, 'showAlert', {});
	}

	/**
	 * Display ok check mark on actions key
	 * @param context
	 */
	static showOk(context) {
		this.send(context, 'showOk', {});
	}

	/**
	 * Set the state of the actions
	 * @param context
	 * @param payload
	 */
	static setState(context, payload) {
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
	static setTitle(context, title, target) {
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
	static sendToPropertyInspector(context, payload) {
		this.send(context, 'sendToPropertyInspector', {
			action: this.actionInfo.action,
			payload: payload,
		});
	}

	/**
	 * Set the actions key image
	 * @param context
	 * @param img
	 * @param target
	 */
	static setImage(context, img, target) {
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
	static registerConnected(fn) {
		this.on('connected', (jsn) => fn(jsn));
	}

	static registerSendToPropertyInspector(fn) {
		this.on('sendToPropertyInspector', (jsn) => fn(jsn));
	}

	static registerPIDataChanged(fn) {
		this.on('piDataChanged', (jsn) => fn(jsn));
	}

	static registerLocalizationLoaded(fn) {
		this.on('localizationLoaded', (jsn) => fn(jsn));
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
	StreamDeck.connect(arguments);
}
