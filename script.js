document.addEventListener('DOMContentLoaded', () => {
  // --- DOM Elements ---
  const timeLeftDisplay = document.getElementById('time-left');
  const timerModeDisplay = document.getElementById('timer-mode');
  const startPauseButton = document.getElementById('start-pause-button');
  const skipButton = document.getElementById('skip-button');
  const resetButton = document.getElementById('reset-button');
  const settingsButton = document.getElementById('settings-button');
  const taskInput = document.getElementById('task-input');
  const addTaskButton = document.getElementById('add-task-button');
  const taskList = document.getElementById('task-list');
  const settingsModal = document.getElementById('settings-modal');
  const closeButton = document.querySelector('.close-button');
  const workDurationInput = document.getElementById('work-duration');
  const shortBreakDurationInput = document.getElementById(
    'short-break-duration'
  );
  const longBreakDurationInput = document.getElementById(
    'long-break-duration'
  );
  const saveSettingsButton = document.getElementById('save-settings-button');

  // --- Timer State ---
  let timerInterval = null;
  let currentMode = 'work'; // 'work', 'shortBreak', 'longBreak'
  let timeLeft = 25 * 60; // Default work time in seconds, will be updated by settings
  let isPaused = true;
  let pomodoroCount = 0;

  // --- Settings ---
  let settings = {
    workDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
  };

  // --- Audio ---
  // NOTE: Ensure these audio files exist in the same directory or provide correct paths
  // Consider adding controls to mute sounds in settings later.
  const workEndSound = new Audio('work_end.mp3');
  const shortBreakSound = new Audio('short_break.mp3');
  const longBreakSound = new Audio('long_break.mp3');
  workEndSound.onerror = () =>
    console.error('Error loading work_end.mp3');
  shortBreakSound.onerror = () =>
    console.error('Error loading short_break.mp3');
  longBreakSound.onerror = () =>
    console.error('Error loading long_break.mp3');

  function playSound(type = 'work') {
    workEndSound.pause();
    workEndSound.currentTime = 0;
    shortBreakSound.pause();
    shortBreakSound.currentTime = 0;
    longBreakSound.pause();
    longBreakSound.currentTime = 0;
    try {
      if (type === 'work') {
        workEndSound.play();
      } else if (type === 'shortBreak') {
        shortBreakSound.play();
      } else { // longBreak
        longBreakSound.play();
      }
    } catch (error) {
      console.error('Error playing sound:', error);
      // Inform user sound could not be played? Maybe only if sounds are enabled.
    }
  }

  // --- Timer Functions ---
  function updateDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timeLeftDisplay.textContent = `${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    startPauseButton.innerHTML = isPaused
      ? '<i class="fas fa-play"></i> Start'
      : '<i class="fas fa-pause"></i> Pause';

    let modeText = 'Work';
    if (currentMode === 'shortBreak') modeText = 'Short Break';
    else if (currentMode === 'longBreak') modeText = 'Long Break';
    timerModeDisplay.textContent = modeText;

    document.title = `${timeLeftDisplay.textContent} - ${modeText}`;
  }

  function switchMode(mode) {
    currentMode = mode;
    isPaused = true;
    clearInterval(timerInterval);
    timerInterval = null;

    if (mode === 'work') timeLeft = settings.workDuration * 60;
    else if (mode === 'shortBreak')
      timeLeft = settings.shortBreakDuration * 60;
    else timeLeft = settings.longBreakDuration * 60; // longBreak

    updateDisplay();
  }

  function startTimer() {
    if (isPaused) {
      isPaused = false;
      updateDisplay(); // Update button text immediately
      timerInterval = setInterval(() => {
        timeLeft--;
        if (timeLeft < 0) {
          clearInterval(timerInterval);
          timerInterval = null;
          playSound(currentMode); // Play sound based on mode that just finished
          handleTimerCompletion();
        } else {
          updateDisplay();
        }
      }, 1000);
    }
  }

  function pauseTimer() {
    if (!isPaused) {
      isPaused = true;
      clearInterval(timerInterval);
      timerInterval = null;
      updateDisplay(); // Update button text immediately
    }
  }

  function resetTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    isPaused = true; // Ensure timer is paused
    // Reset time based on the current mode selected
    switchMode(currentMode); // This also calls updateDisplay()
  }

  function handleTimerCompletion(skipped = false) {
    if (currentMode === 'work') {
      pomodoroCount++;
      if (pomodoroCount % 4 === 0) { // Every 4 work sessions, take a long break
         switchMode('longBreak');
      } else {
         switchMode('shortBreak');
      }
    } else { // If a break finished
      switchMode('work');
    }
    // Sound is handled *before* calling this function if not skipped
    // Auto-start next timer? Optional feature, currently requires manual start.
  }

  function skipTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    isPaused = true; // Stop the timer
    // No sound played when skipping
    handleTimerCompletion(true); // Pass skipped flag
  }


  // --- To-Do List Section (NEW CODE) ---
  let tasks = [];
  /* Task structure:
    {
      id: number,
      text: string,
      completed: boolean,
      isExpanded: boolean, // For main tasks
      subtasks: [         // For main tasks
        { id: number, text: string, completed: boolean },
      ]
    }
  */

  // Generate unique IDs
  let nextTaskId = 0;
  function getNextId() {
    const storedId = localStorage.getItem('nextTaskId');
    if (storedId) {
      // Ensure nextTaskId is always greater than the stored value
      nextTaskId = Math.max(nextTaskId, parseInt(storedId, 10));
    }
    const id = nextTaskId;
    nextTaskId++;
    localStorage.setItem('nextTaskId', nextTaskId.toString());
    return id;
  }

  // Find task or subtask by ID
  function findTaskById(id, parentId = null) {
    if (parentId !== null) {
      const parentTask = tasks.find(task => task.id === parentId);
      if (parentTask && parentTask.subtasks) {
        const subtask = parentTask.subtasks.find(sub => sub.id === id);
        return { task: subtask, parentTask: parentTask };
      }
    } else {
      const task = tasks.find(task => task.id === id);
      return { task: task, parentTask: null };
    }
    return { task: null, parentTask: null };
  }

  // Render all tasks
 function renderTasks() {
  taskList.innerHTML = ''; // Clear existing list

  console.log("Rendering tasks. Current tasks data:", tasks); // <-- ADD THIS LINE

  tasks.forEach((task) => { // Only iterate through main tasks
    taskList.appendChild(createTaskElement(task));
  });

  saveTasks(); // Save state after every render
}

  // Create HTML element for a single task or subtask
  function createTaskElement(task, parentId = null) {
    const li = document.createElement('li');
    li.classList.add('task-item');
    li.dataset.id = task.id;

    if (parentId !== null) {
      li.classList.add('subtask-item');
      li.dataset.parentId = parentId;
    } else {
      // Only main tasks are draggable for now (pending rewrite for nesting)
      li.draggable = true;
      li.addEventListener('dragstart', handleDragStart);
      li.addEventListener('dragover', handleDragOver);
      li.addEventListener('dragenter', handleDragEnter);
      li.addEventListener('dragleave', handleDragLeave);
      li.addEventListener('drop', handleDrop);
      li.addEventListener('dragend', handleDragEnd);
    }

    if (task.completed) {
      li.classList.add('completed');
    }

    // Task Content (Icon, Checkbox, Text)
    const taskContent = document.createElement('div');
    taskContent.classList.add('task-content');

    const hasSubtasks = task.subtasks && task.subtasks.length > 0;
    if (!parentId && hasSubtasks) { // Only main tasks can have subtasks/toggle
      li.classList.add('has-subtasks');
      if (task.isExpanded) {
        li.classList.add('expanded');
      }
      const toggleIcon = document.createElement('i');
      toggleIcon.classList.add('fas', 'fa-caret-right', 'toggle-subtasks');
      toggleIcon.addEventListener('click', handleToggleSubtasks);
      taskContent.appendChild(toggleIcon);
    }

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.classList.add('task-checkbox');
    checkbox.checked = task.completed;
    checkbox.addEventListener('change', handleToggleComplete);
    taskContent.appendChild(checkbox);

    const taskTextSpan = document.createElement('span');
    taskTextSpan.classList.add('task-text');
    taskTextSpan.textContent = task.text;
    taskTextSpan.addEventListener('click', handleInitiateEdit);
    taskContent.appendChild(taskTextSpan);

    li.appendChild(taskContent);

    // Task Actions (Add Subtask, Edit, Delete)
    const taskActions = document.createElement('div');
    taskActions.classList.add('task-actions');

    if (parentId === null) { // Add Subtask button only for main tasks
      const addSubtaskButton = document.createElement('button');
      addSubtaskButton.classList.add('add-subtask-button');
      addSubtaskButton.title = 'Add Subtask';
      addSubtaskButton.innerHTML = '<i class="fas fa-plus-circle"></i>';
      addSubtaskButton.addEventListener('click', handleAddSubtask);
      taskActions.appendChild(addSubtaskButton);
    }

    const editButton = document.createElement('button');
    editButton.classList.add('edit-button');
    editButton.innerHTML = '<i class="fas fa-edit"></i>';
    editButton.addEventListener('click', handleInitiateEdit);
    taskActions.appendChild(editButton);

    const deleteButton = document.createElement('button');
    deleteButton.classList.add('delete-button');
    deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
    deleteButton.addEventListener('click', handleDeleteTask);
    taskActions.appendChild(deleteButton);

    li.appendChild(taskActions);

    // Nested Subtask List
    if (!parentId && hasSubtasks) {
      const subtaskList = document.createElement('ul');
      subtaskList.classList.add('subtask-list');
      task.subtasks.forEach(subtask => {
        subtaskList.appendChild(createTaskElement(subtask, task.id));
      });
      li.appendChild(subtaskList);
    }

    return li;
  }

  // Add a new main task
  function addTask() {
    const text = taskInput.value.trim();
    if (text) {
      const newTask = {
        id: getNextId(),
        text: text,
        completed: false,
        isExpanded: false, // Default state for new main tasks
        subtasks: []       // Default state for new main tasks
      };
      tasks.push(newTask);
      taskInput.value = ''; // Clear input
      renderTasks(); // Re-render the entire list
    }
  }

  // Event Handlers for Task Actions
 function handleToggleSubtasks(event) {
    console.log("Toggle clicked!"); // <-- Log: Check if function is entered
    const taskItem = event.target.closest('.task-item');
    if (!taskItem) {
         console.error("Could not find parent task item for toggle."); // <-- Log: Error if parent <li> not found
         return;
    }
    const taskId = parseInt(taskItem.dataset.id, 10);
    console.log("Task ID:", taskId); // <-- Log: Check if Task ID is read correctly

    const { task } = findTaskById(taskId);
    console.log("Found task object:", task); // <-- Log: Check if task object is found

    if (task) {
        task.isExpanded = !task.isExpanded;
        console.log("Toggled isExpanded to:", task.isExpanded); // <-- Log: Check new expanded state
        taskItem.classList.toggle('expanded');
        console.log("Toggled 'expanded' class on element."); // <-- Log: Confirm class toggle happened
        saveTasks(); // Persist the state
    } else {
         console.error("Task object not found for ID:", taskId); // <-- Log: Error if task data not found
    }
}

  function handleAddSubtask(event) {
    const taskItem = event.target.closest('.task-item');
    const parentId = parseInt(taskItem.dataset.id, 10);
    const { task: parentTask } = findTaskById(parentId); // Find main task

    if (parentTask) {
      const subtaskText = prompt('Enter subtask text:');
      if (subtaskText && subtaskText.trim()) {
        const newSubtask = {
          id: getNextId(),
          text: subtaskText.trim(),
          completed: false
          // Subtasks don't have their own subtasks or expanded state
        };
        parentTask.subtasks = parentTask.subtasks || []; // Ensure array exists
        parentTask.subtasks.push(newSubtask);
        // Expand parent if adding a subtask
        if (!parentTask.isExpanded) {
          parentTask.isExpanded = true;
        }
        renderTasks(); // Re-render to show the new subtask and expanded parent
      }
    }
  }

  function handleToggleComplete(event) {
    const taskItem = event.target.closest('.task-item');
    const id = parseInt(taskItem.dataset.id, 10);
    const parentId = taskItem.dataset.parentId ? parseInt(taskItem.dataset.parentId, 10) : null;
    const { task } = findTaskById(id, parentId);

    if (task) {
      task.completed = !task.completed;
      // Optional: Auto-complete parent/children logic could go here
      renderTasks(); // Re-render to update styles
    }
  }

  function handleDeleteTask(event) {
    
  const taskItem = event.target.closest('.task-item');
  const id = parseInt(taskItem.dataset.id, 10);
  const parentId = taskItem.dataset.parentId ? parseInt(taskItem.dataset.parentId, 10) : null;
  const { task, parentTask } = findTaskById(id, parentId);

  // Keep this check to prevent errors if task somehow doesn't exist
  if (task) {
      // --- Confirmation Removed ---
      // The code that was inside the confirm() check now runs directly

      if (parentId !== null && parentTask) {
          // Delete subtask
          parentTask.subtasks = parentTask.subtasks.filter(sub => sub.id !== id);
      } else {
          // Delete main task (and its subtasks are implicitly gone)
          tasks = tasks.filter(t => t.id !== id);
      }
      renderTasks(); // Re-render after deletion
      // --- End of Removed Confirmation Block ---
  }
}

  function handleInitiateEdit(event) {
    const taskItem = event.target.closest('.task-item');
    const id = parseInt(taskItem.dataset.id, 10);
    const parentId = taskItem.dataset.parentId ? parseInt(taskItem.dataset.parentId, 10) : null;
    const taskTextSpan = taskItem.querySelector('.task-text');

    // Prevent starting edit if already editing this item or text span not found
    if (!taskTextSpan || taskItem.querySelector('.edit-task-input')) {
      return;
    }

    const { task } = findTaskById(id, parentId);
    if (!task) return;

    const currentText = task.text;
    const taskContentDiv = taskItem.querySelector('.task-content');

    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentText;
    input.classList.add('edit-task-input');
    input.style.flexGrow = '1'; // Adapt to available space

    taskContentDiv.replaceChild(input, taskTextSpan);
    input.focus();
    input.select(); // Select text for easy replacement

    const saveEdit = () => {
      // Input might be removed by renderTasks before blur finishes
      if (!document.body.contains(input)) return;

      const newText = input.value.trim();
      const { task: taskToUpdate } = findTaskById(id, parentId); // Re-fetch task data

      if (taskToUpdate) { // Check if task still exists
        if (newText && newText !== currentText) {
          taskToUpdate.text = newText;
        }
        // Always re-render to switch back to span and save changes (or revert if text empty)
        renderTasks();
      } else {
         // Task was deleted while editing, just remove input cleanly if possible
         if(input.parentNode) {
             input.parentNode.replaceChild(taskTextSpan, input); // Put original span back temporarily
         }
         renderTasks(); // Re-render anyway to clean up
      }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            input.blur(); // Trigger saveEdit via blur listener
        } else if (e.key === 'Escape') {
            // Remove listeners before re-rendering to avoid calling saveEdit on blur
            input.removeEventListener('blur', saveEdit);
            input.removeEventListener('keydown', handleKeyDown);
            renderTasks(); // Re-render to cancel edit
        }
    };

    input.addEventListener('blur', saveEdit);
    input.addEventListener('keydown', handleKeyDown);
  }

  // --- Drag and Drop Handlers ---
  // !!! WARNING: These handlers are NOT updated for nested structure !!!
  // They will only work correctly for reordering MAIN tasks.
  // Reordering subtasks or moving tasks between levels requires significant rewrite.
  let draggedItem = null; // Store the actual task object being dragged

  function handleDragStart(e) {
      const taskId = parseInt(this.dataset.id, 10);
      const { task } = findTaskById(taskId);
      if (task) {
          draggedItem = task; // Store the task object
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', taskId); // Still useful for identification
          setTimeout(() => this.classList.add('dragging'), 0);
      } else {
          e.preventDefault(); // Prevent dragging if task not found
      }
  }

  function handleDragOver(e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      // Optional visual cue on the element being hovered over
      // Avoid adding if it's a subtask list or itself? Needs logic.
      // Example: Only add if hovering over another main task item?
      const targetItem = e.target.closest('.task-item:not(.subtask-item)');
      if (targetItem && targetItem !== this) {
          // Simple visual cue for now
          targetItem.classList.add('drag-over');
      }
  }

  function handleDragEnter(e) {
      e.preventDefault();
       const targetItem = e.target.closest('.task-item:not(.subtask-item)');
       if (targetItem && targetItem !== this) {
            targetItem.classList.add('drag-over');
       }
  }

  function handleDragLeave(e) {
      // Remove visual cue when dragging leaves the element or its children
       const relatedTarget = e.relatedTarget;
       const targetItem = e.target.closest('.task-item');
       if (targetItem && (!relatedTarget || !targetItem.contains(relatedTarget))) {
            targetItem.classList.remove('drag-over');
       }
       // Clean up any stragglers
       if (!relatedTarget) {
            document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
       }
  }

  function handleDrop(e) {
      e.preventDefault();
      e.stopPropagation(); // Prevent parent handlers if nested

      const targetItemElement = e.target.closest('.task-item:not(.subtask-item)'); // Ensure drop target is main task
      if (!targetItemElement) return; // Exit if not dropping on a valid main task item

      targetItemElement.classList.remove('drag-over');

      const droppedOnTaskId = parseInt(targetItemElement.dataset.id, 10);
      const draggedTaskId = draggedItem ? draggedItem.id : null;

      if (draggedTaskId !== null && draggedTaskId !== droppedOnTaskId) {
          const draggedIndex = tasks.findIndex(t => t.id === draggedTaskId);
          const targetIndex = tasks.findIndex(t => t.id === droppedOnTaskId);

          if (draggedIndex > -1 && targetIndex > -1) {
              // Remove the dragged item
              const itemToMove = tasks.splice(draggedIndex, 1)[0];
              // Insert it at the target index
              tasks.splice(targetIndex, 0, itemToMove);
              renderTasks(); // Re-render the list
          }
      }
  }

  function handleDragEnd(e) {
      // Clean up visual styles from all items
      const items = taskList.querySelectorAll('.task-item');
      items.forEach(item => item.classList.remove('dragging', 'drag-over'));
      draggedItem = null; // Reset the stored dragged item
  }


  // --- Persistence (Local Storage) ---
  function saveTasks() {
    localStorage.setItem('pomodoroTasks', JSON.stringify(tasks));
    // Save nextTaskId as well to prevent reuse after reload
    localStorage.setItem('nextTaskId', nextTaskId.toString());
  }

  function loadTasks() {
    const storedTasks = localStorage.getItem('pomodoroTasks');
    if (storedTasks) {
      let loadedTasks = JSON.parse(storedTasks);
      // Ensure tasks have necessary properties (backward compatibility)
      tasks = loadedTasks.map(task => ({
        id: task.id, // Assume ID exists from previous save logic
        text: task.text ?? '',
        completed: task.completed ?? false,
        isExpanded: task.isExpanded ?? false,
        subtasks: (task.subtasks ?? []).map(sub => ({
          id: sub.id,
          text: sub.text ?? '',
          completed: sub.completed ?? false,
        }))
      }));
    } else {
      tasks = []; // Initialize if nothing is stored
    }

    // Ensure nextTaskId is initialized correctly after loading all IDs
    let maxId = -1;
    tasks.forEach(task => {
      if (task.id > maxId) maxId = task.id;
      if (task.subtasks) {
        task.subtasks.forEach(sub => {
          if (sub.id > maxId) maxId = sub.id;
        });
      }
    });
    // Use Math.max to ensure nextTaskId is at least 0 and greater than highest found ID
    // Also consider stored nextTaskId if it's higher (e.g., after deleting highest ID task)
    const storedNextId = localStorage.getItem('nextTaskId');
    nextTaskId = Math.max(maxId + 1, storedNextId ? parseInt(storedNextId, 10) : 0);
    // Do not save nextTaskId here, getNextId handles saving when it's used.

    renderTasks(); // Render tasks after loading
  }

  function saveSettings() {
    localStorage.setItem('pomodoroSettings', JSON.stringify(settings));
  }

  function loadSettings() {
    const storedSettings = localStorage.getItem('pomodoroSettings');
    if (storedSettings) {
      settings = JSON.parse(storedSettings);
      // Add validation/defaults for loaded settings if needed
      settings.workDuration = settings.workDuration || 25;
      settings.shortBreakDuration = settings.shortBreakDuration || 5;
      settings.longBreakDuration = settings.longBreakDuration || 15;
    }
    // Update input fields in the modal
    workDurationInput.value = settings.workDuration;
    shortBreakDurationInput.value = settings.shortBreakDuration;
    longBreakDurationInput.value = settings.longBreakDuration;

    // Apply loaded settings to the timer if it's currently paused
    if (isPaused) {
       resetTimer(); // Reset timer to reflect potentially new durations
    }
  }

  // --- Settings Modal ---
  function openSettingsModal() {
    // Ensure modal reflects current settings when opened
    workDurationInput.value = settings.workDuration;
    shortBreakDurationInput.value = settings.shortBreakDuration;
    longBreakDurationInput.value = settings.longBreakDuration;
    settingsModal.style.display = 'flex';
  }

  function closeSettingsModal() {
    settingsModal.style.display = 'none';
  }

  function applySettings() {
    const newWork = parseInt(workDurationInput.value, 10);
    const newShort = parseInt(shortBreakDurationInput.value, 10);
    const newLong = parseInt(longBreakDurationInput.value, 10);

    // Basic validation
    if (isNaN(newWork) || newWork < 1) {
      alert('Work duration must be at least 1 minute.');
      workDurationInput.value = settings.workDuration; return;
    }
    if (isNaN(newShort) || newShort < 1) {
      alert('Short break duration must be at least 1 minute.');
      shortBreakDurationInput.value = settings.shortBreakDuration; return;
    }
    if (isNaN(newLong) || newLong < 1) {
      alert('Long break duration must be at least 1 minute.');
      longBreakDurationInput.value = settings.longBreakDuration; return;
    }

    // Update settings object
    settings.workDuration = newWork;
    settings.shortBreakDuration = newShort;
    settings.longBreakDuration = newLong;

    saveSettings(); // Save to local storage
    closeSettingsModal(); // Close modal

    // Apply new settings immediately only if timer is paused on the mode being changed
    // Or more simply, just reset the timer to the current mode with new duration if paused
    if (isPaused) {
      resetTimer();
    }
  }

  // --- Event Listeners (Global) ---
  startPauseButton.addEventListener('click', () => {
    if (isPaused) {
        startTimer();
    } else {
        pauseTimer();
    }
  });
  skipButton.addEventListener('click', skipTimer);
  resetButton.addEventListener('click', resetTimer);
  settingsButton.addEventListener('click', openSettingsModal);

  // Task adding listeners
  addTaskButton.addEventListener('click', addTask);
  taskInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        addTask();
    }
  });

  // Settings Modal listeners
  closeButton.addEventListener('click', closeSettingsModal);
  saveSettingsButton.addEventListener('click', applySettings);
  // Close modal if clicking outside of it
  window.addEventListener('click', (event) => {
    if (event.target === settingsModal) {
        closeSettingsModal();
    }
  });

  // --- Initialization ---
  loadSettings(); // Load settings first to set timer durations
  loadTasks();    // Load tasks (calls renderTasks)
  updateDisplay(); // Initial display update for the timer

}); // End of DOMContentLoaded
