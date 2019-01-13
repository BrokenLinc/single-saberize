# single-saberize
Creates single-saber maps from your Beat Saber custom song library.

### Instructions
1. Download some custom songs if you haven't already.
    1. [Beat Saber Mod Installer](https://github.com/Umbranoxio/BeatSaberModInstaller) is highly recommended.
2. Download the [latest release of single-saberize.exe](https://github.com/Landerson352/single-saberize/releases/latest), place it in your `Beat Saber` program directory (usually in `SteamLibrary/steamapps/common/Beat Saber`), and run it.
    1. If you have trouble finding the folder, open Beat Saber's "Properties" menu in Steam and "Browse Local Files".

### How does it work?
1. It duplicates **all** custom songs you have downloaded and adds "(Single Saber)" to the name.
2. It makes **all** difficulty levels single-saber.
    1. It first removes all red blocks.
    2. If the red blocks seem hittable, it will instead repaint them blue. Currently, it simply tests to see if at least 1/4 second has passed since the last note by comparing time elapsed and bpm. This is always undergoing tests and tweaking to find the right combination of difficulty and flow.

### Why do this?

Beat Saber is probably the best VR game released so far, and one of the most fun video games ever made. There is a vibrant community around modding the game, sharing custom maps, using the game as a part of an exercise regimen, and more.

Unfortunately, the gameplay is limited for players who only have full use of one hand. Even though the makers of Beat Saber implemented a "Single Saber" mode and supplied some of their songs for it, the catalog is limited. Creating good song maps takes time.

I made this script to help open up the existing catalog of custom songs to these players. It can be used directly by players on their game installation, or by custom song mappers to quickly kick-start a single-saber version of their maps.

### Help

I'm not affiliated with the Beat Saber team (even though I think they are brilliant), so please [report any issues here](https://github.com/Landerson352/single-saberize/issues). This is a hobby project for me, so I'll try to answer any questions as time allows. Thanks!

## Contributing

##### Requirements
- [Node](https://nodejs.org/en/)
- [Yarn](https://yarnpkg.com/en/)
   
##### Setup
- Check out the project folder beside a `CustomSongs` folder.
    - _For example, I have a `CustomSongs` folder with a few test songs beside my `single-saberize` working directory._
- Run `yarn` to install dependencies.

##### Development
- Make any edits to `single-saberize.js`.
- Run `yarn test` to process the songs.

##### Publishing
`yarn build` is used to package a windows executable into the `/dist` folder. This is typically done manually upon publishing a release. 