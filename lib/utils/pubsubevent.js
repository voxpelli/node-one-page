'use strict';

const pubSubEvent = {};

pubSubEvent.initPubSubEvent = function (handler, id, channel) {
  if (!handler) {
    throw new Error('initPubSubEvent() requires a handler to be provided');
  }
  if (this._pubSubEventHandler) {
    throw new Error('pubSubEvent already initialized');
  }

  this._pubSubEventHandler = handler;
  this._pubSubEventId = id || '';
  this._pubSubEventChannel = channel || 'pubSubEvent';

  this._pubSubEventHandler.addChannel(this._pubSubEventChannel, payload => this._handlePubSubEvent(payload));
};

pubSubEvent._handlePubSubEvent = function (payload) {
  if (payload.id === this._pubSubEventId) {
    let data = Object.assign({}, payload.data);
    this.emit(payload.eventName, data);
  }
};

pubSubEvent.emitOverPubSub = function (eventName, data) {
  if (!this._pubSubEventHandler) {
    throw new Error("pubSubEvent not initialized, can't emit event");
  }

  this._pubSubEventHandler.publish(this._pubSubEventChannel, {
    id: this._pubSubEventId,
    eventName: eventName,
    data: data,
  });
};

module.exports = pubSubEvent;
