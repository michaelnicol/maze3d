const mazePackage = require("../maze3d-common")
const {Maze3D} = mazePackage
let constraints = {
    barrierCharacter: "X",
    spaceCharacter: " ", 
    pathCharacter: "O",
    width: 10,
    height: 5,
    depth: 5,
    xChance: 2,
    yChance: 2,
    zChance: 2,
    diagChance: 2,
    voidSpace: [],
    voidSpaceCharacter: "#"
  }
 let clientMaze = new Maze3D(constraints)
 console.log(clientMaze)
