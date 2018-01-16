// @flow
import React from 'react';
import {getStyle} from 'Common/QuiqOptions';
import {
  inStandaloneMode,
  isStorageEnabled,
  isSupportedBrowser,
  uuidv4,
  convertToExtensionMessages,
  isMobile,
  repeat,
} from 'Common/Utils';
import clamp from 'lodash/clamp';
import {setFavicon, setApplicationName, setBrowserThemeColor} from 'utils/domUtils';
import {createGuid} from 'core-ui/utils/stringUtils';
import WelcomeForm from 'WelcomeForm';
import MessageForm from 'MessageForm';
import Debugger from './Debugger/Debugger';
import HeaderMenu from 'HeaderMenu';
import QuiqChatClient from 'quiq-chat';
import debounce from 'lodash/debounce';
import Transcript from 'Transcript';
import Spinner from 'Spinner';
import {connect} from 'react-redux';
import {
  ChatInitializedState,
  intlMessageTypes,
  maxAttachmentSize,
  ExtensionSdkEventTypes,
  AttachmentErrorTypes,
} from 'Common/Constants';
import Dropzone from 'react-dropzone';
import * as ChatActions from 'actions/chatActions';
import type {
  ChatState,
  ChatInitializedStateType,
  ChatConfiguration,
  Message as MessageType,
  AttachmentError,
} from 'Common/types';
import {registerExtension, postExtensionEvent} from 'services/Extensions';
import {
  getTranscript,
  getIsAgentAssigned,
  getAgentEndedLatestConversation,
  getConfiguration,
  getMessage,
  getWindowScrollLockEnabled,
} from 'reducers/chat';
import styled, {css} from 'react-emotion';

export const getHeight = (newHeight: string, heightOverride: number): string => {
  let height = newHeight;

  if (isMobile()) {
    height = `${heightOverride}px`;
  }

  return height;
};

export const ChatContainerStyle = styled.div`
  width: 99vw !important;
  height: ${props => props.height} !important;
  max-width: none !important;
  max-height: none !important;
  margin: auto !important;
  padding: 0;
  border: 1px solid rgba(0, 0, 0, 0.117647);
  border-radius: 5px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #f4f4f8;

  ${props =>
    props.standaloneMode &&
    css`
      width: 100vw !important;
      position: initial;
      right: 0;
      bottom: 0;
      border: none;
      border-radius: 0;
      animation: none;
    `};
`;

export const ChatContainerBody = styled.div`
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  overflow: hidden;
`;

export const Banner = styled.div`
  flex: 0 0 auto;
  color: #fff;
  display: flex;
  flex-direction: column;
  justify-content: center;
  font-weight: 300;
  font-size: 14px;
  padding: 0 30px;
  align-items: stretch;
  text-align: center;
  background: #59ad5d;
  height: 60px;

  @media (max-height: 200px) {
    display: none;
  }
`;

export const ErrorBanner = styled.div`
  flex: 0 0 auto;
  color: #fff;
  display: flex;
  flex-direction: column;
  justify-content: center;
  font-weight: 300;
  font-size: 14px;
  padding: 0 30px;
  align-items: stretch;
  text-align: center;
  background: #ad2215;
  height: 50px;
`;

/* eslint-disable no-confusing-arrow */
export const TranscriptArea = styled(Dropzone)`
  display: flex;
  flex: ${props => (props.haswaitscreen === 'true' ? 0 : 1)} 1 auto;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  width: 100%;
  white-space: pre-wrap;
`;
/* eslint-disable no-confusing-arrow */

export const WaitScreenScrollWrapper = styled.div`
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  position: relative;
  // IMPORTANT: This property is needed to allow for scrolling within the iFrame
  // on mobile devices. If you remove, be sure to test those scenarios.
  -webkit-overflow-scrolling: touch;
`;

export const WaitScreen = styled.iframe`
  flex: 1 1 auto;
  height: 100%;
  border-width: 0;
  width: 100%;
`;

export const WaitScreenDragDropProtector = styled.div`
  position: absolute;
  height: 100%;
  width: 100%;
`;

export type ChatContainerProps = {
  chatContainerHidden: boolean,
  configuration: ChatConfiguration,
  welcomeFormRegistered: boolean,
  initializedState: ChatInitializedStateType,
  isAgentAssigned: boolean,
  transcript: Array<MessageType>,
  agentEndedConversation: boolean,
  agentsAvailable: boolean,
  setUploadProgress: (messageId: string, progress: number) => void,
  updatePendingAttachmentId: (tempId: string, newId: string) => void,
  addPendingAttachmentMessage: (
    tempId: string,
    contentType: string,
    url: string,
    fromCustomer: boolean,
  ) => void,
  addAttachmentError: (attachmentError: AttachmentError) => void,
  removeMessage: (id: string) => void,
  windowScrollLockEnabled: boolean,
};

export type ChatContainerState = {
  bannerMessage?: string,
  agentsAvailableOrSubscribed: boolean,
  heightOverride: number,
};

const preventAndStopEvent = (e: SyntheticMouseEvent<*>) => {
  e.preventDefault();
  e.stopPropagation();
};

export class ChatContainer extends React.Component<ChatContainerProps, ChatContainerState> {
  props: ChatContainerProps;
  state: ChatContainerState = {
    agentsAvailableOrSubscribed: false,
    heightOverride: 0,
  };
  dropzone: ?Dropzone;
  bannerMessageTimeout: ?number;
  extensionFrame: HTMLIFrameElement;
  chatContainer: HTMLElement;

  debouncedScrollToTop = debounce(() => {
    if (this.props.windowScrollLockEnabled) {
      window.scrollTo(0, 0);
    }
  }, 100);

  componentWillMount() {
    // Set custom window title
    document.title = getMessage(intlMessageTypes.pageTitle);
    setApplicationName(getMessage(intlMessageTypes.pageTitle));

    // Set custom favicon
    if (this.props.configuration.icons.favicon) {
      setFavicon(
        this.props.configuration.icons.favicon,
        this.props.configuration.icons.appleTouchIcon,
      );
    }

    // Set browser theme color
    if (this.props.configuration.colors.browserTheme) {
      setBrowserThemeColor(this.props.configuration.colors.browserTheme);
    }

    this.setState({
      agentsAvailableOrSubscribed: this.props.agentsAvailable || QuiqChatClient.isUserSubscribed(),
      // innerHeight will work regardless of orientation
      heightOverride: window.innerHeight,
    });

    // Listen for window resize and adjust height accordingly
    window.addEventListener('resize', () => {
      // Do this 5 times, 100 ms apart to greedily catch the change in size
      repeat(
        () => {
          this.setState({heightOverride: window.innerHeight}, () => {
            // Requeue the scroll to the end of execution queue...that way height adjustment has caught up.
            // This is a browser issue, not react issue, that's why it's not enough to just run in setState callback.
            setTimeout(() => {
              window.scrollTo(0, 0);
            }, 0);
          });
        },
        5,
        100,
      );
    });

    // Listen for window scroll and reverse effect
    // In landscape, iOS will scroll past height of document for some reason
    window.addEventListener('scroll', this.debouncedScrollToTop);
  }

  enableDragDropProtection(enabled: boolean) {
    if (enabled) {
      // $FlowIssue - dragover not in enum
      this.chatContainer.addEventListener('dragover', preventAndStopEvent);
      // $FlowIssue - drop not in enum
      this.chatContainer.addEventListener('drop', preventAndStopEvent);
    } else {
      // $FlowIssue - dragover not in enum
      this.chatContainer.removeEventListener('dragover', preventAndStopEvent);
      // $FlowIssue - drop not in enum
      this.chatContainer.removeEventListener('drop', preventAndStopEvent);
    }
  }

  componentWillReceiveProps(nextProps: ChatContainerProps) {
    this.setState({
      agentsAvailableOrSubscribed: nextProps.agentsAvailable || QuiqChatClient.isUserSubscribed(),
    });
  }

  handleAttachments = (accepted: Array<File>, rejected: Array<File>) => {
    rejected.forEach(f => {
      this.props.addAttachmentError({
        timestamp: Date.now(),
        id: createGuid(),
        type:
          f.size > maxAttachmentSize
            ? AttachmentErrorTypes.TOO_LARGE
            : AttachmentErrorTypes.UNSUPPORTED_TYPE,
        payload: f.name,
      });
    });

    if (rejected.length > 0) return;

    // Clear any attachment error
    this.setState({bannerMessage: undefined});

    accepted.forEach(file => {
      const tempId = `temp_${uuidv4()}`;
      const dataUrl = window.URL.createObjectURL(file);
      this.props.addPendingAttachmentMessage(tempId, file.type, dataUrl, true);
      QuiqChatClient.sendAttachmentMessage(file, (progress: number) =>
        this.props.setUploadProgress(tempId, progress),
      )
        .then(id => {
          this.props.updatePendingAttachmentId(tempId, id);
        })
        .catch(() => {
          this.props.addAttachmentError({
            timestamp: Date.now(),
            id: createGuid(),
            type: AttachmentErrorTypes.UPLOAD_ERROR,
            payload: file.name,
          });
          this.props.removeMessage(tempId);
        });
    });
  };

  openFileBrowser = () => {
    if (this.dropzone) {
      this.dropzone.open();
    }
  };

  attachmentEnabled = (): boolean =>
    this.state.agentsAvailableOrSubscribed &&
    this.props.configuration.enableChatFileAttachments &&
    !(this.props.configuration.enableManualConvoStart && this.props.agentEndedConversation);

  renderBanner = () => {
    const {colors, styles, fontFamily} = this.props.configuration;

    const bannerStyle = getStyle(styles.HeaderBanner, {
      backgroundColor: colors.primary,
      fontFamily,
    });

    const errorBannerStyle = getStyle(styles.ErrorBanner, {fontFamily});

    // If state indicates a warning message, use that
    if (this.state.bannerMessage) {
      return <ErrorBanner style={errorBannerStyle}>{this.state.bannerMessage}</ErrorBanner>;
    }

    switch (this.props.initializedState) {
      case ChatInitializedState.INITIALIZED:
      case ChatInitializedState.LOADING:
      case ChatInitializedState.UNINITIALIZED:
        return <Banner style={bannerStyle}>{getMessage(intlMessageTypes.headerText)}</Banner>;
      case ChatInitializedState.INACTIVE:
        return (
          <ErrorBanner style={errorBannerStyle}>
            {getMessage(intlMessageTypes.inactiveMessage)}
          </ErrorBanner>
        );
      case ChatInitializedState.DISCONNECTED:
        return (
          <ErrorBanner style={errorBannerStyle}>
            {getMessage(intlMessageTypes.reconnectingMessage)}
          </ErrorBanner>
        );
      case ChatInitializedState.ERROR:
      case ChatInitializedState.BURNED:
      default:
        return (
          <ErrorBanner style={errorBannerStyle}>
            {getMessage(intlMessageTypes.errorMessage)}
          </ErrorBanner>
        );
    }
  };

  renderContent = () => {
    const chatContainerStyle = {
      backgroundColor: this.props.configuration.colors.transcriptBackground,
    };
    switch (this.props.initializedState) {
      case ChatInitializedState.INITIALIZED:
        return (
          <ChatContainerBody style={chatContainerStyle}>
            {this.isUsingWaitScreen() && (
              // IMPORTANT: This wrapper is needed to get scrolling and the flex resizing to
              // working correctly on mobile devices. If you remove, be sure to test those
              // scenarios.
              <WaitScreenScrollWrapper
                style={{
                  minHeight: this.getWaitScreenMinHeight(),
                  height: this.getWaitScreenHeight(),
                  borderWidth: 0,
                  flexGrow: this.getWaitScreenFlexGrow(),
                  width: '100%',
                }}
              >
                <WaitScreen
                  innerRef={r => {
                    this.extensionFrame = r;
                  }}
                  style={{
                    minHeight: this.getWaitScreenMinHeight(),
                  }}
                  onLoad={this.handleIFrameLoad}
                  sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms allow-same-origin allow-orientation-lock"
                  src={
                    this.props.configuration.customScreens &&
                    this.props.configuration.customScreens.waitScreen
                      ? this.props.configuration.customScreens.waitScreen.url
                      : ''
                  }
                />
                <WaitScreenDragDropProtector />
              </WaitScreenScrollWrapper>
            )}
            <TranscriptArea
              innerRef={d => {
                this.dropzone = d;
              }}
              haswaitscreen={this.isUsingWaitScreen().toString()}
              disabled={!this.attachmentEnabled()}
              accept={this.props.configuration.supportedAttachmentTypes.join(',')}
              disablePreview={true}
              disableClick={true}
              maxSize={maxAttachmentSize}
              onDrop={this.handleAttachments}
              style={{
                // This is to ensure that the size of this renders in a way that allows us to at least scroll in IE 10
                minHeight: this.props.transcript.length > 0 ? '75px' : '0px',
              }}
              id="TranscriptArea"
            >
              <Transcript />
              <MessageForm openFileBrowser={this.openFileBrowser} />
            </TranscriptArea>
          </ChatContainerBody>
        );
      case ChatInitializedState.UNINITIALIZED:
      case ChatInitializedState.LOADING:
        return (
          <ChatContainerBody style={chatContainerStyle}>
            <Spinner />
          </ChatContainerBody>
        );
      case ChatInitializedState.DISCONNECTED:
      case ChatInitializedState.ERROR:
      case ChatInitializedState.INACTIVE:
      case ChatInitializedState.BURNED:
      default:
        return (
          <ChatContainerBody style={chatContainerStyle}>
            <Transcript />
          </ChatContainerBody>
        );
    }
  };

  isUsingWaitScreen = () => {
    return !!(
      this.props.configuration.customScreens &&
      this.props.configuration.customScreens.waitScreen &&
      !this.props.isAgentAssigned &&
      !this.props.agentEndedConversation
    );
  };

  handleIFrameLoad = () => {
    // $FlowIssue - Null check is done upstream of this call
    registerExtension(
      // $FlowIssue - Null check is done upstream of this call
      this.props.configuration.customScreens.waitScreen.url,
      this.extensionFrame.contentWindow,
    );

    postExtensionEvent({
      eventType: 'transcriptChanged',
      data: {messages: convertToExtensionMessages(this.props.transcript)},
    });

    postExtensionEvent({
      eventType: ExtensionSdkEventTypes.ESTIMATED_WAIT_TIME_CHANGED,
      data: {estimatedWaitTime: QuiqChatClient.getEstimatedWaitTime()},
    });

    QuiqChatClient.onEstimatedWaitTimeChanged((estimatedWaitTime?: number) => {
      if (this.extensionFrame && this.extensionFrame.contentWindow) {
        postExtensionEvent({
          eventType: ExtensionSdkEventTypes.ESTIMATED_WAIT_TIME_CHANGED,
          data: {estimatedWaitTime},
        });
      }
    });
  };

  getWaitScreenHeight = () => {
    // NOTE: clamping is not needed here, since height can be massaged by flexbox to fit in available space.
    // $FlowIssue - Null check is done upstream of this call
    return this.props.configuration.customScreens.waitScreen.height || '100%';
  };

  getWaitScreenFlexGrow = () => {
    // $FlowIssue - Null check is done upstream of this call
    return this.props.configuration.customScreens.waitScreen.height ? 0 : 1;
  };

  getWaitScreenMinHeight = () => {
    return clamp(
      // $FlowIssue - Null check is done upstream of this call
      this.props.configuration.customScreens.waitScreen.minHeight || 100,
      0,
      window.innerHeight - 200,
    );
  };

  render() {
    if (this.props.chatContainerHidden || !isSupportedBrowser() || !isStorageEnabled()) return null;

    const height = '100vh';

    if (
      this.props.configuration.demoMode ||
      (this.props.initializedState === ChatInitializedState.INITIALIZED &&
        !this.props.welcomeFormRegistered)
    ) {
      return (
        <ChatContainerStyle
          standaloneMode={inStandaloneMode()}
          height={getHeight(height, this.state.heightOverride)}
          innerRef={node => {
            if (node) {
              this.chatContainer = node;
              this.enableDragDropProtection(true);
            }
          }}
        >
          <WelcomeForm />
        </ChatContainerStyle>
      );
    }

    return (
      <ChatContainerStyle
        standaloneMode={inStandaloneMode()}
        height={getHeight(height, this.state.heightOverride)}
        innerRef={node => {
          if (node) {
            this.chatContainer = node;
            this.enableDragDropProtection(!this.attachmentEnabled());
          }
        }}
      >
        <HeaderMenu />
        {this.renderBanner()}
        <Debugger />
        {this.renderContent()}
      </ChatContainerStyle>
    );
  }
}

const mapStateToProps = (state: ChatState) => ({
  chatContainerHidden: state.chatContainerHidden,
  initializedState: state.initializedState,
  welcomeFormRegistered: state.welcomeFormRegistered,
  configuration: getConfiguration(state),
  isAgentAssigned: getIsAgentAssigned(state),
  transcript: getTranscript(state),
  agentEndedConversation: getAgentEndedLatestConversation(state),
  agentsAvailable: state.agentsAvailable,
  windowScrollLockEnabled: getWindowScrollLockEnabled(state),
});

const mapDispatchToProps = {
  setUploadProgress: ChatActions.setUploadProgress,
  updatePendingAttachmentId: ChatActions.updatePendingAttachmentId,
  addPendingAttachmentMessage: ChatActions.addPendingAttachmentMessage,
  addAttachmentError: ChatActions.addAttachmentError,
  removeMessage: ChatActions.removeMessage,
};

export default connect(mapStateToProps, mapDispatchToProps)(ChatContainer);
