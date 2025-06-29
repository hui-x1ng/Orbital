import * as petBehaviors from '../../modules/petBehaviors.js'
import * as petManager from '../../modules/petManager.js'

const gifs = {
  annoyed: '../../assets/annoyed.gif',
  appear: '../../assets/cat-appear.gif',
  default: '../../assets/cat-default.gif',
  comfy: '../../assets/comfy.gif',
  petpet: '../../assets/petpet.gif',
  feed: '../../assets/eating.gif',
}

const durations = {
  annoyed: 1500,
  appear: 2000,
  comfy: 2500,
  petpet: 2000,
  feed: 5000,
}

class PetWindow {
  constructor(imgElement) {
    this.img = imgElement;
    this.defaultSrc = '../../assets/cat.png';
    this.happySrc = '../../assets/happycat.png';
    this.isReacting = false;
    this.dialog = document.getElementById('petDialog');
    this.dialogContent = document.getElementById('dialogContent');
    this.userInput = document.getElementById('userInput');
    
    this.setupDialog();
    this.setupEventListeners();

    this.pet = petManager.loadPet();
    this.gifSrc = document.getElementById('petImage');
    this.currentTimeout = null;
  }

  async reactEmotion(emotionName) {
    const img = document.getElementById('petImage');

    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout);
      this.currentTimeout = null;
    }

    this.gifSrc = gifs[emotionName];
    img.src = this.gifSrc;

    const duration = durations[emotionName] || 2000;

    this.currentTimeout = setTimeout(() => {
      img.src = gifs['default'];
      this.currentTimeout = null;
    }, duration);
  }

  async reactToTouch() {
    console.log(this.pet);

    await this.reactEmotion('petpet');
    await new Promise(resolve => setTimeout(resolve, durations.petpet || 2000));

    if (this.pet) {
      const emotion = this.pet.intimacy > 40 ? 'comfy' : 'annoyed';
      await this.reactEmotion(emotion);
    }
  }

  toggleDialog() {
        this.dialog.classList.toggle('show');
        if (this.dialog.classList.contains('show')) {
            this.userInput.focus();

            this.img.style.transform = 'scale(1.1) rotate(5deg)';
            setTimeout(() => {
                this.img.style.transform = 'scale(1) rotate(0)';
            }, 300);
        }
  }

  async sendMessage() {
      const message = this.userInput.value.trim();
      if (!message) return;
      

      this.addMessage(message, 'user');
      this.userInput.value = '';
      
      try {

          this.showTypingIndicator();
          

          const response = await window.electronAPI.chatWithPet(message);
          

          this.hideTypingIndicator();
          
  
          setTimeout(() => {
              this.addMessage(response, 'pet');
              this.reactHappily();
              

              const event = new CustomEvent('pet-chat', { detail: response });
              window.dispatchEvent(event);
          }, 800);
      } catch (error) {
          this.hideTypingIndicator();
          this.addMessage('Oops! Something went wrong. Please try again later.', 'pet');
          console.error('AI chat error:', error);
      }
  }

  showTypingIndicator() {
      this.typingIndicator.style.display = 'block';
      this.dialogContent.scrollTop = this.dialogContent.scrollHeight;
  }

  hideTypingIndicator() {
      this.typingIndicator.style.display = 'none';
  }

  addMessage(text, sender) {
      const messageDiv = document.createElement('div');
      messageDiv.className = `message ${sender}-message`;
      

      const messageHeader = document.createElement('div');
      messageHeader.className = 'message-header';
      messageHeader.textContent = sender === 'user' ? 'You:' : 'Pet:';
      

      const messageContent = document.createElement('div');
      messageContent.className = 'message-content';
      messageContent.textContent = text;
      

      messageDiv.appendChild(messageHeader);
      messageDiv.appendChild(messageContent);
      
      this.dialogContent.appendChild(messageDiv);
      this.dialogContent.scrollTop = this.dialogContent.scrollHeight;
  }

  reactHappily() {
      if (this.isReacting) return;
      this.isReacting = true;
      

      this.img.src = this.happySrc;
      

      this.createFloatingHearts();
      
      setTimeout(() => {
          this.img.src = this.defaultSrc;
          this.isReacting = false;
      }, 3000);
  }
  
  createFloatingHearts() {
      const petBody = document.getElementById('pet-body');
      for (let i = 0; i < 8; i++) {
          const heart = document.createElement('div');
          heart.style.position = 'absolute';
          heart.style.left = `${this.img.offsetLeft + this.img.width / 2}px`;
          heart.style.top = `${this.img.offsetTop + this.img.height / 2}px`;
          heart.style.width = '20px';
          heart.style.height = '20px';
          heart.style.background = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${i % 2 === 0 ? '#f44336' : '#7e57c2'}"><path d="M12,21.35L10.55,20.03C5.4,15.36 2,12.27 2,8.5C2,5.41 4.42,3 7.5,3C9.24,3 10.91,3.81 12,5.08C13.09,3.81 14.76,3 16.5,3C19.58,3 22,5.41 22,8.5C22,12.27 18.6,15.36 13.45,20.03L12,21.35Z"/></svg>')`;
          heart.style.backgroundSize = 'contain';
          heart.style.zIndex = '999';
          heart.style.opacity = '0';
          heart.style.transition = 'all 1.5s ease-out';
          petBody.appendChild(heart);
          

          const angle = Math.random() * Math.PI * 2;
          const distance = 100 + Math.random() * 50;
          const delay = i * 150;
          
          setTimeout(() => {
              heart.style.opacity = '1';
              heart.style.transform = `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance - 100}px) scale(0.2)`;
              heart.style.opacity = '0';
          }, delay);
          

          setTimeout(() => {
              if (heart.parentNode) {
                  heart.parentNode.removeChild(heart);
              }
          }, 1500 + delay);
      }
  }

  reset() {
      this.img.src = this.defaultSrc;
      this.isReacting = false;
  }
}

let petWindow;

window.addEventListener('DOMContentLoaded', () => {
  const petArea = document.getElementById('petImage');
  petWindow = new PetWindow();
  petArea.addEventListener('click', () => petWindow.reactToTouch());

  window.electronAPI.onPetAction((action) => {
    console.log('hii');
    if (petWindow) {
      petWindow.reactEmotion(action);
    }

  });

});