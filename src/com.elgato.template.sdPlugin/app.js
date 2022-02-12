/// <reference path="libs/js/action.js" />
/// <reference path="libs/js/deck.js" />

const streamDeck = new StreamDeck();

/**
 * The first event fired when Stream Deck starts
 */
streamDeck.registerConnected(({ actionInfo, appInfo, connection, messageType, port, uuid }) => {
	const templateAction = new Action('com.elgato.template.action');

	templateAction.registerKeyUp(({ action, context, device, event, payload }) => {
		streamDeck.openUrl('https://developer.elgato.com/documentation/stream-deck/sdk/overview/');

		console.log('Your code goes here!');

		streamDeck.showOk(context);
	});
});
