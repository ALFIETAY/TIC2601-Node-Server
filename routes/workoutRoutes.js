// Workout API Routes
const express = require('express');
const workoutController = require('../controllers/workoutController');

const router = express.Router();

// GET route to get a user's workout schedule
router.get('/schedule/:user_id', workoutController.getWorkoutSchedule);

// POST route to add a workout
router.post('/add_workout', workoutController.addWorkout);

// DELETE route to remove a workout
router.delete('/:user_id/:workout_id', workoutController.deleteWorkout);

// GET route to retrieve exercise by workout_id 
router.get('/exercises/:workout_id', workoutController.getExercisesByWorkoutId);

module.exports = router;
