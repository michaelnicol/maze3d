# maze3d

A 3D Maze solving algorithem that implements breath-first search.

```
npm install maze3d
```

![Thumbnail image of solved mave, with barriers removed so path can be scene](https://i.imgur.com/acM1uYM.png)

The Maze3D class accepts a object for the maze constraints with the following properties:

```
constraints = {
    barrierCharacter: "X",
    spaceCharacter: " ", 
    pathCharacter: "O",
    width: 5,
    height: 5,
    depth: 5,
    xChance: 2,
    yChance: 2,
    zChance: 2,
    diagChance: 2,
    voidSpace: [],
    voidSpaceCharacter: "#"
  }
```

The constraints above are also the default constraints of the maze if no object is passed in or the object passed in does not contain all required properties. Read below to understand how each constraint affects the maze.

## Create Your First Maze

Create a new maze instance with the constraints listed above. This will not generate the maze itself, but only pass the constraints into the Maze3D object.

```
const clientMaze = new Maze3D(constraints)
```

From here, we need to build the template that the maze is generated upon. This will be a 3D Matrix with a barrier space barrier pattern in all three deminsions with a size according to the width, depth and height.

```
clientMaze.generateMazeTemplate()
```
The maze template is stored in the ```clientMaze.mazeTemplate``` attribute. Logging this shows the following result:

```
[
  [
    [ 'X', ' ', 'X', ' ', 'X' ],
    [ ' ', ' ', ' ', ' ', ' ' ],
    [ 'X', ' ', 'X', ' ', 'X' ],
    [ ' ', ' ', ' ', ' ', ' ' ],
    [ 'X', ' ', 'X', ' ', 'X' ]
  ],
  [
    [ ' ', ' ', ' ', ' ', ' ' ],
    [ ' ', ' ', ' ', ' ', ' ' ],
    [ ' ', ' ', ' ', ' ', ' ' ],
    [ ' ', ' ', ' ', ' ', ' ' ],
    [ ' ', ' ', ' ', ' ', ' ' ]
  ],
  [
    [ 'X', ' ', 'X', ' ', 'X' ],
    [ ' ', ' ', ' ', ' ', ' ' ],
    [ 'X', ' ', 'X', ' ', 'X' ],
    [ ' ', ' ', ' ', ' ', ' ' ],
    [ 'X', ' ', 'X', ' ', 'X' ]
  ],
  [
    [ ' ', ' ', ' ', ' ', ' ' ],
    [ ' ', ' ', ' ', ' ', ' ' ],
    [ ' ', ' ', ' ', ' ', ' ' ],
    [ ' ', ' ', ' ', ' ', ' ' ],
    [ ' ', ' ', ' ', ' ', ' ' ]
  ],
  [
    [ 'X', ' ', 'X', ' ', 'X' ],
    [ ' ', ' ', ' ', ' ', ' ' ],
    [ 'X', ' ', 'X', ' ', 'X' ],
    [ ' ', ' ', ' ', ' ', ' ' ],
    [ 'X', ' ', 'X', ' ', 'X' ]
  ]
]
```
The above template could pass off as a maze, but it is not very difficult. 

To randomize the barriers within the maze, use the following method:

```
clientMaze.generateMazeBarriers()
```

This will produce a maze with randomly placed barriers everytime and store it within ```clientMaze.barrierMaze```. The template is stored in ```clientMaze.barrierMaze``` also upon creation until ```.generateMazeBarriers()``` is called.

```
[
  [
    [ 'X', 'X', 'X', 'X', 'X' ],
    [ ' ', ' ', ' ', 'X', 'X' ],
    [ 'X', 'X', 'X', 'X', 'X' ],
    [ 'X', ' ', ' ', ' ', 'X' ],
    [ 'X', ' ', 'X', 'X', 'X' ]
  ],
  [
    [ ' ', 'X', ' ', ' ', ' ' ],
    [ ' ', ' ', ' ', 'X', 'X' ],
    [ ' ', ' ', 'X', ' ', 'X' ],
    [ 'X', ' ', ' ', 'X', ' ' ],
    [ 'X', 'X', ' ', ' ', 'X' ]
  ],
  [
    [ ' ', ' ', 'X', 'X', 'X' ],
    [ ' ', 'X', ' ', 'X', 'X' ],
    [ 'X', ' ', 'X', 'X', 'X' ],
    [ 'X', 'X', 'X', 'X', ' ' ],
    [ 'X', 'X', 'X', 'X', 'X' ]
  ],
  [
    [ ' ', ' ', 'X', ' ', 'X' ],
    [ 'X', 'X', ' ', 'X', ' ' ],
    [ 'X', ' ', ' ', 'X', 'X' ],
    [ ' ', ' ', ' ', 'X', ' ' ],
    [ 'X', 'X', ' ', ' ', 'X' ]
  ],
  [
    [ 'X', 'X', 'X', 'X', 'X' ],
    [ ' ', ' ', 'X', ' ', 'X' ],
    [ 'X', ' ', 'X', 'X', 'X' ],
    [ ' ', ' ', ' ', ' ', ' ' ],
    [ 'X', ' ', 'X', 'X', 'X' ]
  ]
]
```

In order to solve the maze, a start and end point must be given in depth, row, column order (ZYX). If you run into a error with this step, see the Errors section below.

```
clientMaze.solveMaze([0, 1, 1], [4, 3, 3])
```

This produces a 2D array of coordinates that store a path through the maze in ZYX order and stores it in ```clientMaze.path```.

```
[
  [ 0, 1, 1 ], [ 1, 1, 1 ],
  [ 1, 2, 1 ], [ 2, 2, 1 ],
  [ 3, 2, 1 ], [ 4, 2, 1 ],
  [ 4, 3, 1 ], [ 4, 3, 2 ],
  [ 4, 3, 3 ]
]
```

In order overlay the path onto the ```barrierMaze``` using ```pathChacater```, a method is provided.

```
clientMaze.traceMazeWithPath()
```

This will then store a traced maze in ```clientMaze.tracedBarrierMaze```.

```
[
  [
    [ 'X', 'X', 'X', 'X', 'X' ],
    [ ' ', 'O', ' ', 'X', 'X' ],
    [ 'X', 'X', 'X', 'X', 'X' ],
    [ 'X', ' ', ' ', ' ', 'X' ],
    [ 'X', ' ', 'X', 'X', 'X' ]
  ],
  [
    [ ' ', 'X', ' ', ' ', ' ' ],
    [ ' ', 'O', ' ', 'X', 'X' ],
    [ ' ', 'O', 'X', ' ', 'X' ],
    [ 'X', ' ', ' ', 'X', ' ' ],
    [ 'X', 'X', ' ', ' ', 'X' ]
  ],
  [
    [ ' ', ' ', 'X', 'X', 'X' ],
    [ ' ', 'X', ' ', 'X', 'X' ],
    [ 'X', 'O', 'X', 'X', 'X' ],
    [ 'X', 'X', 'X', 'X', ' ' ],
    [ 'X', 'X', 'X', 'X', 'X' ]
  ],
  [
    [ ' ', ' ', 'X', ' ', 'X' ],
    [ 'X', 'X', ' ', 'X', ' ' ],
    [ 'X', 'O', ' ', 'X', 'X' ],
    [ ' ', ' ', ' ', 'X', ' ' ],
    [ 'X', 'X', ' ', ' ', 'X' ]
  ],
  [
    [ 'X', 'X', 'X', 'X', 'X' ],
    [ ' ', ' ', 'X', ' ', 'X' ],
    [ 'X', 'O', 'X', 'X', 'X' ],
    [ ' ', 'O', 'O', 'O', ' ' ],
    [ 'X', ' ', 'X', 'X', 'X' ]
  ]
]
```
## Void Space

The void space option allows for the maze to mark certian cells as void. Void space works exactly like a barrier and should be placed in depth column row (ZYX) order. This is useful if the maze needs to be a certian shape without using barriers. The maze path cannot pass through void space. In the above example, using the voidSpace constraint property:

```
let constraints = {
  voidSpace: [[ 0, 0, 0 ], [ 0, 0, 1 ],
    [ 0, 0, 2 ], [ 0, 0, 3 ],
    [ 0, 1, 1 ], [ 0, 1, 2 ],
    [ 0, 1, 3 ], [ 0, 2, 2 ],
    [ 0, 2, 3 ], [ 0, 3, 3 ]],
  voidSpaceCharacter: "#"
}
```

Will produce the following void in the template in the first depth layer:

```
[
  [
    [ '#', '#', '#', '#', 'X' ],
    [ ' ', '#', '#', '#', ' ' ],
    [ 'X', ' ', '#', '#', 'X' ],
    [ ' ', ' ', ' ', '#', ' ' ],
    [ 'X', ' ', 'X', ' ', 'X' ]
  ],
  [
  ...
  ```




## Errors

The program has built in errors checking for a varity of situations. 


**Error in Maze Constraints** 

When two constraints share the same character. Throwing a error prevents solve conflicts.

```
TypeError: Error in Maze Constraints: # maze character is duplicated across multiple properties ["X","#","O","#"].
    at new Maze3D (/home/runner/Maze3D/index.js:32:17)
    at Object.<anonymous> (/home/runner/Maze3D/index.js:404:9)
    at Module._compile (node:internal/modules/cjs/loader:1101:14)
```

**Failed to place void coordinate** 

When a void space coordinate is out of bounds. 

```
TypeError: Failed to place void coordinate: [0,0,7] is out of bounds. All coordinates should be ZYX order.
    at Maze3D.generateMazeTemplate (/home/runner/Maze3D/index.js:195:15)
    at Object.<anonymous> (/home/runner/Maze3D/index.js:405:3)
    at Module._compile (node:internal/modules/cjs/loader:1101:14)
```

**Failed to generate maze barriers**

Occurs when the mazeTemplate has not been generated

```
RangeError: Failed to generate maze barriers. this.mazeTemplate is equal to []. Use this.generateMazeTemplate() for a valid template.
    at Maze3D.generateMazeBarriers (/home/runner/Maze3D/index.js:211:13)
    at Object.<anonymous> (/home/runner/Maze3D/index.js:404:3)
    at Module._compile (node:internal/modules/cjs/loader:1101:14)
```

**solveMaze Error 1**

When the starting coordinate is out of bounds

```
RangeError: solveMaze Error 1: Start Coordinate [0,7,0] is out of bounds. All coordinates should be ZYX order.
    at Maze3D.solveMaze (/home/runner/Maze3D/index.js:260:13)
    at Object.<anonymous> (/home/runner/Maze3D/index.js:403:3)
    at Module._compile (node:internal/modules/cjs/loader:1101:14)
```

**solveMaze Error 2**

When the ending coordinate is out of bounds

```
RangeError: solveMaze Error 2: End Coordinate [4,5,3] is out of bounds. All coordinates should be ZYX order.
    at Maze3D.solveMaze (/home/runner/Maze3D/index.js:267:13)
    at Object.<anonymous> (/home/runner/Maze3D/index.js:403:3)
    at Module._compile (node:internal/modules/cjs/loader:1101:14)
```

**solveMaze Error 3**

If the starting or ending indices are not space cells.

This is the most common error, and one you may have come across using the above example. It is up to the user of the package to decide valid coordinates to start and end the maze path. 

```
TypeError: solveMaze Error 3: Start and/or End Occupied with barrier or void
    at Maze3D.solveMaze (/home/runner/Maze3D/index.js:277:13)
    at Object.<anonymous> (/home/runner/Maze3D/index.js:403:3)
    at Module._compile (node:internal/modules/cjs/loader:1101:14)
```

**solveMaze Error 4**

If the maze is unsolveable using the current start and ending coordinates.

```
RangeError: solveMaze Error 4: newQueue length is zero: [] because the maze is not solveable.
    at Maze3D.solveMaze (/home/runner/Maze3D/index.js:312:15)
    at Object.<anonymous> (/home/runner/Maze3D/index.js:403:3)
    at Module._compile (node:internal/modules/cjs/loader:1101:14)
```

**Failed to Trace Maze**

Occurs when the path does not contain any coordinates

```
TypeError: Failed to Trace Maze: Path length is zero
    at Maze3D.traceMazeWithPath (/home/runner/Maze3D/index.js:371:13)
    at Object.<anonymous> (/home/runner/Maze3D/index.js:402:3)
    at Module._compile (node:internal/modules/cjs/loader:1101:14)
```

## Mapped Number Maze

You may have noticed that using ```clientMaze.solveMaze()``` produced a artifact stored in ```clientMaze.mappedNumberMaze```. This is the distance values for the breadth-first search, that maps cells using a queue until the end coordinate is found. From here, the program can then trace back from highest to lowest distance until 0 is reached, revealing the shortest path.

```
[
  [
    [ 'X', 'X', 'X', 'X', 'X' ],
    [ 1, 0, 1, 'X', 'X' ],
    [ 'X', 'X', 'X', 'X', 'X' ],
    [ 'X', 4, 5, 6, 'X' ],
    [ 'X', 5, 'X', 'X', 'X' ]
  ],
  [
    [ 3, 'X', 3, 4, 5 ],
    [ 2, 1, 2, 'X', 'X' ],
    [ 3, 2, 'X', ' ', 'X' ],
    [ 'X', 3, 4, 'X', ' ' ],
    [ 'X', 'X', 5, 6, 'X' ]
  ],
  [
    [ 4, 5, 'X', 'X', 'X' ],
    [ 3, 'X', 3, 'X', 'X' ],
    [ 'X', 3, 'X', 'X', 'X' ],
    [ 'X', 'X', 'X', 'X', ' ' ],
    [ 'X', 'X', 'X', 'X', 'X' ]
  ],
  [
    [ 5, 6, 'X', ' ', 'X' ],
    [ 'X', 'X', 4, 'X', ' ' ],
    [ 'X', 4, 5, 'X', 'X' ],
    [ 6, 5, 6, 'X', ' ' ],
    [ 'X', 'X', 7, 8, 'X' ]
  ],
  [
    [ 'X', 'X', 'X', 'X', 'X' ],
    [ 7, 6, 'X', ' ', 'X' ],
    [ 'X', 5, 'X', 'X', 'X' ],
    [ 7, 6, 7, 8, ' ' ],
    [ 'X', 7, 'X', 'X', 'X' ]
  ]
]
```

## Display as a 3D Shape

This maze is currently only text on a screen and requires a 3D engine to display. 

The following codesandbox program used Three.js and dat.gui to create a interactive verison of this maze: https://yqs5l9.csb.app/

Code: https://codesandbox.io/s/3d-maze-solver-yqs5l9?file=/src/World.js

The way the matrix is turned into a 3D maze is by looping through the matrix, taking the depth, row, and column indicies, and inverting them as the XYZ as a cube on the screen.

For example, ```clientMaze.barrierMaze[0][1][2]``` should be be a block placed at XYZ ```(2,1,0)``` with the color of that block depending on the cell value (blue block for barrier, transparent for space, green block for path, no block for void).

![Example Maze Image 3D](https://i.imgur.com/Paab3eJ.png)

The maze barriers can be revealed by using Show Maze Barriers sliders

![Show Maze Barriers](https://i.imgur.com/h9cEFSI.png)

In the examples above, a chance of 1 was used for all axis. Increasing the chance sliders to 4 will make the maze less dense.

![Maze Density Sliders](https://i.imgur.com/acM1uYM.png)

The program above is a WIP and will be a package in future versions. Current size is limited to 50x50x50 for performance, but this can be changed by forking the sandbox and changing the values on lines 445, 452, and 458 for the dat.gui in World.js

```
mazeSize
      .add(this._mazeConstraints, "width", 3, 50, 1) // Change the 50 to a higher value.
      .listen()
      .onChange(() => {
        resetMazeOnChange();
      });
    mazeSize
      .add(this._mazeConstraints, "height", 3, 50, 1)
      .listen()
      .onChange(() => {
        resetMazeOnChange();
      });
    mazeSize
      .add(this._mazeConstraints, "depth", 3, 50, 1)
      .listen()
      .onChange(() => {
        resetMazeOnChange();
      });
```