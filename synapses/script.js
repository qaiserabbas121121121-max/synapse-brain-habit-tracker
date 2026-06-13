/**
 * Synapses — Brain & Habit Visualizer
 *
 * Data flow:
 * 1. HABITS object maps each habit → brain regions (with activity level + type)
 * 2. selectHabit() / logHabit() calls highlightBrainRegions()
 * 3. highlightBrainRegions() applies CSS classes to SVG elements by data-region
 * 4. renderSciencePanel() shows neuroplasticity info for the active habit
 * 5. localStorage persists logs; streak is recalculated on load
 */

const STORAGE_KEY = "synapses_habit_logs";

// Region keys match data-region attributes on SVG elements
const REGIONS = {
  prefrontal: "Prefrontal Cortex",
  hippocampus: "Hippocampus",
  amygdala: "Amygdala",
  striatum: "Striatum",
};

/**
 * Each habit defines:
 * - regions: which brain areas activate, at what intensity (0–1), and how (positive/calming/negative)
 * - science: educational copy shown in the sidebar
 */
const HABITS = {
  meditation: {
    id: "meditation",
    name: "Meditation",
    icon: "🧘",
    category: "Mindfulness",
    regions: {
      prefrontal: { level: 0.9, type: "positive" },
      amygdala: { level: 0.35, type: "calming" },
      hippocampus: { level: 0.55, type: "positive" },
      striatum: { level: 0.4, type: "positive" },
    },
    science: {
      summary:
        "Regular meditation thickens the prefrontal cortex and quiets amygdala hyperactivity, rewiring stress-response circuits through sustained attention practice.",
      neuroplasticity:
        "MRI studies show 8 weeks of mindfulness increases gray matter density in the hippocampus and temporo-parietal junction. Repeated focus trains top-down regulation — the prefrontal cortex literally strengthens synaptic connections that inhibit reactive limbic firing.",
      neurotransmitters: ["GABA", "Serotonin", "Dopamine (baseline)"],
      pathways:
        "The default mode network (self-referential thinking) downregulates while the attention network strengthens. Long-term meditators show reduced amygdala volume and faster prefrontal-amygdala coupling during stress.",
    },
  },

  exercise: {
    id: "exercise",
    name: "Exercise",
    icon: "🏃",
    category: "Physical",
    regions: {
      prefrontal: { level: 0.7, type: "positive" },
      hippocampus: { level: 0.95, type: "positive" },
      striatum: { level: 0.75, type: "positive" },
      amygdala: { level: 0.4, type: "calming" },
    },
    science: {
      summary:
        "Aerobic exercise is one of the most potent natural drivers of hippocampal neurogenesis and prefrontal executive enhancement.",
      neuroplasticity:
        "BDNF (brain-derived neurotrophic factor) surges after exercise, promoting new neuron growth in the hippocampus and strengthening dendritic branching. The striatum's habit-learning circuits also consolidate motor and reward patterns, making exercise self-reinforcing over time.",
      neurotransmitters: ["Dopamine", "Endorphins", "Serotonin", "BDNF"],
      pathways:
        "Exercise upregulates the mesolimbic dopamine pathway in healthy ways, improves prefrontal blood flow, and reduces chronic amygdala activation linked to anxiety. Even 20 minutes of moderate activity produces measurable cognitive benefits.",
    },
  },

  reading: {
    id: "reading",
    name: "Reading",
    icon: "📖",
    category: "Cognitive",
    regions: {
      prefrontal: { level: 0.8, type: "positive" },
      hippocampus: { level: 0.85, type: "positive" },
      striatum: { level: 0.3, type: "positive" },
      amygdala: { level: 0.2, type: "calming" },
    },
    science: {
      summary:
        "Deep reading activates language networks, memory encoding systems, and executive attention — building cognitive reserve through sustained mental simulation.",
      neuroplasticity:
        "Reading fiction strengthens theory-of-mind circuits in the prefrontal and temporal lobes. The hippocampus encodes narrative context and vocabulary into long-term memory. Over years, avid readers show greater white matter integrity in language pathways.",
      neurotransmitters: ["Acetylcholine", "Dopamine (curiosity)", "Serotonin"],
      pathways:
        "The hippocampus binds new information to existing schemas. Prefrontal regions manage inference, prediction, and attentional control. Unlike passive scrolling, reading requires active construction of mental models — a key driver of synaptic strengthening.",
    },
  },

  scrolling: {
    id: "scrolling",
    name: "Mindless Scrolling",
    icon: "📱",
    category: "Digital",
    regions: {
      striatum: { level: 0.95, type: "negative" },
      amygdala: { level: 0.7, type: "negative" },
      prefrontal: { level: 0.25, type: "dim" },
      hippocampus: { level: 0.15, type: "dim" },
    },
    science: {
      summary:
        "Infinite-scroll feeds hijack the striatum's reward prediction system with variable-ratio dopamine hits while weakening prefrontal attention control.",
      neuroplasticity:
        "Chronic passive consumption trains the brain to crave rapid novelty without depth. The striatum's dopamine receptors can desensitize, requiring more stimulation for the same reward. Meanwhile, prefrontal circuits for sustained attention and hippocampal memory consolidation are under-stimulated — a form of negative plasticity.",
      neurotransmitters: ["Dopamine (spikes)", "Cortisol", "Norepinephrine"],
      pathways:
        "Each unpredictable reward (new post, like, notification) triggers a dopamine burst in the ventral striatum. The amygdala responds to emotionally charged content, keeping you in a low-grade arousal state. Over time, this rewires attention toward distraction rather than focus.",
    },
  },

  sleep: {
    id: "sleep",
    name: "Quality Sleep",
    icon: "😴",
    category: "Recovery",
    regions: {
      hippocampus: { level: 0.9, type: "positive" },
      prefrontal: { level: 0.65, type: "positive" },
      amygdala: { level: 0.3, type: "calming" },
      striatum: { level: 0.35, type: "positive" },
    },
    science: {
      summary:
        "Sleep is when the brain consolidates memories, clears metabolic waste, and resets emotional regulation circuits.",
      neuroplasticity:
        "During slow-wave sleep, hippocampal replay transfers memories to the neocortex. Synaptic homeostasis occurs — weak connections prune while important ones strengthen. Sleep deprivation shrinks hippocampal volume and amplifies amygdala reactivity within days.",
      neurotransmitters: ["GABA", "Melatonin", "Adenosine (cleared)"],
      pathways:
        "The glymphatic system flushes toxins during deep sleep. Prefrontal restoration improves next-day decision-making. 7–9 hours supports optimal neuroplasticity for everything else you learn while awake.",
    },
  },

  social: {
    id: "social",
    name: "Social Connection",
    icon: "🤝",
    category: "Relational",
    regions: {
      prefrontal: { level: 0.6, type: "positive" },
      amygdala: { level: 0.45, type: "calming" },
      striatum: { level: 0.7, type: "positive" },
      hippocampus: { level: 0.5, type: "positive" },
    },
    science: {
      summary:
        "Meaningful social interaction activates reward circuits and reduces threat-detection bias in the amygdala through oxytocin-mediated bonding.",
      neuroplasticity:
        "Positive social experiences strengthen mirror neuron networks and prefrontal empathy circuits. Isolation, conversely, increases amygdala sensitivity to threat. Regular connection builds resilience through co-regulation of the autonomic nervous system.",
      neurotransmitters: ["Oxytocin", "Dopamine", "Serotonin", "Endorphins"],
      pathways:
        "The striatum encodes social reward (belonging feels good). The hippocampus stores relational memories. Prefrontal regions manage perspective-taking. Loneliness is associated with elevated amygdala activity and reduced prefrontal control.",
    },
  },
};

// Custom habits fall back to a balanced positive template
const CUSTOM_HABIT_TEMPLATE = {
  category: "Custom",
  regions: {
    prefrontal: { level: 0.6, type: "positive" },
    hippocampus: { level: 0.5, type: "positive" },
    striatum: { level: 0.45, type: "positive" },
    amygdala: { level: 0.35, type: "calming" },
  },
  science: {
    summary:
      "Consistent habits reshape neural circuits through repetition — whatever you practice, your brain gets better at.",
    neuroplasticity:
      "Hebbian learning ('neurons that fire together, wire together') means repeated behaviors strengthen associated pathways. The prefrontal cortex, hippocampus, and striatum all participate in habit formation, encoding, and reward reinforcement.",
    neurotransmitters: ["Dopamine", "Glutamate"],
    pathways:
      "New habits initially require prefrontal effort. With repetition, the striatum automates the behavior. Track this habit regularly to strengthen the underlying neural loop.",
  },
};

// --- State ---
let logs = [];
let activeHabitId = null;

// --- DOM refs ---
const habitGrid = document.getElementById("habit-grid");
const logForm = document.getElementById("log-form");
const customHabitInput = document.getElementById("custom-habit");
const logList = document.getElementById("log-list");
const scienceContent = document.getElementById("science-content");
const brainStatus = document.getElementById("brain-status");
const totalLogsEl = document.getElementById("total-logs");
const currentStreakEl = document.getElementById("current-streak");
const clearDataBtn = document.getElementById("clear-data");

// --- Init ---
function init() {
  loadLogs();
  renderHabitGrid();
  renderLogList();
  updateStats();

  if (logs.length > 0) {
    const lastLog = logs[0];
    const habit = resolveHabit(lastLog.habitId, lastLog.customName);
    activateHabit(habit, lastLog.habitId, false);
  }

  logForm.addEventListener("submit", handleLogSubmit);
  clearDataBtn.addEventListener("click", handleClearData);
}

function renderHabitGrid() {
  habitGrid.innerHTML = Object.values(HABITS)
    .map(
      (habit) => `
      <button type="button" class="habit-card" data-habit-id="${habit.id}" aria-pressed="false">
        <span class="habit-card__icon">${habit.icon}</span>
        <span class="habit-card__name">${habit.name}</span>
        <span class="habit-card__type">${habit.category}</span>
      </button>
    `
    )
    .join("");

  habitGrid.querySelectorAll(".habit-card").forEach((card) => {
    card.addEventListener("click", () => {
      const id = card.dataset.habitId;
      selectPresetHabit(id);
    });
  });
}

function selectPresetHabit(id) {
  const habit = HABITS[id];
  if (!habit) return;

  activeHabitId = id;
  customHabitInput.value = "";

  habitGrid.querySelectorAll(".habit-card").forEach((card) => {
    const isActive = card.dataset.habitId === id;
    card.classList.toggle("active", isActive);
    card.setAttribute("aria-pressed", isActive);
  });

  activateHabit(habit, id, false);
}

function handleLogSubmit(e) {
  e.preventDefault();

  const customName = customHabitInput.value.trim();
  let habitId;
  let displayName;

  if (customName) {
    habitId = `custom:${customName.toLowerCase().replace(/\s+/g, "-")}`;
    displayName = customName;
  } else if (activeHabitId) {
    habitId = activeHabitId;
    displayName = HABITS[activeHabitId].name;
  } else {
    brainStatus.textContent = "Select a habit or enter a custom one first.";
    return;
  }

  const entry = {
    id: crypto.randomUUID(),
    habitId,
    customName: customName || null,
    displayName,
    timestamp: Date.now(),
    date: todayString(),
  };

  // Prevent duplicate logs for the same habit on the same day
  const alreadyLogged = logs.some(
    (l) => l.date === entry.date && l.habitId === entry.habitId
  );

  if (alreadyLogged) {
    brainStatus.textContent = `Already logged "${displayName}" today.`;
    return;
  }

  logs.unshift(entry);
  saveLogs();
  renderLogList();
  updateStats();

  const habit = resolveHabit(habitId, customName);
  activateHabit(habit, habitId, true);

  customHabitInput.value = "";
}

function resolveHabit(habitId, customName) {
  if (HABITS[habitId]) return HABITS[habitId];

  return {
    id: habitId,
    name: customName || "Custom Habit",
    icon: "✦",
    ...CUSTOM_HABIT_TEMPLATE,
  };
}

function activateHabit(habit, habitId, wasLogged) {
  highlightBrainRegions(habit.regions);
  renderSciencePanel(habit);

  const action = wasLogged ? "Logged" : "Previewing";
  brainStatus.textContent = `${action}: ${habit.name} — watch affected regions light up`;
}

/**
 * Maps habit region data → SVG elements.
 * Each .brain-region element has data-region matching keys in habit.regions.
 * CSS classes (active--positive, active--calming, active--negative, active--dim)
 * control color, glow, and pulse animation based on activity type.
 */
function highlightBrainRegions(regions) {
  const allRegions = document.querySelectorAll(".brain-region");

  allRegions.forEach((el) => {
    el.classList.remove(
      "active--positive",
      "active--calming",
      "active--negative",
      "active--dim"
    );
    el.style.opacity = "";
  });

  Object.entries(regions).forEach(([regionKey, config]) => {
    const elements = document.querySelectorAll(
      `.brain-region[data-region="${regionKey}"]`
    );

    elements.forEach((el) => {
      const className = `active--${config.type}`;
      el.classList.add(className);
      // Higher level = more opaque (stronger simulated activity)
      el.style.opacity = Math.max(0.4, config.level);
    });
  });
}

function renderSciencePanel(habit) {
  const { science } = habit;

  const regionChips = Object.entries(habit.regions)
    .map(([key, config]) => {
      const label = REGIONS[key] || key;
      return `<span class="region-chip region-chip--${config.type}">${label}</span>`;
    })
    .join("");

  const neuroTags = science.neurotransmitters
    .map((nt) => {
      const lower = nt.toLowerCase();
      let cls = "";
      if (lower.includes("dopamine")) cls = "neuro-tag--dopamine";
      else if (lower.includes("serotonin")) cls = "neuro-tag--serotonin";
      else if (lower.includes("gaba")) cls = "neuro-tag--gaba";
      return `<span class="neuro-tag ${cls}">${nt}</span>`;
    })
    .join("");

  scienceContent.innerHTML = `
    <div class="science-panel">
      <div class="science-panel__header">
        <span class="science-panel__icon">${habit.icon}</span>
        <div>
          <div class="science-panel__category">${habit.category}</div>
          <div class="science-panel__title">${habit.name}</div>
        </div>
      </div>

      <div class="science-section">
        <h4>Overview</h4>
        <p>${science.summary}</p>
        <div class="region-chips">${regionChips}</div>
      </div>

      <div class="science-section">
        <h4>Neuroplasticity</h4>
        <p>${science.neuroplasticity}</p>
      </div>

      <div class="science-section">
        <h4>Neurotransmitters</h4>
        <div class="neuro-tags">${neuroTags}</div>
      </div>

      <div class="science-section">
        <h4>Neural Pathways</h4>
        <p>${science.pathways}</p>
      </div>
    </div>
  `;
}

function renderLogList() {
  if (logs.length === 0) {
    logList.innerHTML =
      '<li class="log-list__empty">No habits logged yet. Select one above to begin.</li>';
    return;
  }

  logList.innerHTML = logs
    .slice(0, 20)
    .map((entry) => {
      const habit = resolveHabit(entry.habitId, entry.customName);
      const date = new Date(entry.timestamp);
      const formatted = date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      return `
        <li class="log-item" data-entry-id="${entry.id}">
          <span class="log-item__icon">${habit.icon}</span>
          <div class="log-item__info">
            <span class="log-item__name">${entry.displayName}</span>
            <span class="log-item__date">${formatted}</span>
          </div>
        </li>
      `;
    })
    .join("");

  logList.querySelectorAll(".log-item").forEach((item) => {
    item.addEventListener("click", () => {
      const entry = logs.find((l) => l.id === item.dataset.entryId);
      if (!entry) return;
      const habit = resolveHabit(entry.habitId, entry.customName);
      if (HABITS[entry.habitId]) selectPresetHabit(entry.habitId);
      activateHabit(habit, entry.habitId, false);
    });
  });
}

function updateStats() {
  totalLogsEl.textContent = logs.length;
  currentStreakEl.textContent = calculateStreak();
}

/**
 * Streak = consecutive calendar days with at least one log,
 * counting backward from today (or yesterday if nothing logged today).
 */
function calculateStreak() {
  if (logs.length === 0) return 0;

  const uniqueDays = [...new Set(logs.map((l) => l.date))].sort().reverse();
  const today = todayString();
  const yesterday = offsetDateString(-1);

  let startDay;
  if (uniqueDays.includes(today)) {
    startDay = today;
  } else if (uniqueDays.includes(yesterday)) {
    startDay = yesterday;
  } else {
    return 0;
  }

  let streak = 0;
  let checkDate = startDay;

  while (uniqueDays.includes(checkDate)) {
    streak++;
    checkDate = offsetDateString(-1, new Date(checkDate));
  }

  return streak;
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function offsetDateString(dayOffset, fromDate = new Date()) {
  const d = new Date(fromDate);
  d.setDate(d.getDate() + dayOffset);
  return d.toISOString().slice(0, 10);
}

function saveLogs() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
}

function loadLogs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    logs = raw ? JSON.parse(raw) : [];
  } catch {
    logs = [];
  }
}

function handleClearData() {
  if (!confirm("Clear all logged habits and streak data?")) return;
  logs = [];
  activeHabitId = null;
  saveLogs();
  renderLogList();
  updateStats();
  customHabitInput.value = "";

  habitGrid.querySelectorAll(".habit-card").forEach((card) => {
    card.classList.remove("active");
    card.setAttribute("aria-pressed", "false");
  });

  highlightBrainRegions({});
  scienceContent.innerHTML = `
    <div class="science-placeholder">
      <div class="science-placeholder__icon">🧠</div>
      <h3>Awaiting neural input</h3>
      <p>Choose or log a habit to reveal how it influences neurotransmitters, synaptic strength, and regional brain activity.</p>
    </div>
  `;
  brainStatus.textContent = "Select or log a habit to activate regions";
}

init();
