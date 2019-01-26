const chalk = require('chalk');
const each = require('lodash/each');
const filter = require('lodash/filter');
const fs = require('fs-extra');
const path = require('path');
const sortBy = require('lodash/sortBy');
const startsWith = require('lodash/startsWith');
const argv = require('yargs').argv;

const DUPLICATED_FOLDER_PREFIX = '__SingleSaber__ ';
const SONG_FOLDER = argv.path || path.join(path.dirname(process.execPath), 'CustomSongs');

let songCount = 0;

const isDirectory = source => fs.lstatSync(source).isDirectory()
const getDirectories = source =>
  fs.readdirSync(source).map(name => path.join(source, name)).filter(isDirectory)

const debug = (message) => {
  console.log(chalk.gray(message));
};
const success = (message) => {
  console.log(chalk.blue(message));
};
const error = (message) => {
  console.log(chalk.red(message));
};

const processSongsInFolderPath = ({ folderPath }) => {
  const itemsNamesInFolder = fs.readdirSync(folderPath);

  const songFolderNames = filter(itemsNamesInFolder, (name) => {
    // filter out system files and songs that have already been converted.
    return !startsWith(name, '.') && !startsWith(name, DUPLICATED_FOLDER_PREFIX);
  });
  songCount = songFolderNames.length;

  debug(`Processing ${songFolderNames.length} custom songs...`);

  each(songFolderNames, (name) => {
    const newSongFolderName = `${DUPLICATED_FOLDER_PREFIX}${name}`;
    const newSongFolderPath = path.join(folderPath, newSongFolderName);
    fs.copySync(path.join(folderPath, name), newSongFolderPath);
    processSongFolderPath({ folderPath: newSongFolderPath });
  });

  console.log(chalk.green('You may close this window or copy the log to report any errors to the single-saberizer developer.'));
  setInterval(() => {}, 10000); // keep window open
};

const processSongFolderPath = ({ folderPath }) => {
  const infoFilePath = path.join(folderPath, 'info.json');
  if(fs.existsSync(infoFilePath)) {
    debug(`Found "info.json" in "${folderPath}".`);
    processSong({ infoFilePath, folderPath });
  } else {
    // search recursively.
    debug(`Did not find "info.json" in "${folderPath}", searching subdirectories...`);
    const subFolderPaths = getDirectories({ folderPath });
    each(subFolderPaths, (subfolderPath) => {
      processSongFolderPath({ folderPath: subfolderPath });
    });
  }
};

// Open and parse the info file.
const processSong = ({ infoFilePath, folderPath }) => {
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
        updateSongInfo({ infoFilePath, infoObject, folderPath });
      }
    }
  }
};

const updateSongInfo = ({ infoFilePath, infoObject, folderPath }) => {
  infoObject.oneSaber = true;
  infoObject.songName += ' (Single Saber)';

  try {
    let rawData = JSON.stringify(infoObject);
    fs.writeFileSync(infoFilePath, rawData);
    success(`Updated "${infoFilePath}". Processing songs...`);
    processDifficultyLevels({ folderPath, infoObject });
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

const processDifficultyLevels = ({ folderPath, infoObject }) => {
  each(infoObject.difficultyLevels, (difficultyLevelInfoObject) => {
    const difficultyLevelFilePath = path.join(folderPath, difficultyLevelInfoObject.jsonPath);
    if(fs.existsSync(difficultyLevelFilePath)) {
      processDifficultyLevel({ difficultyLevelFilePath, difficultyLevelInfoObject, infoObject });
    } else {
      error(`Did not find "${difficultyLevelFilePath}". Aborting conversion.`);
    }
  });
};

const processDifficultyLevel = ({ difficultyLevelFilePath, difficultyLevelInfoObject, infoObject }) => {
  let rawData;
  try {
    // debug(`Loading "${levelFilePath}".`);
    rawData = fs.readFileSync(difficultyLevelFilePath);
  }
  catch(err) {
    error(`Error reading "${difficultyLevelFilePath}". Aborting conversion.`);
    debug(err);
  }

  if(rawData) {
    try {
      const difficultyLevelObject = JSON.parse(rawData);
      updateDifficultyLevel({ difficultyLevelFilePath, difficultyLevelObject, difficultyLevelInfoObject, infoObject });
    }
    catch(err) {
      error(`Error parsing "${difficultyLevelFilePath}". Aborting conversion.`);
      debug(err);
      debug(rawData);
    }
  }
};

const updateDifficultyLevel = ({ difficultyLevelFilePath, difficultyLevelObject, difficultyLevelInfoObject, infoObject }) => {
  const notes = [];
  let lastNote = { _time: 0 }, possibleRedConversion;
  const _notes = sortBy(difficultyLevelObject._notes, ['_time']);
  each(_notes, (note) => {
    // debug(note._cutDirection);
    if(note._type > 1) { // auto allow mines or whatever
      notes.push(note);
    } else {
      if (possibleRedConversion) {
        const timeElapsed2 = Math.abs(possibleRedConversion._time - note._time);
        if (infoObject.beatsPerMinute / timeElapsed2 < 240) { //threshold
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
        if (infoObject.beatsPerMinute / timeElapsed < 240) { // threshold
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
  difficultyLevelObject._notes = notes;

  // Example note object:
  // { _time: 8.229583740234375,
  //   _lineIndex: 1,
  //   _lineLayer: 0,
  //   _type: 0,
  //   _cutDirection: 1 },

  writeDifficultyLevel({ difficultyLevelFilePath, difficultyLevelObject });
};

const writeDifficultyLevel = ({ difficultyLevelFilePath, difficultyLevelObject }) => {

  try {
    let rawData = JSON.stringify(difficultyLevelObject);
    fs.writeFileSync(difficultyLevelFilePath, rawData);
    success(`Updated "${difficultyLevelFilePath}".`);
  }
  catch(err) {
    error(`Error writing "${difficultyLevelFilePath}". Aborting conversion.`);
    debug(err);
  }
};

processSongsInFolderPath({ folderPath: path.resolve(SONG_FOLDER) });
