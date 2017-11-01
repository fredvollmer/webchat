import {actionTypes} from 'Common/Constants';
import type {ChatInitializedStateType, Message} from 'types';

export const setChatContainerHidden = (chatContainerHidden: boolean) => ({
  type: 'CHAT_CONTAINER_HIDDEN',
  chatContainerHidden,
});

export const setChatLauncherHidden = (chatLauncherHidden: boolean) => ({
  type: 'CHAT_LAUNCHER_HIDDEN',
  chatLauncherHidden,
});

export const setAgentsAvailable = (agentsAvailable: boolean) => ({
  type: 'AGENTS_AVAILABLE',
  agentsAvailable,
});

export const setChatInitialized = (initializedState: ChatInitializedStateType) => ({
  type: 'CHAT_INITIALIZED_STATE',
  initializedState,
});

export const setAgentTyping = (agentTyping: boolean) => ({
  type: 'AGENT_TYPING',
  agentTyping,
});

export const setMuteSounds = (muteSounds: boolean) => ({
  type: 'MUTE_SOUNDS',
  muteSounds,
});

export const setAgentEndedConversation = (ended: boolean) => ({
  type: 'AGENT_ENDED_CONVERSATION',
  ended,
});

export const updateTranscript = (transcript: Array<Message>) => ({
  type: 'UPDATE_TRANSCRIPT',
  transcript,
});

export const setWelcomeFormRegistered = () => ({
  type: 'WELCOME_FORM_REGISTERED',
});

export const newWebchatSession = () => ({
  type: 'NEW_WEBCHAT_SESSION',
});

export const setUploadProgress = (messageId: string, progress: number) => ({
  type: actionTypes.uploadProgress,
  messageId,
  progress,
});

export const addPendingAttachmentMessage = (
  tempId: string,
  contentType: string,
  url: string,
  fromCustomer: boolean,
) => {
  return {
    type: actionTypes.addPendingMessage,
    message: {
      id: tempId,
      localKey: tempId,
      type: 'Attachment',
      timestamp: Date.now(),
      authorType: fromCustomer ? 'Customer' : 'User',
      status: 'pending',
      contentType,
      url,
    },
  };
};

export const updatePendingAttachmentId = (tempId: string, newId: string) => ({
  type: actionTypes.updatePendingMessageId,
  tempId,
  newId,
});
