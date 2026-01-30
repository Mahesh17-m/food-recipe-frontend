import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';
import { ChatService, ChatMessage, ChatResponse, RecipeSuggestion } from '../../services/chat.service';
import { SpeechService } from '../../services/speech.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, DatePipe],
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.css']
})
export class ChatbotComponent implements OnInit, AfterViewChecked {
  @ViewChild('messageContainer') private messageContainer!: ElementRef;
  
  chatForm: FormGroup;
  messages: ChatMessage[] = [];
  isListening = false;
  isProcessing = false;
  isOpen = false;
  isSpeechSupported = false;
  
  // Updated quick prompts with clean icons
  quickPrompts = [
    { text: 'Find vegetarian recipes', icon: 'leaf' },
    { text: 'Quick dinner ideas', icon: 'clock' },
    { text: 'Meal plan for weight loss', icon: 'scale' },
    { text: 'How to cook rice perfectly?', icon: 'book' },
    { text: 'Healthy breakfast options', icon: 'apple' },
    { text: 'What can I make with chicken?', icon: 'drumstick' }
  ];

  constructor(
    private fb: FormBuilder,
    private chatService: ChatService,
    private speechService: SpeechService,
    private router: Router // Add Router
  ) {
    this.chatForm = this.fb.group({
      message: ['']
    });
    
    this.isSpeechSupported = this.speechService.isSpeechSupported();
  }

  ngOnInit() {
    this.chatService.conversation$.subscribe(messages => {
      this.messages = messages;
    });
    
    this.chatService.isTyping$.subscribe(isTyping => {
      this.isProcessing = isTyping;
    });
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  toggleChat() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      setTimeout(() => {
        this.scrollToBottom();
        const input = document.querySelector('textarea');
        if (input) input.focus();
      }, 100);
    }
  }

  async sendMessage() {
    const message = this.chatForm.get('message')?.value?.trim();
    if (!message || this.isProcessing) return;

    this.chatForm.reset();
    
    try {
      const response = await this.chatService.sendMessage(message).toPromise();
      
      if (response && response.success) {
        this.chatService.addBotMessage(response);
        
        if (response.shouldSpeak && response.voiceText && response.voiceText.length < 200) {
          await this.speechService.speak(response.voiceText);
        }
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      this.addErrorResponse();
    }
  }

  async useQuickPrompt(promptText: string) {
    this.chatForm.get('message')?.setValue(promptText);
    await this.sendMessage();
  }

  toggleVoiceInput() {
    if (this.isListening) {
      this.speechService.stopListening();
      this.isListening = false;
    } else {
      this.isListening = true;
      
      this.speechService.speak("I'm listening...");
      
      this.speechService.startListening().subscribe({
        next: (transcript) => {
          this.chatForm.get('message')?.setValue(transcript);
          this.sendMessage();
          this.isListening = false;
        },
        error: (error) => {
          console.error('Voice input error:', error);
          this.isListening = false;
          this.speechService.speak("Sorry, I didn't catch that. Please try typing.");
        }
      });
    }
  }

  // Updated: Navigate in same window
  viewRecipe(recipeId: string) {
    this.chatService.navigateToRecipe(recipeId);
    this.isOpen = false; // Close chat window
  }

  clearChat() {
    this.chatService.clearConversation();
  }

  onEnterKey(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  private addErrorResponse() {
    const errorMsg: ChatMessage = {
      text: "I'm having trouble connecting right now. Please try again or use the search feature.",
      sender: 'bot',
      timestamp: new Date(),
      type: 'chat'
    };
    
    this.messages = [...this.messages, errorMsg];
    this.isProcessing = false;
  }

  private scrollToBottom(): void {
    try {
      if (this.messageContainer) {
        this.messageContainer.nativeElement.scrollTop = 
          this.messageContainer.nativeElement.scrollHeight;
      }
    } catch(err) { }
  }

  // Get SVG icon based on name
 // Replace the getIcon method with this:
getIcon(iconName: string): string {
  const icons: { [key: string]: string } = {
    leaf: 'M17.8,2.8C16,2.1,13.6,2,12,2c-1.6,0-4,0.1-5.8,0.8C3.3,3.7,2,5.3,2,7.2v9.6c0,1.9,1.3,3.5,4.2,4.4C8,22,10.4,22,12,22c1.6,0,4-0.1,5.8-0.8c2.9-0.9,4.2-2.5,4.2-4.4V7.2C22,5.3,20.7,3.7,17.8,2.8z M20,16.8c0,1-0.8,2-3.2,2.6C15.1,19.9,13.1,20,12,20c-1.1,0-3.1-0.1-4.8-0.6C4.8,18.8,4,17.8,4,16.8V7.2c0-1,0.8-2,3.2-2.6C8.9,4.1,10.9,4,12,4c1.1,0,3.1,0.1,4.8,0.6c2.4,0.6,3.2,1.6,3.2,2.6V16.8z',
    clock: 'M12,2C6.5,2,2,6.5,2,12s4.5,10,10,10s10-4.5,10-10S17.5,2,12,2z M12,20c-4.4,0-8-3.6-8-8s3.6-8,8-8s8,3.6,8,8S16.4,20,12,20z M12.5,7H11v6l5.2,3.2l0.8-1.3l-4.5-2.7V7z',
    scale: 'M12,3c-4.4,0-8,3.6-8,8c0,4.4,3.6,8,8,8s8-3.6,8-8C20,6.6,16.4,3,12,3z M12,18c-3.9,0-7-3.1-7-7s3.1-7,7-7s7,3.1,7,7S15.9,18,12,18z M14.5,11h-5v2h5V11z',
    book: 'M18,2H6C4.9,2,4,2.9,4,4v16c0,1.1,0.9,2,2,2h12c1.1,0,2-0.9,2-2V4C20,2.9,19.1,2,18,2z M18,20H6V4h5v7l2.5-1.5L16,11V4h2V20z',
    apple: 'M18.2,13c0-2.5,2-4.5,4.5-4.5c0.4,0,0.8,0,1.3,0.1c-0.2,1.2-0.8,2.3-1.7,3.1c-0.9,0.9-2,1.5-3.2,1.7C18.9,13.7,18.6,13.4,18.2,13z M14.2,8.8c0.7-0.9,1.2-2,1.2-3.1c0-0.2,0-0.4-0.1-0.6c-1.1,0-2.2,0.4-3,1.2c-0.8,0.8-1.3,1.9-1.3,3c0,0.2,0,0.4,0.1,0.6C11.6,9.5,12.9,9.2,14.2,8.8z M12,2C6.5,2,2,6.5,2,12s4.5,10,10,10s10-4.5,10-10S17.5,2,12,2z M12,20c-4.4,0-8-3.6-8-8s3.6-8,8-8s8,3.6,8,8S16.4,20,12,20z',
    drumstick: 'M20.2,12.2c0.6-0.6,1-1.4,1-2.2c0-1.7-1.3-3-3-3c-0.8,0-1.6,0.4-2.2,1L12,10l-2-2l-7,7c-0.6,0.6-1,1.4-1,2.2c0,1.7,1.3,3,3,3c0.8,0,1.6-0.4,2.2-1l7-7l-2-2L20.2,12.2z M6.2,18.2c-0.4,0.4-1,0.4-1.4,0c-0.4-0.4-0.4-1,0-1.4l5-5l1.4,1.4L6.2,18.2z M13.4,11l1.4,1.4l1.8-1.8c0.2-0.2,0.4-0.5,0.4-0.8c0-0.6-0.4-1-1-1c-0.3,0-0.6,0.1-0.8,0.4L13.4,11z',
    default: 'M12,2C6.5,2,2,6.5,2,12s4.5,10,10,10s10-4.5,10-10S17.5,2,12,2z M12,20c-4.4,0-8-3.6-8-8s3.6-8,8-8s8,3.6,8,8S16.4,20,12,20z M12.5,7H11v6l5.2,3.2l0.8-1.3l-4.5-2.7V7z'
  };
  
  // Use bracket notation to access the property
  return icons[iconName] || icons['default'];
}
}