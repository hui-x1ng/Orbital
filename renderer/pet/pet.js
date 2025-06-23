// console.log("pet.js is loaded");

class Pet {
    constructor(imgElement) {
      this.img = imgElement;
      this.defaultSrc = '../../assets/cat.png';
      this.happySrc = '../../assets/happycat.png';
      this.isReacting = false;
    }
  
    reactHappily() {
      if (this.isReacting) return;
      this.isReacting = true;
  
      alert("Pet is happy!");
      this.img.src = this.happySrc;
  
      setTimeout(() => {
        this.img.src = this.defaultSrc;
        this.isReacting = false;
      }, 4000);
    }
  
    reset() {
      this.img.src = this.defaultSrc;
      this.isReacting = false;
    }
  }

window.addEventListener('DOMContentLoaded', () => {
    const petArea = document.getElementById('petImage');
    const pet = new Pet(petArea);
    petArea.addEventListener('click', () => {
        pet.reactHappily();
    })
})