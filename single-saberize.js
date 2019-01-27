const chalk = require('chalk');
const each = require('lodash/each');
const filter = require('lodash/filter');
const find = require('lodash/find');
const fs = require('fs-extra');
const path = require('path');
const sortBy = require('lodash/sortBy');
const startsWith = require('lodash/startsWith');
const argv = require('yargs').argv;

const { DIFFICULTY_LEVEL, DIFFICULTY_LEVELS } = require('./constants/difficultyLevel');

const GENERATE_MISSING_DIFFICULTY_LEVELS = !!argv.difficulty; // experimental
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
    const subFolderPaths = getDirectories(folderPath);
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

  if (GENERATE_MISSING_DIFFICULTY_LEVELS) {
    fillDifficultyLevels({infoObject, folderPath});
  }

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

const fillDifficultyLevels = ({ infoObject, folderPath }) => {
  const difficultLevelsByKey = {};
  each(infoObject.difficultyLevels, (difficultyLevelInfoObject) => {
    difficultLevelsByKey[difficultyLevelInfoObject.difficulty] = difficultyLevelInfoObject;
  });

  each(DIFFICULTY_LEVELS, ({ key, order }) => {
    if(!difficultLevelsByKey[key]) {
      const difficultyLevelToCopy = find(DIFFICULTY_LEVELS, (difficultyLevel) => {
        // If there is a higher difficulty level written
        return difficultyLevel.order > order && difficultLevelsByKey[difficultyLevel.key];
      });
      if (difficultyLevelToCopy) {
        // copy it
        infoObject.difficultyLevels.push({
          ...difficultLevelsByKey[difficultyLevelToCopy.key],
          difficulty: key,
          jsonPath: `${key}.json`,
          sourceDifficultyLevel: difficultyLevelToCopy, // unofficial flag
        });
        fs.copySync(
          path.join(folderPath, `${difficultyLevelToCopy.key}.json`),
          path.join(folderPath, `${key}.json`)
        );
        debug(`Copied "${key}" difficulty from "${difficultyLevelToCopy.key}".`);
      }
    }
  });

};

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
      updateDifficultyLevel({ difficultyLevelFilePath, difficultyLevelObject, difficultyLevelInfoObject });
    }
    catch(err) {
      error(`Error parsing "${difficultyLevelFilePath}". Aborting conversion.`);
      debug(err);
      debug(rawData);
    }
  }
};

const updateDifficultyLevel = ({ difficultyLevelFilePath, difficultyLevelObject, difficultyLevelInfoObject }) => {
  const { offset } = difficultyLevelInfoObject;
  const { _beatsPerMinute } = difficultyLevelObject;
  const noteOffset = offset / 1000 * _beatsPerMinute / 60;
  const difficultyLevel = DIFFICULTY_LEVEL[difficultyLevelInfoObject.difficulty];
  // debug(`Note offset: ${noteOffset}.`);

  const notes = [];
  let lastNote = { _time: 0 }, possibleRedConversion;
  const _notes = sortBy(difficultyLevelObject._notes, ['_time']);
  each(_notes, (note) => {
    // debug(note._cutDirection);
    if(note._type > 1) { // auto allow mines or whatever
      notes.push(note);
    } else {
      let isNoteValid = true;

      // for generated levels, attempt to scale back note frequency - experimental
      if(difficultyLevelInfoObject.sourceDifficultyLevel) {
        isNoteValid = getNoteValidity({ note, difficultyLevelInfoObject, noteOffset });
      }

      if (isNoteValid) {
        if (possibleRedConversion) {
          const timeElapsed2 = Math.abs(possibleRedConversion._time - note._time);
          if (_beatsPerMinute / timeElapsed2 < difficultyLevel.timingThreshold) {
            // flip the note for flow - experimental
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
          if (_beatsPerMinute / timeElapsed < difficultyLevel.timingThreshold) {
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
    }
  });
  difficultyLevelObject._notes = notes;
  if(difficultyLevelInfoObject.sourceDifficultyLevel) {
    debug(`${notes.length} ${difficultyLevelInfoObject.difficulty} notes derived from ${_notes.length} ${difficultyLevelInfoObject.sourceDifficultyLevel.key} notes.`);
  }

  writeDifficultyLevel({ difficultyLevelFilePath, difficultyLevelObject });
};

// Experimental logic to restrict notes to whole / half / etc.
const getNoteValidity = ({ note, difficultyLevelInfoObject, noteOffset }) => {
  const { noteTimeMod } = DIFFICULTY_LEVEL[difficultyLevelInfoObject.difficulty];
  if (!noteTimeMod) return true;

  const shiftedNote = (note._time - noteOffset);
  return Math.round(shiftedNote * 16) / 16 === Math.round(shiftedNote * noteTimeMod) / noteTimeMod;
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
