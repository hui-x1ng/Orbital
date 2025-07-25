import * as petBehaviors from '../../modules/petBehaviors.js'
import * as petManager from '../../modules/petManager.js'
import * as aiManager from '../../modules/aiManager.js'

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
    this.img = imgElement || document.getElementById('petImage');
    this.defaultSrc = '../../assets/cat-default.png';
    this.happySrc = '../../assets/cat-default.png';
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
    
    // 关闭按钮点击事件
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
          
          // 修复：优先使用AI管理器，然后再尝试Electron API
          const response = await this.generateAIResponse(message);
          
          this.hideTypingIndicator();
          
          setTimeout(() => {
              this.addMessage(response, 'pet');
              this.reactHappily();
              
              // 更新宠物状态（聊天增加亲密度）
              if (this.pet) {
                  this.pet = petBehaviors.chat(this.pet);
                  petManager.savePet(this.pet);
              }
              
              // 触发宠物聊天事件
              const event = new CustomEvent('pet-chat', { detail: response });
              window.dispatchEvent(event);
          }, 800);
      } catch (error) {
          this.hideTypingIndicator();
          console.error('AI chat error:', error);
          
          // 显示更具体的错误信息
          let errorMessage = 'Sorry, I cannot chat right now. 😅';
          if (error.message.includes('API key')) {
              errorMessage = 'I need an API key to chat! Please check your settings. 🔑';
          } else if (error.message.includes('network') || error.message.includes('fetch')) {
              errorMessage = 'I cannot connect to the internet right now. 🌐';
          }
          
          this.addMessage(errorMessage, 'pet');
      }
  }

  // 修复：改进AI响应生成函数
  async generateAIResponse(message) {
      console.log('Starting AI response generation...');
      
      try {
          // 1. 首先检查AI设置是否正确配置
          const settings = await aiManager.getSettings();
          console.log('AI Settings check:', {
              hasApiKey: !!settings.apiKey,
              endpoint: settings.apiEndpoint,
              model: settings.modelName
          });
          
          if (!settings.apiKey || settings.apiKey.trim() === '') {
              throw new Error('API key not configured');
          }
          
          // 2. 获取当前宠物数据
          const petData = await this.getPetData();
          console.log('Pet data for AI:', petData);
          
          // 3. 使用AI管理器生成响应（主要方法）
          console.log('Calling aiManager.generateResponse...');
          const response = await aiManager.generateResponse(message, petData);
          console.log('AI Manager response:', response);
          
          if (response && response.trim()) {
              return response;
          }
          
          throw new Error('Empty response from AI manager');
          
      } catch (error) {
          console.error('AI Manager failed:', error);
          
          // 4. 如果AI管理器失败，尝试Electron API作为备选
          if (window.electronAPI && window.electronAPI.chatWithPet) {
              try {
                  console.log('Trying Electron API fallback...');
                  const electronResponse = await window.electronAPI.chatWithPet(message);
                  console.log('Electron API response:', electronResponse);
                  return electronResponse;
              } catch (electronError) {
                  console.error('Electron API also failed:', electronError);
              }
          }
          
          // 5. 所有方法都失败，抛出错误
          throw error;
      }
  }

  // 修复：改进宠物数据获取
  async getPetData() {
      try {
          // 优先使用Electron API获取最新数据
          if (window.electronAPI && window.electronAPI.getPetData) {
              const electronPetData = await window.electronAPI.getPetData();
              if (electronPetData) {
                  console.log('Got pet data from Electron API:', electronPetData);
                  return electronPetData;
              }
          }
          
          // 使用本地宠物数据
          if (this.pet) {
              console.log('Using local pet data:', this.pet);
              return this.pet;
          }
          
          // 使用petManager获取数据
          const managedPet = petManager.loadPet();
          if (managedPet) {
              console.log('Using pet manager data:', managedPet);
              return managedPet;
          }
          
          // 默认数据
          const defaultPet = {
              name: 'Pet',
              hp: 100,
              intimacy: 50,
              age: 1
          };
          console.log('Using default pet data:', defaultPet);
          return defaultPet;
          
      } catch (error) {
          console.error('Failed to get pet data:', error);
          return {
              name: 'Pet',
              hp: 100,
              intimacy: 50,
              age: 1
          };
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
  petWindow = new PetWindow(petArea);
  petArea.addEventListener('click', () => petWindow.reactToTouch());

  // 确保electronAPI存在后再设置监听器
  if (window.electronAPI && window.electronAPI.onPetAction) {
      window.electronAPI.onPetAction((action) => {
          console.log('Pet action received:', action);
          if (petWindow) {
              petWindow.reactEmotion(action);
          }
      });
  }

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