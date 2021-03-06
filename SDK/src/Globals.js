// @flow
import * as Postmaster from './Postmaster';
import {eventTypes} from 'Common/Constants';
import type {QuiqObject, ChatConfiguration} from 'types';

let quiqOptions, chatWindow, configuration;

// Getters and setters
export const getQuiqOptions = (): QuiqObject => quiqOptions;
export const setQuiqOptions = (newQuiqOptions: QuiqObject) => {
  quiqOptions = newQuiqOptions;
};

export const getChatWindow = (): Object => chatWindow;
export const setChatWindow = (newChatWindow: Object) => {
  chatWindow = newChatWindow;
};

export const getConfiguration = (): ChatConfiguration => configuration;
export const setConfiguration = (newConfiguration: ChatConfiguration) => {
  configuration = newConfiguration;
};

// Subscribe to events from webchat to keep certain global values updated
Postmaster.registerEventHandler(eventTypes._configurationDidChange, data =>
  setConfiguration(data.configuration),
);
