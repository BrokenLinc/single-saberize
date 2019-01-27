const DIFFICULTY_LEVEL = {
  Easy: {
    difficultyRating: 0,
    name: 'Easy',
    noteTimeMod: 16,
    timingThreshold: 60 * 2,
  },
  Normal: {
    difficultyRating: 1,
    name: 'Normal',
    noteTimeMod: 8,
    timingThreshold: 60,
  },
  Hard: {
    difficultyRating: 2,
    name: 'Hard',
    noteTimeMod: 4,
    timingThreshold: 60 / 0.5,
  },
  Expert: {
    difficultyRating: 3,
    name: 'Expert',
    noteTimeMod: 2,
    timingThreshold: 60 / 0.5,
  },
  ExpertPlus: {
    difficultyRating: 4,
    name: 'ExpertPlus',
    timingThreshold: 60 / 0.25,
  },
};

const DIFFICULTY_LEVELS = [
  DIFFICULTY_LEVEL.Easy,
  DIFFICULTY_LEVEL.Normal,
  DIFFICULTY_LEVEL.Hard,
  DIFFICULTY_LEVEL.Expert,
  DIFFICULTY_LEVEL.ExpertPlus,
];

const DIFFICULTY_LEVEL_NAMES = [
  'Easy',
  'Normal',
  'Hard',
  'Expert',
  'ExpertPlus',
];

module.exports = {
  DIFFICULTY_LEVEL,
  DIFFICULTY_LEVEL_NAMES,
  DIFFICULTY_LEVELS,
};