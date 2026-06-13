// 4-7-8 Guided Breathing Component
export class BreathingGuide {
  constructor(circleEl, textEl, timerEl) {
    this.circle = circleEl;
    this.text = textEl;
    this.timer = timerEl;
    this.timerInterval = null;
    this.active = false;
    this.phases = [
      { name: "Inhale (Nose)", duration: 4, class: "inhale", scale: "1.8" },
      { name: "Hold", duration: 7, class: "hold", scale: "1.8" },
      { name: "Exhale (Mouth)", duration: 8, class: "exhale", scale: "1.0" }
    ];
    this.currentPhaseIndex = 0;
  }

  start() {
    if (this.active) return;
    this.active = true;
    this.currentPhaseIndex = 0;
    this.runPhase();
  }

  stop() {
    this.active = false;
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.circle.style.transform = "scale(1.0)";
    this.circle.className = "breath-circle";
    this.text.textContent = "Tap Start to Begin";
    this.timer.textContent = "0s";
  }

  runPhase() {
    if (!this.active) return;

    const phase = this.phases[this.currentPhaseIndex];
    this.text.textContent = phase.name;
    this.circle.className = `breath-circle ${phase.class}`;
    this.circle.style.transform = `scale(${phase.scale})`;

    let timeLeft = phase.duration;
    this.timer.textContent = `${timeLeft}s`;

    this.timerInterval = setInterval(() => {
      timeLeft--;
      if (timeLeft <= 0) {
        clearInterval(this.timerInterval);
        // Go to next phase
        this.currentPhaseIndex = (this.currentPhaseIndex + 1) % this.phases.length;
        this.runPhase();
      } else {
        this.timer.textContent = `${timeLeft}s`;
      }
    }, 1000);
  }
}
