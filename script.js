const taskInput = document.querySelector('#taskInput');
const taskForm = document.querySelector('#taskForm');
const addTaskButton = document.querySelector('#addTaskButton');
const taskList = document.querySelector('#taskList');
const taskBalls = document.querySelector('#taskBalls');
const emptyMachine = document.querySelector('#emptyMachine');
const taskCounter = document.querySelector('#taskCounter');
const grabButton = document.querySelector('#grabButton');
const clawRig = document.querySelector('#clawRig');
const machineMessage = document.querySelector('#machineMessage');
const mission = document.querySelector('#mission');
const missionText = document.querySelector('#missionText');
const doneScore = document.querySelector('#doneScore');
const toast = document.querySelector('#toast');
const ticketScore = document.querySelector('#ticketScore');
const ticketProgressText = document.querySelector('#ticketProgressText');
const ticketProgressBar = document.querySelector('#ticketProgressBar');
const prizeModal = document.querySelector('#prizeModal');
const streakStatus = document.querySelector('#streakStatus');
const ticketStatus = document.querySelector('#ticketStatus');
const streakItems = document.querySelector('#streakItems');
const ticketItems = document.querySelector('#ticketItems');

let tasks = JSON.parse(localStorage.getItem('task-grabber-tasks') || '[]');
let completed = Number(localStorage.getItem('task-grabber-score') || 0);
let tickets = Number(localStorage.getItem('task-grabber-tickets') || 0);
let prizesWon = Number(localStorage.getItem('task-grabber-prizes') || 0);
let streak = Number(localStorage.getItem('task-grabber-streak') || 0);
let dayKey = localStorage.getItem('task-grabber-day-key') || '';
let dailyTotal = Number(localStorage.getItem('task-grabber-daily-total') || 0);
let dailyCompleted = Number(localStorage.getItem('task-grabber-daily-completed') || 0);
let streakAwardedDay = localStorage.getItem('task-grabber-streak-awarded') || '';
let ownedRewards = JSON.parse(localStorage.getItem('task-grabber-owned-rewards') || '[]');
let activeTask = null;
let isGrabbing = false;
let clawPosition = 48;
let targetPosition = 48;
let movementFrame = null;

const ballPositions = [[4,58],[25,34],[48,57],[70,32],[12,12],[39,5],[65,7],[78,61]];
const TICKETS_PER_TASK = 20;
const PRIZE_COST = 100;
const streakRewards = [{id:'aurora',icon:'🌌',name:'AURORA NEON',need:3},{id:'void',icon:'🪐',name:'COSMIC VOID',need:7},{id:'crown',icon:'👑',name:'GOLDEN CROWN',need:14}];
const ticketRewards = [{id:'ticket-break',icon:'🕹️',name:'BONUS ROUND',cost:50},{id:'ticket-snack',icon:'🍿',name:'SNACK POWER-UP',cost:120},{id:'ticket-star',icon:'⭐',name:'ARCADE ALL-STAR',cost:200}];
const prizes = [
  { emoji: '👑', name: 'FOCUS CHAMPION', copy: 'Wear the crown—you conquered five missions!' },
  { emoji: '🕹️', name: 'BONUS ROUND', copy: 'You earned a guilt-free 15 minute game break.' },
  { emoji: '🍿', name: 'SNACK POWER-UP', copy: 'Redeem this prize for your favorite snack.' },
  { emoji: '🎵', name: 'DJ MODE', copy: 'Pick the music for your next productivity session.' },
  { emoji: '⭐', name: 'ARCADE ALL-STAR', copy: 'A shiny badge for showing your tasks who is boss.' }
];

function save() {
  localStorage.setItem('task-grabber-tasks', JSON.stringify(tasks));
  localStorage.setItem('task-grabber-score', completed);
  localStorage.setItem('task-grabber-tickets', tickets);
  localStorage.setItem('task-grabber-prizes', prizesWon);
  localStorage.setItem('task-grabber-streak', streak);
  localStorage.setItem('task-grabber-day-key', dayKey);
  localStorage.setItem('task-grabber-daily-total', dailyTotal);
  localStorage.setItem('task-grabber-daily-completed', dailyCompleted);
  localStorage.setItem('task-grabber-streak-awarded', streakAwardedDay);
  localStorage.setItem('task-grabber-owned-rewards', JSON.stringify(ownedRewards));
}

function renderRewards() {
  streakStatus.textContent = `${streak} DAY STREAK`;
  ticketStatus.textContent = `${String(tickets).padStart(3,'0')} TICKETS`;
  streakItems.innerHTML = streakRewards.map(item => `<article class="reward-card"><b>${item.icon}</b><h3>${item.name}</h3><p>Unlock at a ${item.need}-day streak.</p><button data-reward="${item.id}" ${streak < item.need || ownedRewards.includes(item.id) ? 'disabled' : ''}>${ownedRewards.includes(item.id) ? 'UNLOCKED' : `🔥 ${item.need} DAYS`}</button></article>`).join('');
  ticketItems.innerHTML = ticketRewards.map(item => `<article class="reward-card"><b>${item.icon}</b><h3>${item.name}</h3><p>Trade tickets for this reward.</p><button data-ticket="${item.id}" ${tickets < item.cost || ownedRewards.includes(item.id) ? 'disabled' : ''}>${ownedRewards.includes(item.id) ? 'CLAIMED' : `🎟 ${item.cost} TICKETS`}</button></article>`).join('');
  streakItems.querySelectorAll('[data-reward]').forEach(button => button.addEventListener('click', () => buyStreakReward(button.dataset.reward)));
  ticketItems.querySelectorAll('[data-ticket]').forEach(button => button.addEventListener('click', () => buyTicketReward(button.dataset.ticket)));
}
function buyStreakReward(id) { const item = streakRewards.find(x => x.id === id); if (!item || streak < item.need) return; ownedRewards.push(id); save(); render(); showToast(`${item.name} UNLOCKED!`); }
function buyTicketReward(id) { const item = ticketRewards.find(x => x.id === id); if (!item || Number(tickets) < Number(item.cost)) return; tickets = Number(tickets) - Number(item.cost); ownedRewards.push(id); save(); render(); showToast(`${item.name} CLAIMED!`); }

function render() {
  const now = new Date().toISOString().slice(0,10);
  if (dayKey !== now) { dailyTotal = 0; dailyCompleted = 0; dayKey = now; }
  taskList.innerHTML = '';
  taskBalls.innerHTML = '';
  tasks.forEach((task, index) => {
    const row = document.createElement('div');
    row.className = 'task-item';
    row.innerHTML = `<i></i><span></span><button type="button" aria-label="Remove task">×</button>`;
    row.querySelector('span').textContent = `Mystery task ${index + 1} loaded`;
    row.querySelector('button').addEventListener('click', () => removeTask(index));
    taskList.appendChild(row);

    const ball = document.createElement('div');
    ball.className = 'ball';
    ball.setAttribute('aria-label', `Mystery task ${index + 1}`);
    ball.style.left = `${ballPositions[index][0]}%`;
    ball.style.top = `${ballPositions[index][1]}%`;
    ball.style.zIndex = index + 2;
    taskBalls.appendChild(ball);
  });
  taskCounter.textContent = `${tasks.length} / 8`;
  emptyMachine.hidden = tasks.length > 0;
  grabButton.disabled = tasks.length === 0 || isGrabbing || activeTask !== null;
  machineMessage.textContent = tasks.length ? (activeTask ? 'MISSION ACTIVE' : 'CLAW READY') : 'INSERT TASKS';
  doneScore.textContent = String(completed).padStart(2, '0');
  ticketScore.textContent = String(tickets).padStart(3, '0');
  ticketProgressText.textContent = `${tickets} / ${PRIZE_COST}`;
  ticketProgressBar.style.width = `${Math.min(100, (tickets / PRIZE_COST) * 100)}%`;
  renderRewards();
  save();
}

function unlockPrize() {
  const prize = prizes[Math.floor(Math.random() * prizes.length)];
  prizesWon += 1;
  document.querySelector('#prizeEmoji').textContent = prize.emoji;
  document.querySelector('#prizeName').textContent = prize.name;
  document.querySelector('#prizeCopy').textContent = prize.copy;
  prizeModal.hidden = false;
  save();
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2100);
}

function removeTask(index) {
  if (isGrabbing) return;
  tasks.splice(index, 1);
  render();
}

function addTask() {
  const value = taskInput.value.trim();
  if (!value) return;
  if (tasks.length >= 8) return showToast('MACHINE FULL!');
  tasks.push(value);
  dailyTotal += 1;
  taskInput.value = '';
  render();
  showToast('TASK LOADED!');
}
window.addTask = addTask;

taskForm.addEventListener('submit', event => {
  event.preventDefault();
  addTask();
});
addTaskButton.addEventListener('click', addTask);

document.querySelector('#loadButton').addEventListener('click', () => {
  document.querySelector('#taskPanel').scrollIntoView({ behavior: 'smooth', block: 'center' });
  setTimeout(() => taskInput.focus(), 650);
});

grabButton.addEventListener('click', () => {
  if (!tasks.length || isGrabbing || activeTask) return;
  isGrabbing = true;
  const weighted = tasks.map((_, index) => ({
    index,
    distance: Math.abs((ballPositions[index][0] + 7) - clawPosition) + Math.random() * 17
  }));
  weighted.sort((a, b) => a.distance - b.distance);
  const index = weighted[0].index;
  machineMessage.textContent = 'TARGET LOCKED';
  grabButton.disabled = true;
  setTimeout(() => clawRig.classList.add('dropping'), 180);
  setTimeout(() => {
    activeTask = tasks.splice(index, 1)[0];
    render();
    missionText.textContent = activeTask;
    mission.hidden = false;
    machineMessage.textContent = 'PRIZE WON!';
    clawRig.classList.remove('dropping');
    isGrabbing = false;
    mission.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 1850);
});

function animateClaw() {
  const difference = targetPosition - clawPosition;
  if (Math.abs(difference) < .04) {
    clawPosition = targetPosition;
    clawRig.style.left = `${clawPosition}%`;
    movementFrame = null;
    return;
  }
  clawPosition += difference * .16;
  clawRig.style.left = `${clawPosition}%`;
  movementFrame = requestAnimationFrame(animateClaw);
}

function moveClaw(position) {
  if (isGrabbing || activeTask) return;
  targetPosition = Math.max(2, Math.min(82, position));
  document.querySelector('#moveHint').classList.add('hidden');
  machineMessage.textContent = 'AIM THE CLAW';
  if (!movementFrame) movementFrame = requestAnimationFrame(animateClaw);
}

function nudgeClaw(amount) { moveClaw(targetPosition + amount); }

document.querySelector('#moveLeft').addEventListener('click', () => nudgeClaw(-9));
document.querySelector('#moveRight').addEventListener('click', () => nudgeClaw(9));

const glass = document.querySelector('#glass');
let isDraggingClaw = false;

function moveClawToPointer(event) {
  const bounds = glass.getBoundingClientRect();
  moveClaw(((event.clientX - bounds.left) / bounds.width) * 100 - 8);
}

glass.addEventListener('pointerdown', event => {
  isDraggingClaw = true;
  glass.setPointerCapture(event.pointerId);
  moveClawToPointer(event);
});
glass.addEventListener('pointermove', event => {
  if (isDraggingClaw) moveClawToPointer(event);
});
glass.addEventListener('pointerup', () => { isDraggingClaw = false; });
glass.addEventListener('pointercancel', () => { isDraggingClaw = false; });

document.addEventListener('keydown', event => {
  if (document.activeElement === taskInput) return;
  if (event.key === 'ArrowLeft') { event.preventDefault(); nudgeClaw(-6); }
  if (event.key === 'ArrowRight') { event.preventDefault(); nudgeClaw(6); }
  if ((event.key === ' ' || event.key === 'Enter') && !grabButton.disabled) {
    event.preventDefault();
    grabButton.click();
  }
});

document.querySelector('#completeButton').addEventListener('click', () => {
  if (!activeTask) return;
  completed += 1;
  tickets += TICKETS_PER_TASK;
  dailyCompleted += 1;
  if (dailyTotal > 0 && dailyCompleted >= dailyTotal && streakAwardedDay !== dayKey) { streak += 1; streakAwardedDay = dayKey; showToast(`🔥 ${streak} DAY STREAK!`); }
  activeTask = null;
  mission.hidden = true;
  render();
  showToast(`+${TICKETS_PER_TASK} TICKETS! NICE WORK!`);
  if (tickets >= PRIZE_COST) {
    setTimeout(() => {
      tickets -= PRIZE_COST;
      render();
      unlockPrize();
    }, 850);
  }
});

document.querySelector('#claimPrize').addEventListener('click', () => {
  prizeModal.hidden = true;
  showToast(`PRIZE #${prizesWon} CLAIMED!`);
});

document.querySelector('#skipButton').addEventListener('click', () => {
  if (!activeTask) return;
  if (tasks.length < 8) tasks.push(activeTask);
  activeTask = null;
  mission.hidden = true;
  render();
  showToast('TASK RETURNED');
});

render();
