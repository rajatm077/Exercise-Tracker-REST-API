const mongoose = require('mongoose');
const Joi = require('joi');
const exerciseSchema = new mongoose.Schema({ 
  userId: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  date: { 
    type: Date,
    default: Date.now
  } 
});

const Exercise = mongoose.model('Exercise', exerciseSchema);

function validateExercise(exercise) {
  const schema = {
    userId: Joi.string().min(5).required(),
    description: Joi.string().required(),
    duration: Joi.number().required(),
    date: Joi.date().allow('').optional()
  }

  return Joi.validate(exercise, schema);
}

exports.Exercise = Exercise;
exports.validate = validateExercise;