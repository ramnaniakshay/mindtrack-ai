import { BreathingGuide } from './src/breathing.js';
import { GroundingExercise } from './src/grounding.js';
import { AudioEngine } from './src/audio.js';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide Icons
  lucide.createIcons();

  // Navigation / Tab Switching
  const navItems = document.querySelectorAll('.nav-item');
  const panels = document.querySelectorAll('.tab-panel');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetPanelId = item.getAttribute('aria-controls');
      
      // Update sidebar nav highlights
      navItems.forEach(nav => {
        nav.classList.remove('active');
        nav.setAttribute('aria-selected', 'false');
      });
      item.classList.add('active');
      item.setAttribute('aria-selected', 'true');

      // Swap visible panels
      panels.forEach(panel => {
        if (panel.id === targetPanelId) {
          panel.classList.add('active');
        } else {
          panel.classList.remove('active');
        }
      });
    });
  });

  // Theme Toggle Controller
  const themeToggleBtn = document.getElementById('btn-theme-toggle');
  const themeToggleIcon = document.getElementById('theme-toggle-icon');

  function applyTheme(theme) {
    if (theme === 'light') {
      document.body.setAttribute('data-theme', 'light');
      themeToggleIcon.setAttribute('data-lucide', 'moon');
    } else {
      document.body.removeAttribute('data-theme');
      themeToggleIcon.setAttribute('data-lucide', 'sun');
    }
    // Re-create icons to apply correct shape
    lucide.createIcons();
  }

  themeToggleBtn.addEventListener('click', async () => {
    const currentTheme = document.body.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
    await saveSetting('app_theme', { theme: newTheme });
  });

  // Settings Modal Controller
  const settingsBtn = document.getElementById('btn-settings');
  const settingsDialog = document.getElementById('settings-dialog');
  const closeSettingsBtn = document.getElementById('btn-close-settings');
  const settingsForm = document.getElementById('form-settings');
  const settingsExamSelect = document.getElementById('settings-exam');
  const settingsDateInput = document.getElementById('settings-date');

  settingsBtn.addEventListener('click', () => {
    settingsDialog.showModal();
  });

  closeSettingsBtn.addEventListener('click', () => {
    settingsDialog.close();
  });

  settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const exam = settingsExamSelect.value;
    const date = settingsDateInput.value;

    await saveSetting('exam_goal', { exam, date });
    settingsDialog.close();
    updateCountdown();
  });

  // Database helper methods
  async function loadSettings() {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.exam_goal) {
          settingsExamSelect.value = data.exam_goal.exam;
          settingsDateInput.value = data.exam_goal.date;
        } else {
          // Fallback default
          settingsExamSelect.value = 'JEE';
          const defaultDate = new Date();
          defaultDate.setMonth(defaultDate.getMonth() + 3);
          settingsDateInput.value = defaultDate.toISOString().substring(0, 10);
        }
        if (data.app_theme) {
          applyTheme(data.app_theme.theme);
        } else {
          applyTheme('dark');
        }
      }
    } catch(err) {
      console.warn("Using local settings fallback:", err);
      applyTheme('dark');
    }
  }

  async function saveSetting(key, value) {
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
      });
    } catch(err) {
      console.error("Save settings API error:", err);
    }
  }

  // Countdown Helper
  function updateCountdown() {
    const exam = settingsExamSelect.value || "Exams";
    const dateStr = settingsDateInput.value;
    const labelEl = document.querySelector('.countdown-label');
    const timerEl = document.getElementById('days-remaining');

    if (!dateStr) {
      labelEl.textContent = "Goal Target";
      timerEl.textContent = "Not Set";
      return;
    }

    const examDate = new Date(dateStr);
    const today = new Date();
    const diffTime = examDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    labelEl.textContent = `${exam} COUNTDOWN`;
    if (diffDays > 0) {
      timerEl.textContent = `${diffDays} Days Left`;
      timerEl.style.color = "var(--accent-teal)";
    } else if (diffDays === 0) {
      timerEl.textContent = `Today is the Day!`;
      timerEl.style.color = "var(--accent-lavender)";
    } else {
      timerEl.textContent = `Completed`;
      timerEl.style.color = "var(--text-secondary)";
    }
  }

  // 1. Quick Mood Check-In Setup
  const moodButtons = document.querySelectorAll('.mood-btn');
  const logConfirm = document.getElementById('quick-log-confirm');

  moodButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      const mood = btn.getAttribute('data-mood');
      
      // Map mood to default stress and energy levels
      let energy = 5;
      let stress = 5;
      let tags = ['quick-log'];

      if (mood === 'Calm') { energy = 7; stress = 2; tags.push('relaxation'); }
      else if (mood === 'Stressed') { energy = 4; stress = 8; tags.push('revision'); }
      else if (mood === 'Anxious') { energy = 3; stress = 9; tags.push('mock-test'); }
      else if (mood === 'Energized') { energy = 9; stress = 4; tags.push('focus'); }
      else if (mood === 'Exhausted') { energy = 1; stress = 7; tags.push('burnout'); }

      try {
        const res = await fetch('/api/moods', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mood, energy, stress, tags })
        });
        
        if (res.ok) {
          logConfirm.textContent = `Logged ${mood} successfully!`;
          btn.style.borderColor = "var(--accent-teal)";
          setTimeout(() => {
            logConfirm.textContent = "";
            btn.style.borderColor = "var(--border-glass)";
          }, 3000);
          refreshMoodsData();
        }
      } catch(e) {
        console.error("Log mood error:", e);
      }
    });
  });

  // SVG Chart Renderer
  function renderMoodChart(moods) {
    const svg = document.getElementById('mood-chart');
    svg.innerHTML = ""; // Clear existing

    if (moods.length < 2) {
      // Draw placeholder/empty message
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", "250");
      text.setAttribute("y", "100");
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("class", "chart-text");
      text.textContent = "Log your mood on multiple days to view progress trend.";
      svg.appendChild(text);
      return;
    }

    // Sort moods ascending by time
    const sortedMoods = [...moods].reverse();
    const width = 500;
    const height = 200;
    const padding = 30;

    // Draw axes
    const axisY = document.createElementNS("http://www.w3.org/2000/svg", "line");
    axisY.setAttribute("x1", padding);
    axisY.setAttribute("y1", padding);
    axisY.setAttribute("x2", padding);
    axisY.setAttribute("y2", height - padding);
    axisY.setAttribute("class", "chart-axis");
    svg.appendChild(axisY);

    const axisX = document.createElementNS("http://www.w3.org/2000/svg", "line");
    axisX.setAttribute("x1", padding);
    axisX.setAttribute("y1", height - padding);
    axisX.setAttribute("x2", width - padding);
    axisX.setAttribute("y2", height - padding);
    axisX.setAttribute("class", "chart-axis");
    svg.appendChild(axisX);

    // Draw horizontal grid lines (for scale levels 1-10)
    for (let level = 2; level <= 10; level += 2) {
      const y = (height - padding) - ((level / 10) * (height - 2 * padding));
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", padding);
      line.setAttribute("y1", y);
      line.setAttribute("x2", width - padding);
      line.setAttribute("y2", y);
      line.setAttribute("class", "chart-grid-line");
      svg.appendChild(line);

      const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.setAttribute("x", padding - 8);
      label.setAttribute("y", y + 4);
      label.setAttribute("text-anchor", "end");
      label.setAttribute("class", "chart-text");
      label.textContent = level;
      svg.appendChild(label);
    }

    // Render Data lines
    const pointsCount = sortedMoods.length;
    const xStep = (width - 2 * padding) / (pointsCount - 1);
    
    let stressPathPoints = [];
    let energyPathPoints = [];

    sortedMoods.forEach((m, idx) => {
      const x = padding + (idx * xStep);
      // levels are 1-10. Maximize range.
      const stressY = (height - padding) - ((m.stress / 10) * (height - 2 * padding));
      const energyY = (height - padding) - ((m.energy / 10) * (height - 2 * padding));

      stressPathPoints.push(`${x},${stressY}`);
      energyPathPoints.push(`${x},${energyY}`);
      
      // Draw small dot circles for data points
      const dotStress = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      dotStress.setAttribute("cx", x);
      dotStress.setAttribute("cy", stressY);
      dotStress.setAttribute("r", "3.5");
      dotStress.setAttribute("fill", "var(--accent-rose)");
      svg.appendChild(dotStress);

      const dotEnergy = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      dotEnergy.setAttribute("cx", x);
      dotEnergy.setAttribute("cy", energyY);
      dotEnergy.setAttribute("r", "3.5");
      dotEnergy.setAttribute("fill", "var(--accent-teal)");
      svg.appendChild(dotEnergy);
    });

    // Stress Line Path
    const stressPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    stressPath.setAttribute("d", `M ${stressPathPoints.join(" L ")}`);
    stressPath.setAttribute("class", "chart-line-stress");
    svg.appendChild(stressPath);

    // Energy Line Path
    const energyPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    energyPath.setAttribute("d", `M ${energyPathPoints.join(" L ")}`);
    energyPath.setAttribute("class", "chart-line-energy");
    svg.appendChild(energyPath);

    // Legends
    const legendStress = document.createElementNS("http://www.w3.org/2000/svg", "text");
    legendStress.setAttribute("x", width - padding);
    legendStress.setAttribute("y", padding - 10);
    legendStress.setAttribute("text-anchor", "end");
    legendStress.setAttribute("fill", "var(--accent-rose)");
    legendStress.setAttribute("font-size", "11px");
    legendStress.setAttribute("font-weight", "600");
    legendStress.textContent = "— Stress Level";
    svg.appendChild(legendStress);

    const legendEnergy = document.createElementNS("http://www.w3.org/2000/svg", "text");
    legendEnergy.setAttribute("x", width - padding - 90);
    legendEnergy.setAttribute("y", padding - 10);
    legendEnergy.setAttribute("text-anchor", "end");
    legendEnergy.setAttribute("fill", "var(--accent-teal)");
    legendEnergy.setAttribute("font-size", "11px");
    legendEnergy.setAttribute("font-weight", "600");
    legendEnergy.textContent = "— Energy Level";
    svg.appendChild(legendEnergy);
  }

  async function refreshMoodsData() {
    try {
      const res = await fetch('/api/moods');
      if (res.ok) {
        const moods = await res.json();
        renderMoodChart(moods);
      }
    } catch(err) {
      console.warn("Failed to fetch moods for chart:", err);
    }
  }

  // 2. Journal Composer & Manager
  const journalForm = document.getElementById('form-journal');
  const journalTitleInput = document.getElementById('journal-title');
  const journalContentTextarea = document.getElementById('journal-content');
  const journalsContainer = document.getElementById('journals-container');
  const stressIndicatorsBody = document.getElementById('stress-indicators-body');

  journalForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = journalTitleInput.value;
    const content = journalContentTextarea.value;

    const btnSubmit = document.getElementById('btn-save-journal');
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = `<i data-lucide="loader" class="animate-spin"></i> Analyzing...`;
    lucide.createIcons();

    try {
      const res = await fetch('/api/journals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content })
      });

      if (res.ok) {
        journalTitleInput.value = "";
        journalContentTextarea.value = "";
        await refreshJournals();
      } else {
        const errorData = await res.json();
        if (errorData.safety) {
          // Trigger crisis intercept warning
          triggerCrisisIntercept(errorData.safety);
        } else {
          alert(`Journal analysis failed: ${errorData.error || "Unknown Error"}`);
        }
      }
    } catch(err) {
      console.error("Save journal error:", err);
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = `<i data-lucide="check"></i> Save & Analyze Entry`;
      lucide.createIcons();
    }
  });

  function renderJournalsList(entries) {
    journalsContainer.innerHTML = "";
    if (entries.length === 0) {
      journalsContainer.innerHTML = `<p class="empty-state">No journal entries logged yet.</p>`;
      return;
    }

    entries.forEach(entry => {
      const card = document.createElement("div");
      card.className = "card glassmorphic journal-entry-card";
      
      const date = new Date(entry.logged_at).toLocaleDateString(undefined, { 
        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
      });

      card.innerHTML = `
        <div class="journal-entry-header">
          <h4>${escapeHtml(entry.title)}</h4>
          <button class="btn-delete" data-id="${entry.id}" aria-label="Delete Journal Entry">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
        <div class="journal-entry-date">${date}</div>
        <div class="journal-entry-body">${escapeHtml(entry.content)}</div>
        <div class="journal-entry-footer">
          <span class="badge-sentiment ${entry.sentiment.toLowerCase()}">${entry.sentiment}</span>
          <span class="stress-badge">Stress: ${entry.stress_score}%</span>
          ${entry.triggers.map(t => `<span class="stress-badge" style="color:var(--accent-lavender); border-color:var(--accent-lavender-glow);">${escapeHtml(t)}</span>`).join("")}
          ${entry.cognitive_distortions.map(d => `<span class="stress-badge" style="color:var(--accent-rose); border-color:var(--accent-rose-glow);">${escapeHtml(d)}</span>`).join("")}
        </div>
      `;

      card.querySelector('.btn-delete').addEventListener('click', async () => {
        if (confirm("Delete this journal entry permanently?")) {
          await fetch(`/api/journals/${entry.id}`, { method: 'DELETE' });
          refreshJournals();
        }
      });

      journalsContainer.appendChild(card);
    });
    lucide.createIcons();
  }

  function renderStressDashboardInsights(entries) {
    stressIndicatorsBody.innerHTML = "";
    if (entries.length === 0) {
      stressIndicatorsBody.innerHTML = `<p class="empty-state">No journal entries logged yet. Write in your journal to discover patterns.</p>`;
      return;
    }

    // Accumulate triggers and distortions
    const triggersMap = {};
    const distortionsMap = {};
    let totalStress = 0;

    entries.forEach(e => {
      totalStress += e.stress_score;
      e.triggers.forEach(t => {
        if (t !== "General Academic Stress" && t !== "General Stress") {
          triggersMap[t] = (triggersMap[t] || 0) + 1;
        }
      });
      e.cognitive_distortions.forEach(d => {
        if (d !== "None detected" && d !== "None") {
          distortionsMap[d] = (distortionsMap[d] || 0) + 1;
        }
      });
    });

    const averageStress = Math.round(totalStress / entries.length);
    const triggersList = Object.keys(triggersMap).slice(0, 3);
    const distortionsList = Object.keys(distortionsMap).slice(0, 3);

    let listHtml = `
      <div class="stress-item">
        <div class="stress-meta">
          <span class="stress-title">Average Stress Density</span>
          <span class="card-desc" style="margin-bottom:0;">Calculated from study logs</span>
        </div>
        <span class="stress-score-num">${averageStress}%</span>
      </div>
    `;

    if (triggersList.length > 0) {
      listHtml += `
        <div class="stress-item">
          <div class="stress-meta">
            <span class="stress-title">Core Focus Triggers</span>
            <div class="stress-tags-container" style="margin-top:6px;">
              ${triggersList.map(t => `<span class="stress-badge">${escapeHtml(t)}</span>`).join("")}
            </div>
          </div>
          <span class="stress-score-num" style="color:var(--accent-lavender);"><i data-lucide="alert-triangle"></i></span>
        </div>
      `;
    }

    if (distortionsList.length > 0) {
      listHtml += `
        <div class="stress-item">
          <div class="stress-meta">
            <span class="stress-title">Cognitive Thinking Patterns</span>
            <div class="stress-tags-container" style="margin-top:6px;">
              ${distortionsList.map(d => `<span class="stress-badge" style="color:var(--accent-rose); border-color:var(--accent-rose-glow);">${escapeHtml(d)}</span>`).join("")}
            </div>
          </div>
          <span class="stress-score-num" style="color:var(--accent-rose);"><i data-lucide="brain-circuit"></i></span>
        </div>
      `;
    } else {
      listHtml += `
        <div class="stress-item">
          <div class="stress-meta">
            <span class="stress-title">Cognitive Patterns</span>
            <span class="card-desc" style="margin-bottom:0;">Clear thinking detected in journals!</span>
          </div>
          <span class="stress-score-num" style="color:var(--accent-teal);"><i data-lucide="check-circle-2"></i></span>
        </div>
      `;
    }

    stressIndicatorsBody.innerHTML = listHtml;
    lucide.createIcons();
  }

  async function refreshJournals() {
    try {
      const res = await fetch('/api/journals');
      if (res.ok) {
        const data = await res.json();
        renderJournalsList(data);
        renderStressDashboardInsights(data);
      }
    } catch(err) {
      console.warn("Journals fetch failed:", err);
    }
  }

  // 3. Aura Empathetic Conversational Companion
  const chatForm = document.getElementById('form-chat');
  const chatInputField = document.getElementById('chat-input-field');
  const chatMessagesBox = document.getElementById('chat-messages-box');
  const chatSafetyBanner = document.getElementById('chat-safety-banner');

  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = chatInputField.value.trim();
    if (!message) return;

    chatInputField.value = "";
    
    // Add User Message bubble
    appendMessageBubble('user', message);
    
    // Add typing indicator
    const typingBubble = appendTypingIndicator();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });

      typingBubble.remove();

      if (res.ok) {
        const data = await res.json();
        appendMessageBubble('model', data.reply);
        
        if (data.safety) {
          triggerCrisisIntercept(data.safety);
        }
      } else {
        appendMessageBubble('model', "I had some trouble connecting to my cognitive cores. Could you repeat that for me?");
      }
    } catch(err) {
      typingBubble.remove();
      appendMessageBubble('model', "Connection is currently down. Please practice Guided Breathing while we reconnect.");
    }
  });

  function appendMessageBubble(role, text) {
    const bubble = document.createElement("div");
    bubble.className = `message ${role}`;
    
    // Parse simple markdown-like double stars for bolding in model replies
    const formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    bubble.innerHTML = `
      <div class="message-content">
        <p>${formattedText.replace(/\n/g, '<br>')}</p>
      </div>
    `;
    chatMessagesBox.appendChild(bubble);
    chatMessagesBox.scrollTop = chatMessagesBox.scrollHeight;
  }

  function appendTypingIndicator() {
    const bubble = document.createElement("div");
    bubble.className = "message model typing";
    bubble.innerHTML = `
      <div class="message-content" style="padding:10px 16px;">
        <p style="opacity:0.6;">Aura is typing...</p>
      </div>
    `;
    chatMessagesBox.appendChild(bubble);
    chatMessagesBox.scrollTop = chatMessagesBox.scrollHeight;
    return bubble;
  }

  async function loadChatHistory() {
    try {
      const res = await fetch('/api/chat');
      if (res.ok) {
        const messages = await res.json();
        if (messages.length > 0) {
          chatMessagesBox.innerHTML = "";
          messages.forEach(m => {
            appendMessageBubble(m.role, m.message);
          });
        }
      }
    } catch(err) {
      console.warn("No chat history retrieved:", err);
    }
  }

  function triggerCrisisIntercept(safety) {
    // Show banner in chat tab
    chatSafetyBanner.style.display = "block";
    chatSafetyBanner.innerHTML = `
      <p style="font-weight:600; margin-bottom:6px;"><i data-lucide="shield-alert" style="color:var(--accent-rose); vertical-align:middle; margin-right:6px;"></i> Safety Intervention</p>
      <p>${safety.message}</p>
      <div class="helplines-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:10px;">
        ${safety.helplines.map(h => `
          <div style="background:rgba(0,0,0,0.2); padding:8px 12px; border-radius:6px; border:1px solid rgba(255,255,255,0.05);">
            <strong style="font-size:11px; color:var(--text-secondary); text-transform:uppercase;">${escapeHtml(h.name)}</strong>
            <div style="font-weight:600; font-size:13px; color:var(--accent-rose); margin-top:2px;">${escapeHtml(h.number)}</div>
          </div>
        `).join("")}
      </div>
    `;
    lucide.createIcons();

    // Route view to Chat Companion so the student sees the helplines immediately
    document.getElementById('nav-chat').click();
    chatInputField.disabled = true;
    chatInputField.placeholder = "Chat disabled. Please utilize the helplines above.";
    document.getElementById('btn-chat-send').disabled = true;
  }

  // 4. Guided Breathing Controller
  const circleEl = document.getElementById('breathing-circle');
  const instructionEl = document.getElementById('breathing-instruction');
  const breathTimerEl = document.getElementById('breathing-timer');
  const btnBreathStart = document.getElementById('btn-breath-start');
  const btnBreathStop = document.getElementById('btn-breath-stop');

  const breathingEngine = new BreathingGuide(circleEl, instructionEl, breathTimerEl);

  btnBreathStart.addEventListener('click', () => {
    breathingEngine.start();
  });

  btnBreathStop.addEventListener('click', () => {
    breathingEngine.stop();
  });

  // 5. Sensory Grounding Game Controller
  const groundingWizard = document.getElementById('grounding-wizard-container');
  const groundingStepText = document.getElementById('grounding-step-text');
  const groundingInputsBox = document.getElementById('grounding-inputs-box');
  const btnGroundingStart = document.getElementById('btn-grounding-start');
  const btnGroundingNext = document.getElementById('btn-grounding-next');

  const groundingEngine = new GroundingExercise(
    groundingWizard,
    groundingStepText,
    groundingInputsBox,
    btnGroundingNext,
    () => {
      // Complete callback: fire confetti!
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#00f5d4', '#9b5de5', '#ff5470']
      });
      // Show start button again after delay
      setTimeout(() => {
        btnGroundingStart.style.display = "inline-flex";
        btnGroundingStart.textContent = "Restart Game";
      }, 5000);
    }
  );

  btnGroundingStart.addEventListener('click', () => {
    btnGroundingStart.style.display = "none";
    btnGroundingNext.style.display = "inline-flex";
    groundingEngine.start();
  });

  btnGroundingNext.addEventListener('click', () => {
    groundingEngine.next();
  });

  // 6. Pomodoro Focus Timer Controller
  let pomodoroInterval = null;
  let pomodoroMinutes = 25;
  let pomodoroSeconds = 0;
  let pomodoroActive = false;
  let pomodoroMode = "study"; // "study" or "break"

  const pomodoroTimeDisplay = document.getElementById('pomodoro-time-display');
  const pomodoroStatusText = document.getElementById('pomodoro-status-text');
  const pomodoroProgressCircle = document.getElementById('pomodoro-progress-circle');
  const btnPomodoroStart = document.getElementById('btn-pomodoro-start');
  const btnPomodoroPause = document.getElementById('btn-pomodoro-pause');
  const btnPomodoroReset = document.getElementById('btn-pomodoro-reset');

  function updatePomodoroTimer() {
    const minStr = String(pomodoroMinutes).padStart(2, '0');
    const secStr = String(pomodoroSeconds).padStart(2, '0');
    pomodoroTimeDisplay.textContent = `${minStr}:${secStr}`;

    // Update circular progress SVG
    const totalTime = pomodoroMode === "study" ? 25 * 60 : 5 * 60;
    const timeRemaining = pomodoroMinutes * 60 + pomodoroSeconds;
    const offset = 502.65 - (502.65 * (timeRemaining / totalTime));
    pomodoroProgressCircle.style.strokeDashoffset = offset;
  }

  btnPomodoroStart.addEventListener('click', () => {
    if (pomodoroActive) return;
    pomodoroActive = true;
    pomodoroStatusText.textContent = pomodoroMode === "study" ? "Focus Session Active 📚" : "Wellness Break Active ☕";
    pomodoroStatusText.style.color = pomodoroMode === "study" ? "var(--accent-teal)" : "var(--accent-lavender)";

    pomodoroInterval = setInterval(() => {
      if (pomodoroSeconds === 0) {
        if (pomodoroMinutes === 0) {
          // Timer finished
          clearInterval(pomodoroInterval);
          pomodoroActive = false;
          
          // Audio Beep Alert
          playSoftNotificationBeep();

          // Swap modes
          if (pomodoroMode === "study") {
            pomodoroMode = "break";
            pomodoroMinutes = 5;
            pomodoroStatusText.textContent = "Study block finished! Take a 5-minute break.";
            // Confetti
            confetti({ particleCount: 30, spread: 40 });
          } else {
            pomodoroMode = "study";
            pomodoroMinutes = 25;
            pomodoroStatusText.textContent = "Break block finished! Ready to study?";
          }
          pomodoroSeconds = 0;
          updatePomodoroTimer();
          return;
        } else {
          pomodoroMinutes--;
          pomodoroSeconds = 59;
        }
      } else {
        pomodoroSeconds--;
      }
      updatePomodoroTimer();
    }, 1000);
  });

  btnPomodoroPause.addEventListener('click', () => {
    if (!pomodoroActive) return;
    clearInterval(pomodoroInterval);
    pomodoroActive = false;
    pomodoroStatusText.textContent = "Timer Paused";
    pomodoroStatusText.style.color = "var(--text-secondary)";
  });

  btnPomodoroReset.addEventListener('click', () => {
    clearInterval(pomodoroInterval);
    pomodoroActive = false;
    pomodoroMode = "study";
    pomodoroMinutes = 25;
    pomodoroSeconds = 0;
    pomodoroStatusText.textContent = "Study Mode Active";
    pomodoroStatusText.style.color = "var(--accent-teal)";
    updatePomodoroTimer();
  });

  // Native audio notification synthesizer
  function playSoftNotificationBeep() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5 note
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.3); // Sweep up to A5
      
      gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);

      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    } catch(e) {
      console.warn("Browser AudioContext not initialized yet for notification.");
    }
  }

  // 7. Ambient Audio Mixer Controller
  const chkSoundOcean = document.getElementById('chk-sound-ocean');
  const chkSoundBinaural = document.getElementById('chk-sound-binaural');
  const chkSoundNoise = document.getElementById('chk-sound-noise');

  chkSoundOcean.addEventListener('change', (e) => {
    AudioEngine.toggleOcean(e.target.checked);
  });

  chkSoundBinaural.addEventListener('change', (e) => {
    AudioEngine.toggleBinaural(e.target.checked);
  });

  chkSoundNoise.addEventListener('change', (e) => {
    AudioEngine.toggleNoise(e.target.checked);
  });

  // Helper utility for HTML escaping to protect against XSS
  function escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
  }

  // Initial Boot Sequence
  async function boot() {
    try {
      await Promise.all([
        loadSettings(),
        refreshMoodsData(),
        refreshJournals(),
        loadChatHistory()
      ]);
    } catch (err) {
      console.warn("Error loading data during application boot:", err);
    }
    updateCountdown();
    updatePomodoroTimer();
  }

  boot();
});
