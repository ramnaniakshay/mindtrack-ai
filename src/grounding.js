// 5-4-3-2-1 Grounding Exercise Component
export class GroundingExercise {
  constructor(wizardEl, stepTextEl, inputContainerEl, nextBtnEl, onCompleteCallback) {
    this.wizard = wizardEl;
    this.stepText = stepTextEl;
    this.inputContainer = inputContainerEl;
    this.nextBtn = nextBtnEl;
    this.onComplete = onCompleteCallback;

    this.currentStep = 5; // Start with 5 (See)
    this.prompts = {
      5: { text: "Identify 5 things you can SEE around you right now", count: 5, color: "var(--accent-teal)" },
      4: { text: "Identify 4 physical sensations you can FEEL (e.g., chair support, keyboard keys)", count: 4, color: "var(--accent-lavender)" },
      3: { text: "Identify 3 sounds you can HEAR (e.g., fan hum, traffic, breathing)", count: 3, color: "var(--accent-rose)" },
      2: { text: "Identify 2 things you can SMELL (e.g., book pages, coffee, air)", count: 2, color: "var(--accent-teal)" },
      1: { text: "Identify 1 thing you can TASTE (or focus on the taste in your mouth)", count: 1, color: "var(--accent-lavender)" }
    };
  }

  start() {
    this.currentStep = 5;
    this.renderStep();
  }

  renderStep() {
    const stepData = this.prompts[this.currentStep];
    this.stepText.textContent = stepData.text;
    this.stepText.style.color = stepData.color;
    
    // Clear and build input fields
    this.inputContainer.innerHTML = "";
    for (let i = 1; i <= stepData.count; i++) {
      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = `Item ${i}...`;
      input.className = "grounding-input";
      input.setAttribute("aria-label", `Step ${this.currentStep} Item ${i}`);
      input.required = true;
      
      // Auto-focus the first field
      if (i === 1) {
        setTimeout(() => input.focus(), 50);
      }

      // Allow pressing Enter to go to next
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && this.validateInputs()) {
          this.next();
        }
      });

      this.inputContainer.appendChild(input);
    }

    this.nextBtn.textContent = this.currentStep === 1 ? "Complete" : "Next Step";
  }

  validateInputs() {
    const inputs = this.inputContainer.querySelectorAll("input");
    return Array.from(inputs).every(input => input.value.trim().length > 0);
  }

  next() {
    if (!this.validateInputs()) {
      alert("Please fill in all the blanks to help focus your mind.");
      return;
    }

    if (this.currentStep === 1) {
      this.inputContainer.innerHTML = "";
      this.stepText.textContent = "Grounding complete. You are present, safe, and in control.";
      this.nextBtn.style.display = "none";
      if (this.onComplete) this.onComplete();
    } else {
      this.currentStep--;
      this.renderStep();
    }
  }
}
