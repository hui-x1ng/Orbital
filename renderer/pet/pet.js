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
    this.img = imgElement || this.document.getElementById('petImage');
    this.defaultSrc = '../../assets/cat-default.png';
    this.happySrc = '../../assets/cat-default.png';
    this.isReacting = false;
    this.dialog = document.getElementById('petDialog');
    this.dialogContent = document.getElementById('dialogContent');
    this.userInput = document.getElementById('userInput');
    
    this.setupDialog();
    this.setupEventListeners();
    this.setupDragging();

    this.pet = petManager.loadPet();
    this.gifSrc = document.getElementById('petImage');
    this.currentTimeout = null;

    this.isDragging = false;
    this.dragStartTime = 0;
    this.dragThreshold = 0;
    this.startX = 0;
    this.startY = 0;
    this.hasMoved = false;
  }

  setupDragging() {
    let startX = 0;
    let startY = 0;
    let isDragging = false;
    let hasMoved = false;

    this.img.addEventListener('mousedown', (e) => {
      e.preventDefault();
      isDragging = true;
      hasMoved = false;
      
      startX = e.clientX;
      startY = e.clientY;
      this.dragStartTime = Date.now();
      
      this.img.style.cursor = 'grabbing';
      
      //mouse listeners
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    });

    const handleMouseMove = (e) => {
      if (!isDragging) return;
      
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      //Check if we've moved enough to consider it a drag
      if (Math.abs(deltaX) > this.dragThreshold || Math.abs(deltaY) > this.dragThreshold) {
        hasMoved = true;
        
        //move
        if (window.electronAPI && window.electronAPI.moveWindow) {
          window.electronAPI.moveWindow(deltaX, deltaY);
        }
        
    //reset
        startX = e.clientX;
        startY = e.clientY;
      }
    };

    const handleMouseUp = (e) => {
      if (isDragging) {
        isDragging = false;
        this.img.style.cursor = 'grab';
        
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        
        const timeDiff = Date.now() - this.dragStartTime;
        if (!hasMoved && timeDiff < 300) {
          this.handlePetClick();
        }
      }
    };

    this.img.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      isDragging = true;
      hasMoved = false;
      
      startX = touch.clientX;
      startY = touch.clientY;
      this.dragStartTime = Date.now();
    });

    this.img.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      e.preventDefault();
      
      const touch = e.touches[0];
      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;
      
      if (Math.abs(deltaX) > this.dragThreshold || Math.abs(deltaY) > this.dragThreshold) {
        hasMoved = true;
        
        if (window.electronAPI && window.electronAPI.moveWindow) {
          window.electronAPI.moveWindow(deltaX, deltaY);
        }
        
        startX = touch.clientX;
        startY = touch.clientY;
      }
    });

    this.img.addEventListener('touchend', (e) => {
      if (isDragging) {
        isDragging = false;
        
        const timeDiff = Date.now() - this.dragStartTime;
        if (!hasMoved && timeDiff < 300) {
          this.handlePetClick();
        }
      }
    });
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

  setupDialog() {
      // 添加打字指示器
      this.typingIndicator = document.createElement('div');
      this.typingIndicator.className = 'message pet-message typing-indicator';
      this.typingIndicator.innerHTML = `
          <div class="typing">
              <span></span>
              <span></span>
              <span></span>
          </div>
      `;
      this.dialogContent.appendChild(this.typingIndicator);
      this.typingIndicator.style.display = 'none';
  }

  setupEventListeners() {
    // 双击宠物打开对话框
    this.img.addEventListener('dblclick', () => this.toggleDialog());
    
    // 发送按钮点击事件
    document.getElementById('sendBtn').addEventListener('click', () => {
        this.sendMessage();
    });
    
    // 关闭按钮点击事件 - 修复版
    const closeBtn = document.getElementById('closeDialogBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleDialog();
        });
    }
    
    // Enter键发送消息
    this.userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            this.sendMessage();
        }
    });
    

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.dialog.classList.contains('show')) {
            this.toggleDialog();
        }
    });
    

    document.addEventListener('click', (e) => {
        if (this.dialog.classList.contains('show') && 
            !this.dialog.contains(e.target) && 
            e.target !== this.img) {
            this.toggleDialog();
        }
    });
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
          this.addMessage('Oops! Something went wrong. Please try again later.' + error, 'pet');
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
      

    //   this.createFloatingHearts();
      
      setTimeout(() => {
          this.img.src = this.defaultSrc;
          this.isReacting = false;
      }, 3000);
  }
}

let petWindow;

window.addEventListener('DOMContentLoaded', () => {
  const petArea = document.getElementById('petImage');
  petWindow = new PetWindow(petArea);
  petArea.addEventListener('click', () => petWindow.reactToTouch());

  window.electronAPI.onPetAction((action) => {
    console.log('hii');
    if (petWindow) {
      petWindow.reactEmotion(action);
    }

  });

  let isDragging = false;
  let offsetX, offsetY;
  
  petArea.addEventListener('mousedown', (e) => {
      isDragging = true;
      offsetX = e.clientX - petArea.getBoundingClientRect().left;
      offsetY = e.clientY - petArea.getBoundingClientRect().top;
      petArea.style.cursor = 'grabbing';
      petArea.style.transition = 'none';
  });
  
  document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      const x = e.clientX - offsetX;
      const y = e.clientY - offsetY;
      
      const maxX = window.innerWidth - petArea.width;
      const maxY = window.innerHeight - petArea.height;
      
      petArea.style.left = `${Math.max(0, Math.min(maxX, x))}px`;
      petArea.style.top = `${Math.max(0, Math.min(maxY, y))}px`;
      petArea.style.position = 'fixed';
  });
  
  document.addEventListener('mouseup', () => {
      isDragging = false;
      petArea.style.cursor = 'pointer';
      petArea.style.transition = 'transform 0.3s ease';
  });

});