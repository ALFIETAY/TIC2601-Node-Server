const { Op } = require('sequelize');
const Exercise = require('../models/exercise');
const Workout = require('../models/workout');
const WorkoutExercise = require('../models/workout_exercise');

//Add exercise
exports.addExercise = async (req, res) => {
    try {
        const { user_id, exercise_name, primary_muscle, secondary_muscle } = req.body;

        // Validate required fields
        if (!exercise_name || !primary_muscle) {
            return res.status(400).json({ message: 'Exercise name and primary muscle are required.' });
        }

        // Create a new exercise
        const exercise = await Exercise.create({
            user_id: user_id || null, // Allows shared exercises with user_id as NULL
            exercise_name,
            primary_muscle,
            secondary_muscle: secondary_muscle || null
        });

        res.status(200).json({
            message: 'Exercise added successfully',
            exercise
        });
    } catch (error) {
        console.error("Error adding exercise:", error);
        res.status(500).json({ message: 'Error adding exercise', error: error.message });
    }
};

// Remove exercise
exports.deleteExercise = async (req, res) => {
    try {
        const { user_id, exercise_id } = req.params;

        // Find the exercise by ID and user ID
        const exercise = await Exercise.findOne({
            where: { exercise_id, user_id }
        });

        // If the exercise is not found, return 404
        if (!exercise) {
            return res.status(404).json({ message: 'Exercise not found for the specified user.' });
        }

        // Delete the exercise
        await exercise.destroy();

        res.status(200).json({
            message: 'Exercise deleted successfully'
        });
    } catch (error) {
        console.error("Error deleting exercise:", error);
        res.status(500).json({ message: 'Error deleting exercise', error: error.message });
    }
};

// Get total no of sets for each muscle group in the past 4 weeks
exports.getExerciseHistory = async (req, res) => {
    try {
        const { user_id } = req.params;

        // Calculate start and end dates for each of the last 4 weeks
        const today = new Date();
        const weekRanges = [];
        
        for (let i = 0; i < 4; i++) {
            const endDate = new Date(today);
            endDate.setDate(today.getDate() - (7 * i));
            const startDate = new Date(endDate);
            startDate.setDate(endDate.getDate() - 6);
            weekRanges.unshift({ start: startDate, end: endDate });
        }

        console.log("Week Ranges:", weekRanges);

        // Step 1: Find all workouts within the last 4 weeks for the user
        const userWorkouts = await Workout.findAll({
            where: { 
                user_id,
                workout_date: { [Op.gte]: weekRanges[0].start } // Only include workouts from the earliest start date
            },
            attributes: ['workout_id', 'workout_date']
        });

        if (!userWorkouts.length) {
            return res.status(404).json({ message: 'No workouts found for the specified user in the past 4 weeks.' });
        }

        // Extract workout_ids and dates
        const workoutIds = userWorkouts.map(workout => workout.workout_id);
        const workoutDates = userWorkouts.reduce((acc, workout) => {
            acc[workout.workout_id] = new Date(workout.workout_date); // Convert to Date object for comparison
            return acc;
        }, {});

        console.log("User Workouts:", workoutDates);

        // Step 2: Query WorkoutExercise with Exercise to get primary_muscle
        const exercises = await WorkoutExercise.findAll({
            where: {
                workout_id: workoutIds
            },
            attributes: ['workout_id', 'set_number'],
            include: [
                {
                    model: Exercise,
                    attributes: ['primary_muscle'],
                    where: { user_id },
                    required: true
                }
            ]
        });

        // Step 3: Aggregate sets by primary muscle and week
        const weeklyBreakdown = {
            wk1: {},
            wk2: {},
            wk3: {},
            wk4: {}
        };

        exercises.forEach(record => {
            const workoutDate = workoutDates[record.workout_id];
            const primaryMuscle = record.Exercise.primary_muscle;

            // Determine the week for the workout by checking against each range
            let week = null;
            for (let i = 0; i < weekRanges.length; i++) {
                if (workoutDate >= weekRanges[i].start && workoutDate <= weekRanges[i].end) {
                    week = `wk${i + 1}`;
                    break;
                }
            }

            if (!week) {
                console.log(`Workout date ${workoutDate} does not fall into any of the expected week ranges.`);
                return;
            }

            // Initialize if the muscle is not in the week object
            if (!weeklyBreakdown[week][primaryMuscle]) {
                weeklyBreakdown[week][primaryMuscle] = 0;
            }

            // Increment the set count for this muscle group in the determined week
            weeklyBreakdown[week][primaryMuscle] += 1;
        });

        // Return the response
        const response = {
            user_id,
            weekly_exercise_breakdown: weeklyBreakdown
        };

        console.log("Final Response:", response);
        res.json(response);
    } catch (error) {
        console.error("Error retrieving exercise history:", error);
        res.status(500).json({ message: 'Error retrieving exercise history', error: error.message });
    }
};

// Retrieve exercises by workout_id


// Add sets/reps/weight for each exercise