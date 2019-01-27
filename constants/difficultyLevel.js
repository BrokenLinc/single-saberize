const DIFFICULTY_LEVEL = {
  Easy: {
    order: 0,
    key: 'Easy',
    noteTimeMod: 0.25,
    timingThreshold: 60 * 2,
  },
  Normal: {
    order: 1,
    key: 'Normal',
    noteTimeMod: 0.5,
    timingThreshold: 60,
  },
  Hard: {
    order: 2,
    key: 'Hard',
    noteTimeMod: 1,
    timingThreshold: 60 / 0.5,
  },
  Expert: {
    order: 3,
    key: 'Expert',
    noteTimeMod: 2,
    timingThreshold: 60 / 0.5,
  },
  ExpertPlus: {
    order: 4,
    key: 'ExpertPlus',
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