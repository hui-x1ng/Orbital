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
  constructor() {
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


