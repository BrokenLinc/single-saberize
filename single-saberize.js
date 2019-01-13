const chalk = require('chalk');
const each = require('lodash/each');
const isEmpty = require('lodash/isEmpty');
const filter = require('lodash/filter');
const fs = require('fs');
const ncp = require('ncp').ncp;
const path = require('path');
const sortBy = require('lodash/sortBy');
const startsWith = require('lodash/startsWith');
const argv = require('yargs').argv;

const DUPLICATED_FOLDER_PREFIX = '__SingleSaber__ ';
const SONG_FOLDER = argv.path || path.join(path.dirname(process.execPath), 'CustomSongs');

let songCount = 0;

// const OPPOSING_DIRECTIONS = [
//   1,
//   0,
//   3,
//   2,
//   6,
//   7,
//   4,
//   5,
// ];

const isDirectory = source => fs.lstatSync(source).isDirectory()
const getDirectories = source =>
  fs.readdirSync(source).map(name => path.join(source, name)).filter(isDirectory)

const debug = (message) => {
  // if(argv.log === 'verbose') {
  console.log(chalk.gray(message));
  // }
};
const success = (message) => {
  // if(argv.log === 'verbose') {
  console.log(chalk.blue(message));
  // }
};
const error = (message) => {
  // if(argv.log === 'verbose') {
  console.log(chalk.red(message));
  // }
};

const processSongsInFolder = (folder) => {
  fs.readdir(folder, function(err, items) {
    const songFolders = filter(items, function(item) {
      return !startsWith(item, '.') && !startsWith(item, DUPLICATED_FOLDER_PREFIX);
    });
    songCount = songFolders.length;
    debug(`Processing ${songFolders.length} custom songs...`);
    each(songFolders, (item) => {
      if(!startsWith(item, '.') && !startsWith(item, DUPLICATED_FOLDER_PREFIX)) {
        const newSongFolder = `${DUPLICATED_FOLDER_PREFIX}${item}`;
        const newSongFolderPath = path.join(folder, newSongFolder);
        ncp(path.join(folder, item), newSongFolderPath, function (err) {
          if (err) {
            return error(err);
          }
          debug(`Created "${newSongFolder}"...`);
          //TODO: Find better way to proceed once files are done copying
          setTimeout(() => {
            processSongFolder(newSongFolderPath);
          }, 1000);
        });
      }
    });
  });
  setInterval(() => {}, 10000); // keep window open
  setTimeout(() => {
    console.log(chalk.green('You may close this window or copy the log to report any errors to the single-saberizer developer.'));
  }, 2000);
};

const processSongFolder = (folder) => {
  const infoFilePath = path.join(folder, 'info.json');
  if(fs.existsSync(infoFilePath)) {
    debug(`Found "info.json" in "${folder}".`);
    processSongDataFile(infoFilePath, folder);
  } else {
    // recursion
    debug(`Did not find "info.json" in "${folder}", searching subdirectories...`);
    const items = getDirectories(folder);
    each(items, (item) => {
      processSongFolder(item);
    });
  }
};

// Open and parse the info file.
const processSongDataFile = (infoFilePath, folder) => {
  let rawData, infoObject;
  try {
    rawData = fs.readFileSync(infoFilePath);
  }
  catch(err) {
    error('Error reading "info.json". Aborting conversion.');
    debug(err);
  }

  if(rawData) {
    try {
      infoObject = JSON.parse(rawData);
    }
    catch(err) {
      error(`Error parsing "${infoFilePath}. Aborting conversion.`);
      debug(err);
      debug(rawData);
    }

    // Skip songs that are already oneSaber
    if(infoObject) {
      if(infoObject.oneSaber) {
        debug(`Existing single-saber track at "${infoFilePath}". Aborting conversion.`);
      } else {
        modifyInfo(infoFilePath, infoObject, folder);
      }
    }
  }
};

const modifyInfo = (infoFilePath, infoObject, folder) => {
  infoObject.oneSaber = true;
  infoObject.songName += ' (Single Saber)';

  try {
    let rawData = JSON.stringify(infoObject);
    fs.writeFileSync(infoFilePath, rawData);
    success(`Updated "${infoFilePath}". Processing songs...`);
    processDifficultyLevels(infoObject.difficultyLevels, folder, infoObject);;
  }
  catch(err) {
    error('Error writing "info.json". Aborting conversion.');
    debug(err);
  }
};

// Example level
// { difficulty: 'Expert',
//   difficultyRank: 4,
//   audioPath: 'Beat it.ogg',
//   jsonPath: 'Expert.json',
//   offset: -570,
//   oldOffset: -570 }

const processDifficultyLevels = (levels, folder, infoObject) => {
  each(levels, ({ difficulty, jsonPath }) => {
    const levelFilePath = path.join(folder, jsonPath);
    if(fs.existsSync(levelFilePath)) {
      processDifficultyLevel(levelFilePath, difficulty, infoObject);
    } else {
      error(`Did not find "${levelFilePath}". Aborting conversion.`);
    }
  });
};

const processDifficultyLevel = (levelFilePath, difficulty, infoObject) => {
  let rawData;
  try {
    // debug(`Loading "${levelFilePath}".`);
    rawData = fs.readFileSync(levelFilePath);
  }
  catch(err) {
    error(`Error reading "${levelFilePath}". Aborting conversion.`);
    debug(err);
  }

  if(rawData) {
    try {
      const levelObject = JSON.parse(rawData);
      updateDifficultyLevel(levelFilePath, levelObject, difficulty, infoObject);
    }
    catch(err) {
      error(`Error parsing "${levelFilePath}". Aborting conversion.`);
      debug(err);
      debug(rawData);
    }
  }
};

const updateDifficultyLevel = (levelFilePath, levelObject, difficulty, { beatsPerMinute }) => {
  const notes = [];
  let lastNote = { _time: 0 }, possibleRedConversion;
  const _notes = sortBy(levelObject._notes, ['_time']);
  each(_notes, (note) => {
    // debug(note._cutDirection);
    if(note._type > 1) { // auto allow mines or whatever
      notes.push(note);
    } else {
      if (possibleRedConversion) {
        const timeElapsed2 = Math.abs(possibleRedConversion._time - note._time);
        if (beatsPerMinute / timeElapsed2 < 240) { //threshold
          // flip the note for flow
          // if(!lastNote || lastNote._cutDirection === note._cutDirection) {
          //   possibleRedConversion._cutDirection = OPPOSING_DIRECTIONS[note._cutDirection];
          // }
          notes.push(possibleRedConversion);
          lastNote = possibleRedConversion;
          possibleRedConversion = null;
        }
      }
      if (!possibleRedConversion && note._type === 0) { // maybe make "red/left" into "blue/right" saber notes
        const timeElapsed = Math.abs(lastNote._time - note._time);
        if (beatsPerMinute / timeElapsed < 240) { // threshold
          possibleRedConversion = {
            ...note,
            _type: 1,
          };
        }
      }
      if (note._type === 1) { // auto allow "blue/right" saber notes
        notes.push(note);
        lastNote = note;
        possibleRedConversion = null;
      }
    }
  });
  levelObject._notes = notes;

  // Example note object:
  // { _time: 8.229583740234375,
  //   _lineIndex: 1,
  //   _lineLayer: 0,
  //   _type: 0,
  //   _cutDirection: 1 },

  writeDifficultyLevel(levelFilePath, levelObject);
};

const writeDifficultyLevel = (levelFilePath, levelObject) => {

  try {
    let rawData = JSON.stringify(levelObject);
    fs.writeFileSync(levelFilePath, rawData);
    success(`Updated "${levelFilePath}".`);
  }
  catch(err) {
    error(`Error writing "${levelFilePath}". Aborting conversion.`);
    debug(err);
  }
};

processSongsInFolder(path.resolve(SONG_FOLDER));
