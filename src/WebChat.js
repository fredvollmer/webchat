import React, {Component} from 'react';
import ChatContainer from './ChatContainer';
import ToggleChatButton from './ToggleChatButton';
import {getBacon} from './baconIpsum';

const bottomCorner = {
  position: 'fixed',
  bottom: 0,
  right: 0,
  zIndex: 1000000,
};

class WebChat extends Component {
  state = {
    chatOpen: false,
    messages: [],
  };

  addMessage = (text) => {
    this.setState(prevState => ({
      messages: [...prevState.messages, {text, fromCustomer: true}],
    }));

    setTimeout(() => {
      this.setState(prevState => ({
        messages: [...prevState.messages, {text: getBacon(), fromCustomer: false}],
      }));
    }, 2000);
  }

  toggleChat = () => {
    this.setState(prevState => ({chatOpen: !prevState.chatOpen}));
  }

  render() {
    return (
      <div style={bottomCorner}>
        {this.state.chatOpen &&
          <ChatContainer messages={this.state.messages} addMessage={this.addMessage}/>
        }
        <ToggleChatButton toggleChat={this.toggleChat}/>
      </div>
    );
  }
}

export default WebChat;
