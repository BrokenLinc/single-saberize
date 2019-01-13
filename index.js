const each = require('lodash/each');
const filter = require('lodash/filter');
const fs = require('fs');
const ncp = require('ncp').ncp;
const path = require('path');
const sortBy = require('lodash/sortBy');
const startsWith = require('lodash/startsWith');

const DUPLICATED_FOLDER_PREFIX = '__SingleSaber__ ';
const SONG_FOLDER = path.join('..', 'CustomSongs'); //TODO: yargs input/default

const OPPOSING_DIRECTIONS = [
  1,
  0,
  3,
  2,
  6,
  7,
  4,
  5,
];

const processSongsInFolder = (folder) => {
  fs.readdir(folder, function(err, items) {
    const songFolders = filter(items, function(item) {
      return !startsWith(item, '.') && !startsWith(item, DUPLICATED_FOLDER_PREFIX);
    });
    console.log(`Processing ${songFolders.length} custom songs...`);
    each(songFolders, (item) => {
      if(!startsWith(item, '.') && !startsWith(item, DUPLICATED_FOLDER_PREFIX)) {
        const newSongFolder = `${DUPLICATED_FOLDER_PREFIX}${item}`;
        const newSongFolderPath = path.join(folder, newSongFolder);
        ncp(path.join(folder, item), newSongFolderPath, function (err) {
          if (err) {
            return console.error(err);
          }
          console.log(`Created "${newSongFolder}"...`);
          //TODO: Find better way to proceed once files are done copying
          setTimeout(() => {
            processSongFolder(newSongFolderPath);
          }, 1000);
        });
      }
    });
  });
};

const processSongFolder = (folder) => {
  const infoFilePath = path.join(folder, 'info.json');
  if(fs.existsSync(infoFilePath)) {
    console.log(`Found "info.json" in "${folder}".`);
    processSongDataFile(infoFilePath, folder);
  } else {
    // recursion
    console.log(`Did not find "info.json" in "${folder}", searching subdirectories...`);
    fs.readdir(folder, function (err, items) {
      // console.log(items);
      each(items, (item) => {
        processSongFolder(path.join(folder, item));
      });
    });
  }
};

// Open and parse the info file.
const processSongDataFile = (infoFilePath, folder) => {
  let rawData;
  try {
    rawData = fs.readFileSync(infoFilePath);
  }
  catch(err) {
    console.log('Error reading "info.json". Aborting conversion.');
    console.log(err);
  }

  if(rawData) {
    try {
      const infoObject = JSON.parse(rawData);
      // TODO: Skip songs that are already oneSaber
      modifyInfo(infoFilePath, infoObject, folder)
    }
    catch(err) {
      console.log('Error parsing "info.json". Aborting conversion.');
      console.log(err);
      console.log(rawData);
    }
  }
};

const modifyInfo = (infoFilePath, infoObject, folder) => {
  infoObject.oneSaber = true;
  infoObject.songName += ' (Single Saber)';

  try {
    let rawData = JSON.stringify(infoObject);
    fs.writeFileSync(infoFilePath, rawData);
    console.log(`Updated "${infoFilePath}".`);
    processDifficultyLevels(infoObject.difficultyLevels, folder);
  }
  catch(err) {
    console.log('Error writing "info.json". Aborting conversion.');
    console.log(err);
  }
};

// Example level
// { difficulty: 'Expert',
//   difficultyRank: 4,
//   audioPath: 'Beat it.ogg',
//   jsonPath: 'Expert.json',
//   offset: -570,
//   oldOffset: -570 }

const processDifficultyLevels = (levels, folder) => {
  each(levels, ({ difficulty, jsonPath }) => {
    const levelFilePath = path.join(folder, jsonPath);
    processDifficultyLevel(levelFilePath, difficulty);
  });
};

const processDifficultyLevel = (levelFilePath, difficulty) => {
  let rawData;
  try {
    // console.log(`Loading "${levelFilePath}".`);
    rawData = fs.readFileSync(levelFilePath);
  }
  catch(err) {
    console.log(`Error reading "${levelFilePath}". Aborting conversion.`);
    console.log(err);
  }

  if(rawData) {
    try {
      const levelObject = JSON.parse(rawData);
      updateDifficultyLevel(levelFilePath, levelObject, difficulty);
    }
    catch(err) {
      console.log(`Error parsing "${levelFilePath}". Aborting conversion.`);
      console.log(err);
      console.log(rawData);
    }
  }
};

const updateDifficultyLevel = (levelFilePath, levelObject, difficulty) => {
  const notes = [];
  let lastNote = { _time: 0 }, possibleRedConversion;
  const _notes = sortBy(levelObject._notes, ['_time']);
  each(_notes, (note) => {
    // console.log(note._cutDirection);
    if(possibleRedConversion) {
      const timeElapsed2 = Math.abs(possibleRedConversion._time - note._time);
      if(timeElapsed2 > 0) { //threshold
        // flip the note for flow
        if(!lastNote || lastNote._cutDirection === note._cutDirection) {
          possibleRedConversion._cutDirection = OPPOSING_DIRECTIONS[note._cutDirection];
        }
        notes.push(possibleRedConversion);
        lastNote = possibleRedConversion;
        possibleRedConversion = null;
      }
    }
    if(!possibleRedConversion && note._type === 0) { // maybe make "red/left" into "blue/right" saber notes
      const timeElapsed = Math.abs(lastNote._time - note._time);
      if(timeElapsed > 0) { // threshold
        possibleRedConversion = {
          ...note,
          _type: 1,
        };
      }
    }
    if(note._type === 1) { // auto allow "blue/right" saber notes
      notes.push(note);
      lastNote = note;
      possibleRedConversion = null;
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
    console.log(`Updated "${levelFilePath}".`);
  }
  catch(err) {
    console.log(`Error writing "${levelFilePath}". Aborting conversion.`);
    console.log(err);
  }
};

processSongsInFolder(SONG_FOLDER);
