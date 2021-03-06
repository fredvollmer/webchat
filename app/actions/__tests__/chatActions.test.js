// @flow
import * as chatActions from '../chatActions';
import {getMockMessage} from 'utils/testHelpers';

describe('chatActions', () => {
  describe('setChatContainerHidden', () => {
    it('builds an action', () => {
      expect(chatActions.setChatContainerHidden(true)).toMatchSnapshot();
    });
  });

  describe('setChatLauncherHidden', () => {
    it('builds an action', () => {
      expect(chatActions.setChatLauncherHidden(true)).toMatchSnapshot();
    });
  });

  describe('setChatInitialized', () => {
    it('builds an action', () => {
      expect(chatActions.setChatInitialized('initialized')).toMatchSnapshot();
    });
  });

  describe('setAgentTyping', () => {
    it('builds an action', () => {
      expect(chatActions.setAgentTyping(true)).toMatchSnapshot();
    });
  });

  describe('updateTranscript', () => {
    it('builds an action', () => {
      expect(chatActions.updateTranscript([getMockMessage()])).toMatchSnapshot();
    });
  });

  describe('setWelcomeFormRegistered', () => {
    it('builds an action', () => {
      expect(chatActions.setWelcomeFormRegistered(true)).toMatchSnapshot();
    });
  });

  describe('newWebchatSession', () => {
    it('builds an action', () => {
      expect(chatActions.newWebchatSession()).toMatchSnapshot();
    });
  });
});
