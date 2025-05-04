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
      let timeLeft = 25 * 60; // Default work time in seconds
      let isPaused = true;
      let pomodoroCount = 0;

      // --- Settings ---
      let settings = {
        workDuration: 25,
        shortBreakDuration: 5,
        longBreakDuration: 15,
      };

      // --- Audio ---
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
          } else {
            longBreakSound.play();
          }
        } catch (error) {
          console.error('Error playing sound:', error);
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
        else timeLeft = settings.longBreakDuration * 60;
        updateDisplay();
      }

      function startTimer() {
        if (isPaused) {
          isPaused = false;
          updateDisplay();
          timerInterval = setInterval(() => {
            timeLeft--;
            if (timeLeft < 0) {
              clearInterval(timerInterval);
              timerInterval = null;
              playSound(currentMode);
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
          updateDisplay();
        }
      }

      function resetTimer() {
        clearInterval(timerInterval);
        timerInterval = null;
        switchMode(currentMode);
      }

      function handleTimerCompletion(skipped = false) {
        if (currentMode === 'work') {
          pomodoroCount++;
          if (pomodoroCount % 4 === 0) switchMode('longBreak');
          else switchMode('shortBreak');
        } else {
          switchMode('work');
        }
        // Sound is handled before calling this function if not skipped
      }

      function skipTimer() {
        clearInterval(timerInterval);
        timerInterval = null;
        isPaused = true;
        handleTimerCompletion(true);
      }

      // --- To-Do List Functions ---
      let tasks = []; // Structure: [{ id: number, text: string, completed: boolean }]
      let draggedItemIndex = null; // To store the index of the item being dragged

      // Generate unique IDs (simple counter for this example)
      let nextTaskId = 0;
      function getNextId() {
        const storedId = localStorage.getItem('nextTaskId');
        if (storedId) {
          nextTaskId = parseInt(storedId, 10);
        }
        const id = nextTaskId;
        nextTaskId++;
        localStorage.setItem('nextTaskId', nextTaskId.toString());
        return id;
      }

      function renderTasks() {
        taskList.innerHTML = ''; // Clear existing list
        tasks.forEach((task, index) => {
          const li = document.createElement('li');
          li.classList.add('task-item');
          li.dataset.index = index; // Store index for drag/drop
          li.dataset.id = task.id; // Store ID for other operations
          li.draggable = true; // Make the item draggable
          if (task.completed) {
            li.classList.add('completed');
          }

          // Removed up/down buttons
          li.innerHTML = `
            <div class="task-content">
              <input type="checkbox" class="task-checkbox" ${
                task.completed ? 'checked' : ''
              }>
              <span class="task-text">${task.text}</span>
            </div>
            <div class="task-actions">
              <button class="edit-button"><i class="fas fa-edit"></i></button>
              <button class="delete-button"><i class="fas fa-trash"></i></button>
            </div>
          `;

          // Add event listeners for task actions
          const checkbox = li.querySelector('.task-checkbox');
          const taskTextSpan = li.querySelector('.task-text');
          const editButton = li.querySelector('.edit-button');
          const deleteButton = li.querySelector('.delete-button');

          checkbox.addEventListener('change', () => toggleComplete(task.id));
          taskTextSpan.addEventListener('click', () => editTask(task.id, li));
          editButton.addEventListener('click', () => editTask(task.id, li));
          deleteButton.addEventListener('click', () => deleteTask(task.id));

          // Add Drag and Drop Event Listeners
          li.addEventListener('dragstart', handleDragStart);
          li.addEventListener('dragover', handleDragOver);
          li.addEventListener('dragenter', handleDragEnter);
          li.addEventListener('dragleave', handleDragLeave);
          li.addEventListener('drop', handleDrop);
          li.addEventListener('dragend', handleDragEnd);

          taskList.appendChild(li);
        });
        saveTasks(); // Save after every render
      }

      function addTask() {
        const text = taskInput.value.trim();
        if (text) {
          const newTask = {
            id: getNextId(), // Assign a unique ID
            text: text,
            completed: false,
          };
          tasks.push(newTask);
          taskInput.value = ''; // Clear input
          renderTasks();
        }
      }

      // Find task index by ID
      function findTaskIndexById(id) {
        return tasks.findIndex((task) => task.id === id);
      }

      function toggleComplete(id) {
        const index = findTaskIndexById(id);
        if (index > -1) {
          tasks[index].completed = !tasks[index].completed;
          renderTasks(); // Re-render to apply style changes
        }
      }

      function deleteTask(id) {
        tasks = tasks.filter((task) => task.id !== id); // Filter out the task by ID
        renderTasks();
      }

      function editTask(id, listItem) {
        const index = findTaskIndexById(id);
        if (index === -1) return;

        const taskTextSpan = listItem.querySelector('.task-text');
        const currentText = tasks[index].text;

        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentText;
        input.classList.add('edit-task-input');
        input.style.flexGrow = '1';

        const taskContentDiv = listItem.querySelector('.task-content');
        taskContentDiv.replaceChild(input, taskTextSpan);
        input.focus();

        const saveEdit = () => {
          const newText = input.value.trim();
          // Check if the element still exists before trying to replace
          if (listItem.contains(input)) {
            if (newText && newText !== currentText) {
              tasks[index].text = newText;
            }
            // Always re-render to ensure consistency, even if text is unchanged
            renderTasks();
          }
        };

        input.addEventListener('blur', saveEdit);
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            input.blur();
          } else if (e.key === 'Escape') {
             // Check if the element still exists before trying to replace
             if (listItem.contains(input)) {
                // Revert to original text span by re-rendering
                renderTasks();
             }
          }
        });
      }

      // --- Drag and Drop Handlers ---
      function handleDragStart(e) {
        draggedItemIndex = parseInt(this.dataset.index, 10);
        e.dataTransfer.effectAllowed = 'move';
        // Optional: Set data if needed, though index is stored globally here
        // e.dataTransfer.setData('text/plain', draggedItemIndex);
        // Add class for visual feedback
        setTimeout(() => this.classList.add('dragging'), 0); // Timeout helps visibility
      }

      function handleDragOver(e) {
        e.preventDefault(); // Necessary to allow dropping
        e.dataTransfer.dropEffect = 'move';
        // Optional: Add class to target element for visual feedback
        // this.classList.add('drag-over');
      }

      function handleDragEnter(e) {
        e.preventDefault();
        // Add visual cue to the element being hovered over
        this.classList.add('drag-over');
      }

      function handleDragLeave(e) {
        // Remove visual cue when dragging leaves
        this.classList.remove('drag-over');
      }

      function handleDrop(e) {
        e.preventDefault(); // Prevent default browser behavior
        e.stopPropagation(); // Prevent event bubbling

        const droppedOnItemIndex = parseInt(this.dataset.index, 10);
        this.classList.remove('drag-over'); // Clean up visual cue

        if (draggedItemIndex !== null && draggedItemIndex !== droppedOnItemIndex) {
          // Reorder the tasks array
          const itemToMove = tasks.splice(draggedItemIndex, 1)[0];
          tasks.splice(droppedOnItemIndex, 0, itemToMove);

          // Re-render the list to reflect the new order
          renderTasks();
        }
      }

      function handleDragEnd(e) {
        // Clean up: Remove dragging class from all items
        const items = taskList.querySelectorAll('.task-item');
        items.forEach(item => item.classList.remove('dragging', 'drag-over'));
        draggedItemIndex = null; // Reset the dragged item index
      }


      // --- Persistence (Local Storage) ---
      function saveTasks() {
        localStorage.setItem('pomodoroTasks', JSON.stringify(tasks));
      }

      function loadTasks() {
        const storedTasks = localStorage.getItem('pomodoroTasks');
        if (storedTasks) {
          tasks = JSON.parse(storedTasks);
          // Ensure tasks have IDs if loading old data without them
          tasks.forEach(task => {
            if (task.id === undefined) {
              task.id = getNextId();
            }
          });
        } else {
          tasks = []; // Initialize if nothing is stored
        }
        // Ensure nextTaskId is initialized correctly after loading
        let maxId = -1;
        tasks.forEach(task => {
            if (task.id > maxId) maxId = task.id;
        });
        nextTaskId = maxId + 1;
        localStorage.setItem('nextTaskId', nextTaskId.toString());

        renderTasks();
      }

      function saveSettings() {
        localStorage.setItem('pomodoroSettings', JSON.stringify(settings));
      }

      function loadSettings() {
        const storedSettings = localStorage.getItem('pomodoroSettings');
        if (storedSettings) {
          settings = JSON.parse(storedSettings);
        }
        workDurationInput.value = settings.workDuration;
        shortBreakDurationInput.value = settings.shortBreakDuration;
        longBreakDurationInput.value = settings.longBreakDuration;
        if (isPaused) {
          resetTimer();
        }
      }

      // --- Settings Modal ---
      function openSettingsModal() {
        settingsModal.style.display = 'flex';
      }

      function closeSettingsModal() {
        settingsModal.style.display = 'none';
      }

      function applySettings() {
        const newWork = parseInt(workDurationInput.value, 10);
        const newShort = parseInt(shortBreakDurationInput.value, 10);
        const newLong = parseInt(longBreakDurationInput.value, 10);

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

        settings.workDuration = newWork;
        settings.shortBreakDuration = newShort;
        settings.longBreakDuration = newLong;

        saveSettings();
        closeSettingsModal();
        if (isPaused) {
          resetTimer();
        }
      }

      // --- Event Listeners ---
      startPauseButton.addEventListener('click', () => {
        if (isPaused) startTimer(); else pauseTimer();
      });
      skipButton.addEventListener('click', skipTimer);
      resetButton.addEventListener('click', resetTimer);
      addTaskButton.addEventListener('click', addTask);
      taskInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') addTask();
      });
      settingsButton.addEventListener('click', openSettingsModal);
      closeButton.addEventListener('click', closeSettingsModal);
      saveSettingsButton.addEventListener('click', applySettings);
      window.addEventListener('click', (event) => {
        if (event.target === settingsModal) closeSettingsModal();
      });

      // --- Initialization ---
      loadSettings();
      loadTasks(); // Load tasks (which now calls renderTasks)
      updateDisplay();
    });
