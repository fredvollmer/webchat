import {webchatPath, eventTypes, quiqChatFrameId} from 'Common/Constants';
import {setup as setupMessenger, registerEventHandler} from '../services/Messenger';
import ToggleChatButton from 'styles/ToggleChatButton';
import {getQuiqOptions, setChatWindow, getChatWindow, getUsingDefaultLaunchButton} from '../Globals';
import {displayError, isIFrame, getCalcStyle} from 'Common/Utils';

let standaloneWindowTimer;

export const buildChatIFrame = (hideInitially: boolean = true) => {
  const quiqOptions = getQuiqOptions();

  const framePosition = {
    bottom: quiqOptions.position.bottom || '24px',
    top: quiqOptions.position.top || 'inherit',
    right: quiqOptions.position.right || '24px',
    left: quiqOptions.position.left || 'inherit',
  };

  // Determine actual bottom of iframe based on whether or not we have a custom launch button
  const launchButtonHeight = getUsingDefaultLaunchButton()
    ? (quiqOptions.styles.ToggleChatButton && quiqOptions.styles.ToggleChatButton.height) ||
      ToggleChatButton.height
    : '0px';

  if (!document.querySelector(`#${quiqChatFrameId}`)) {
    const quiqChatFrame = document.createElement('iframe');
    quiqChatFrame.id = quiqChatFrameId;
    quiqChatFrame.src = `${quiqOptions.host}/${webchatPath}`;
    quiqChatFrame.height = hideInitially ? 0 : quiqOptions.height; // When initialized with height of 0, onAgentAvailabilityChange will set to proper height
    quiqChatFrame.width = quiqOptions.width;
    quiqChatFrame.style.position = 'fixed';
    quiqChatFrame.style.bottom = getCalcStyle(launchButtonHeight, framePosition.bottom, '+');
    quiqChatFrame.style.right = framePosition.right;
    quiqChatFrame.style.left = framePosition.left;
    quiqChatFrame.style.top = framePosition.top;
    quiqChatFrame.style.border = 'none';
    quiqChatFrame.onload = () => {
      handleWindowChange(window.quiqChatFrame);
      window.quiqChatFrame.contentWindow.postMessage(
        {quiqOptions, name: 'handshake'},
        quiqOptions.host,
      );
    };
    document.body.appendChild(quiqChatFrame);
  } else {
    handleWindowChange(window.quiqChatFrame);
  }
};

// Event handlers
const handleVisibilityChange = data => {
  const quiqOptions = getQuiqOptions();
  const chatWindow = getChatWindow();
  const {visible} = data;

  // If chat is in an iframe, resize iframe
  if (isIFrame(chatWindow)) {
    // Resize IFrame so that it's height is 0 when not visible
    if (visible) {
      chatWindow.height = quiqOptions.height;
    } else {
      chatWindow.height = 0;
    }
  }
};

const handleWindowChange = newWindow => {
  setChatWindow(newWindow);
  setupMessenger();
};

const handleStandaloneOpen = () => {
  const quiqOptions = getQuiqOptions();
  const currentChatWindow = getChatWindow();
  if (getChatWindow().name && getChatWindow().name === StandaloneWindowName) {
    getChatWindow().focus();
  }

  const width = quiqOptions.width;
  const height = quiqOptions.height;
  const left = screen.width / 2 - width / 2;
  const top = screen.height / 2 - height / 2;

  const url = `${quiqOptions.host}/app/webchat/index.html`;
  const params = `toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, copyhistory=no, resizable=no, width=${width}, height=${height}, top=${top}, left=${left}`;

  // Open standalone chat window
  const popup = window.open(url, JSON.stringify(quiqOptions), params);

  // Hode IFrame (set height to 0)
  if (isIFrame(currentChatWindow)) {
    currentChatWindow.height = 0;
  }

  // Setup services to use popup
  handleWindowChange(popup);

  // Focus popup
  popup.focus();

  /*
   * Since we popped open webchat into a new window in standalone mode,
   * this instance now needs to start listening for if that new window closes.
   */
  if (standaloneWindowTimer) clearInterval(standaloneWindowTimer);
  standaloneWindowTimer = setInterval(() => {
    if (popup.closed) {
      if (standaloneWindowTimer) clearInterval(standaloneWindowTimer);
      standaloneWindowTimer = undefined;
      // Rebuild the iframe, with non-zero initial height
      //buildChatIFrame(false);
      handleWindowChange(window.quiqChatFrame);
      window.quiqChatFrame.height = quiqOptions.height;
    }
  }, 500);
};

// Register event handlers for this module
registerEventHandler(eventTypes.chatVisibilityDidChange, handleVisibilityChange);
registerEventHandler(eventTypes.standaloneOpen, handleStandaloneOpen);