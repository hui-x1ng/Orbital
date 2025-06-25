console.log("pet.js is loaded");
import * as petBehaviors from '../../modules/petBehaviors.js'
import * as petManager from '../../modules/petManager.js'

const gifs = {
  annoyed: '../../assets/annoyed.gif',
  appear: '../../assets/cat-appear.gif',
  default: '../../assets/cat-default.gif',
  comfy: '../../assets/comfy.gif',
  petpet: '../../assets/petpet.gif',
}

class PetWindow {
  constructor() {
    this.pet = petManager.loadPet();
    this.gifSrc = document.getElementById('petImage');
  }

  reactEmotion(emotionName) {
    this.gifSrc = gifs[emotionName];
    document.getElementById('petImage').src = this.gifSrc;
  }
}

// class Pet {
//     constructor() {
//       this.pet = petManager.loadPet();
//       this.isReacting = false;
//     }
  
//     // reactHappily() {
//     //   if (this.isReacting) return;
//     //   this.isReacting = true;
  
//     //   alert("Pet is happy!");
//     //   this.img.src = this.happySrc;
  
//     //   setTimeout(() => {
//     //     this.img.src = this.defaultSrc;
//     //     this.isReacting = false;
//     //   }, 4000);
//     // }
  
//     reset() {
//       this.img.src = this.defaultSrc;
//       this.isReacting = false;
//     }

//     setPetAnimation(action) {
//       const gifPath = petAnimations[action] || petAnimations.idle;
//       const petImage = document.getElementById('petImage');
//       if (petImage) {
//         petImage.src = gifPath;
//       }
//     }
//   }

window.addEventListener('DOMContentLoaded', () => {
    const petArea = document.getElementById('petImage');
    const petWindow = new PetWindow();
    petArea.addEventListener('click', () => {
        alert('pet is touched');
        petWindow.reactEmotion('petpet')
        petWindow.reactEmotion('annoyed')
    })
})