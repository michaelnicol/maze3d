import * as three from "three";
export default class Maze3D {
  /**
   * @constructor
   * @param {Object} constriants - Contains the constructor data for the maze: barrierChar, spaceChar, depth, height, width, xChance, yChance, zChance, diagChance, voidSpace, voidChar, sliceOffVoid
   */
  constructor(constraints) {
    /**
     * @public {Object} contraints - Contains the Maze3D data for the maze: barrierChar, spaceChar, depth, height, width, xChance, yChance, zChance, diagChance, voidSpace, voidChar, sliceOffVoid
     */
    this.constraints = {
      barrierChar: "X",
      spaceChar: " ",
      pathChar: "O",
      width: 11,
      height: 11,
      depth: 11,
      xChance: 3,
      yChance: 3,
      zChance: 3,
      diagChance: 3,
      voidSpace: [],
      voidChar: "#",
      sliceOffVoid: false
    };
    if (typeof constraints === "object") {
      Object.assign(this.constraints, constraints);
    }
    let characters = [
      this.constraints.barrierChar,
      this.constraints.spaceChar,
      this.constraints.pathChar,
      this.constraints.voidChar
    ];
    for (let i = 0; i < characters.length; i++) {
      for (let j = 0; j < characters.length; j++) {
        if (characters[i] === characters[j] && i !== j) {
          throw new TypeError(
            "Error in Maze Constraints: " +
              characters[i] +
              " maze Character is duplicated across multiple properties " +
              JSON.stringify(characters) +
              "."
          );
        }
      }
    }
    /**
     * @public mazeTemplate - 3D Matrix containing template (barrier space barrier pattern) the maze is generated from.
     * @type {Array[][][]}
     */
    this.mazeTemplate = [];
    /**
     * @public barrierMaze - 3D Matrix containing maze barriers randomly generated using the mazeTemplate
     * @type {Array[][][]}
     */
    this.barrierMaze = [];
    /**
     * @public tracedBarrierMaze - 3D Matrix containing the traced maze using the path coordinate values
     * @type {Array[][][]}
     */
    this.tracedBarrierMaze = [];
    /**
     * @public mappedNumberMaze - Artifact of the solveMaze method. This 3D matrix is barrierMaze but all space cells are replaced with numbers representing the breadth first search distance from the start cell. This process terminates when one of the cells is the end path cell.
     * @type {Array[][][]}
     */
    this.mappedNumberMaze = [];
    /**
     * @public path - 2D Matrix containing the ZYX coordinates for the solved maze path
     * @type {Array[][]}
     */
    this.path = [];
    this._resetModel();
    this._modelOptions = {};
    this._sceneLights = {};
    this._lightOptions = {};
    this._animationOptions = {};
    this._animationSliceMixers = {};
  }
  /**
   * @private @function _findSurrondingValues - Internal Function: Used to find surronding values to a given cell
   * @param {number} d - Depth index for the cell
   * @param {number} r - Row index for the cell
   * @param {number} c - Column index for the cell
   * @param {Array} arr3DRef - Pass by reference for the 3D matrix to find surronding values within
   * @returns {Object}
   */
  _findSurrondingValues(d, r, c, arr3DRef) {
    return {
      bottom:
        r + 1 < arr3DRef[0].length
          ? { value: arr3DRef[d][r + 1][c], coord: [d, r + 1, c] }
          : { value: undefined, coord: undefined },
      top:
        r - 1 >= 0
          ? { value: arr3DRef[d][r - 1][c], coord: [d, r - 1, c] }
          : { value: undefined, coord: undefined },
      right:
        c + 1 < arr3DRef[0][0].length
          ? { value: arr3DRef[d][r][c + 1], coord: [d, r, c + 1] }
          : { value: undefined, coord: undefined },
      left:
        c - 1 >= 0
          ? { value: arr3DRef[d][r][c - 1], coord: [d, r, c - 1] }
          : { value: undefined, coord: undefined },
      front:
        d + 1 < arr3DRef.length
          ? { value: arr3DRef[d + 1][r][c], coord: [d + 1, r, c] }
          : { value: undefined, coord: undefined },
      back:
        d - 1 >= 0
          ? { value: arr3DRef[d - 1][r][c], coord: [d - 1, r, c] }
          : { value: undefined, coord: undefined }
    };
  }
  /**
   * @private @function _coordInConstraints - Internal Function: Checks if a coordinate is within the constraints of the maze
   * @param {Array<Number>} arr - Coordinate in DRC (ZYX) order
   * @returns boolean
   */
  _coordInConstraints(arr) {
    return !(
      arr[0] < 0 ||
      arr[1] < 0 ||
      arr[2] < 0 ||
      arr[0] >= this.constraints.depth ||
      arr[1] >= this.constraints.height ||
      arr[2] >= this.constraints.width
    );
  }
  /**
   * @private @function _deepCopy - Internal Function: Returns deep copy of a given object (uses JSON - No circular logic)
   * @param {Object} obj - Object to be deep copied
   * @returns {Object}
   */
  _deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
  }
  /**
   * @private @function _mapMaze - Internal Function: Higher order function that maps over a 3D matrix
   * @param {Array} arr3DRef - Pass by Reference 3D matrix
   * @param {function} callback - Callback function to be applied to each cell in the 3D matrix
   * @returns void
   */
  _mapMaze(arr3DRef, callback) {
    for (let d = 0; d < arr3DRef.length; d++) {
      for (let r = 0; r < arr3DRef[d].length; r++) {
        for (let c = 0; c < arr3DRef[d][r].length; c++) {
          arr3DRef[d][r][c] = callback(arr3DRef[d][r][c], d, r, c);
        }
      }
    }
  }
  /**
   * @private @function _randomInt - Internal Function: Returns random number from 0 to max-1. If max is 1, it generates a 50/50 chance by using a seperate random function. If the input is zero, it will return zero for 100% chance.
   * @param {number} max - Max value for the function
   * @returns {number}
   */
  _randomInt(max) {
    return max > 1 ? Math.floor(Math.random() * max) : max === 0 ? 0 : Math.random() < 0.5 ? 0 : 1;
  }
  /**
   * @private @function _arr2dContainsArr1d - Checks if a 1D Matrix is inside of a 2D Matrix
   * @param {Array} arr2d - 2D Array
   * @param {Array} arr1d - 1D Array
   * @returns boolean
   */
  _arr2dContainsArr1d(arr2d, arr1d) {
    let strArr1d = JSON.stringify(arr1d);
    for (let coord of arr2d) {
      if (JSON.stringify(coord) === strArr1d) {
        return true;
      }
    }
    return false;
  }
  /**
   * @private @function _isCharBlockade - Internal Function: Checks if the given chacacter is a barrier or void
   * @returns {String} - Returns "barrier" or "void", otherwise returns boolean false
   */
  _isCharBlockade(char) {
    // I don't like missing return types like this, but a issue came up with dependent functions that eventully required different return types.
    if (char === this.constraints.barrierChar) {
      return "barrier";
    }
    if (char === this.constraints.voidChar) {
      return "void";
    } else {
      return false;
    }
  }
  /**
   * @private @function _resetModel - Internal Function: Resets Model attributes
   * @returns void
   */
  _resetModel() {
    this._animationSliceMixers = {};
    this._animationInstances = {};
    this._mazeModelMeshComponents = {};
    this.threeModel = {};
    this._mazeInstanceDetails = {};
  }
  /**
   * @private @function _addVoidToTemplate - Internal Function: Takes ZYX coord values from this.constraints.voidSpace into this.mazeTemplate
   * @returns void
   */
   _addVoidToTemplate() {
    for (let i = 0; i < this.constraints.voidSpace.length; i++) {
      if (this.constraints.voidSpace[i].length !== 3) {
        throw new TypeError(
          `_addVoidToTemplate Error: Failed to validate voidSpace coordinates because
            ${JSON.stringify(this.constraints.voidSpace[i])} at index ${i} has a length of ${
            this.constraints.voidSpace[i].length
          }. No voidSpace coordinates were placed in the mazeTemplate.`
        );
      }
    }
    for (let coord of this.constraints.voidSpace) {
      if (!this._coordInConstraints(coord) && !this.constraints.sliceOffVoid) {
        throw new TypeError(
          "_addVoidToTemplate Error: Failed to place void coordinate: " +
            JSON.stringify(coord) +
            " is out of bounds. All coordinates should be ZYX order. Set constraints.sliceOffVoid = true to ignore this."
        );
      } else if (this._coordInConstraints(coord)) {
      this.mazeTemplate[coord[0]][coord[1]][coord[2]] = this.constraints.voidChar;
      }
    }
  }
  /**
   * @public @function generateMazeTemplate - Generates a maze building template stored within a 3D matrix. Uses a barrer space barrier pattern in all 3 demensions. Fills specified void areas with void chacacters. Stores in this.mazeTemplate.
   * @returns void
   */
  generateMazeTemplate() {
    this._resetModel();
    this.barrierMaze = [];
    this.mazeTemplate = [];
    this.path = [];
    this.tracedBarrierMaze = [];
    this.mappedNumberMaze = [];
    for (let d = 0; d < this.constraints.depth; d++) {
      let layer = [];
      // Depth Layer with Barriers
      if (d % 2 === 0) {
        for (let h = 0; h < this.constraints.height; h++) {
          let column = [];
          // Barrier Space Barrier Row
          if (h % 2 === 0) {
            for (let w = 0; w < this.constraints.width; w++) {
              w % 2 === 0
                ? column.push(this.constraints.barrierChar)
                : column.push(this.constraints.spaceChar);
            }
            // All Space Row
          } else {
            for (let w = 0; w < this.constraints.width; w++) {
              column.push(this.constraints.spaceChar);
            }
          }
          layer.push(column);
        }
        // All Space Depth Layer
      } else {
        for (let h = 0; h < this.constraints.height; h++) {
          let column = [];
          for (let w = 0; w < this.constraints.width; w++) {
            column.push(this.constraints.spaceChar);
          }
          layer.push(column);
        }
      }
      this.mazeTemplate.push(layer);
    }
    this._addVoidToTemplate();
    this.barrierMaze = this._deepCopy(this.mazeTemplate);
  }
  /**
   * @public @function generateMazeTemplate - Randomly generates barriers within the maze using constraints chance. Stores in this.barrierMaze.
   * @returns void
   */
  generateMazeBarriers() {
    this.path = [];
    this.mappedNumberMaze = [];
    this.barrierMaze = this._deepCopy(this.mazeTemplate);
    this.tracedBarrierMaze = [];

    /* Callbacks declared in function due to scope of this */

    /**
     * @private @function _genBarrierCallback Private function: Given a cellValue at ZYX,
     * return if it is a barrier or not depending on ZYX.
     * Callback for generateMazeBarriers.
     * @param {String} cellValue
     * @param {Number} d - Z index in 3D matrix
     * @param {Number} h - Y index in 3D matrix
     * @param {Number} w - x index in 3D matrix
     * @returns {String} New cellValue
     */
    const _genBarrierCallback = (cellValue, d, h, w) => {
      let tempSurrondingValues = this._findSurrondingValues(d, h, w, this.barrierMaze);
      if (cellValue === this.constraints.spaceChar) {
        if (
          this._isCharBlockade(tempSurrondingValues.top.value) &&
          this._isCharBlockade(tempSurrondingValues.bottom.value)
        ) {
          return this._randomInt(this.constraints.yChance) === 0
            ? this.constraints.barrierChar
            : this.constraints.spaceChar;
        } else if (
          this._isCharBlockade(tempSurrondingValues.right.value) &&
          this._isCharBlockade(tempSurrondingValues.left.value)
        ) {
          return this._randomInt(this.constraints.xChance) === 0
            ? this.constraints.barrierChar
            : this.constraints.spaceChar;
        } else if (
          this._isCharBlockade(tempSurrondingValues.back.value) &&
          this._isCharBlockade(tempSurrondingValues.front.value)
        ) {
          return this._randomInt(this.constraints.zChance) === 0
            ? this.constraints.barrierChar
            : this.constraints.spaceChar;
          // The if statements above produce through holes every other block on all three demsinions.
          // This statement should remove those holes mathmatically
        } else if (d % 2 === 1 || (h % 2 === 1 && w % 2 === 1)) {
          // If its a space layer (vertical hole) or a xy horizntoal hole, then use a diagChance
          return this._randomInt(this.constraints.diagChance) === 0
            ? this.constraints.barrierChar
            : this.constraints.spaceChar;
        }
      }
      return cellValue;
    };
    /**
     * @private @function _cleanBarrierCallback Private function: Given a cellValue at ZYX,
     * return if a cell should be a barrier or a space depending on surronding cell values.
     * Callback for generateMazeBarriers.
     * @param {String} cellValue
     * @param {Number} d - Z index in 3D matrix
     * @param {Number} h - Y index in 3D matrix
     * @param {Number} w - x index in 3D matrix
     * @returns {String} New cellValue
     */
    const _cleanBarrierCallback = (cellValue, d, h, w) => {
      let tempSurrondingValues = this._findSurrondingValues(d, h, w, this.barrierMaze);
      if (cellValue === this.constraints.barrierChar) {
        let flag = false;
        for (let key of Object.keys(tempSurrondingValues)) {
          if (tempSurrondingValues[key].value === this.constraints.barrierChar) {
            flag = true;
          }
        }
        return flag ? cellValue : this.constraints.spaceChar;
      }
      return cellValue;
    };

    // Generate the barriers
    this._mapMaze(this.barrierMaze, _genBarrierCallback);
    // Cleans barriers not touching anything else
    this._mapMaze(this.barrierMaze, _cleanBarrierCallback);
  }
  /**
   * @public @function solveMaze - Solves the maze given a start and end coordinate. Stores results in this.path DRC (ZYX) order.
   * @param {Array} start - 1D Array in DRC (ZYX) order for where the path should start
   * @param {Array} end - 1D Array in DRC (ZYX) order for where the path should end
   * @returns void
   */
  solveMaze(start, end) {
    this.tracedBarrierMaze = [];
    this.mappedNumberMaze = [];
    this.path = [];
    if (!this._coordInConstraints(start)) {
      throw new RangeError(
        `solveMaze Error 1: Start Coordinate ${JSON.stringify(
          start
        )} is out of bounds. All coordinates should be ZYX order.`
      );
    }
    if (!this._coordInConstraints(end)) {
      throw new RangeError(
        `solveMaze Error 2: End Coordinate ${JSON.stringify(
          end
        )} is out of bounds. All coordinates should be ZYX order.`
      );
    }
    if (
      this._isCharBlockade(this.barrierMaze[start[0]][start[1]][start[2]]) === "void" ||
      this._isCharBlockade(this.barrierMaze[end[0]][end[1]][end[2]]) === "void"
    ) {
      throw new TypeError("solveMaze Error 3: Start and/or End Occupied with void");
    }
    if (
      this._isCharBlockade(this.barrierMaze[start[0]][start[1]][start[2]]) === "barrier" ||
      this._isCharBlockade(this.barrierMaze[end[0]][end[1]][end[2]]) === "barrier"
    ) {
      throw new TypeError("solveMaze Error 4: Start and/or End Occupied with barrier");
    }
    // Map the maze with numbers
    let distance = 0;
    this.barrierMaze[start[0]][start[1]][start[2]] = distance;
    let currentQueue = [[...start]];
    // While we haven't found the end yet
    while (!this._arr2dContainsArr1d(currentQueue, [...end])) {
      distance += 1;
      let newQueue = [];
      // Got throught the current Queue
      for (let coord of currentQueue) {
        let tempSurrondingValues = this._findSurrondingValues(
          coord[0],
          coord[1],
          coord[2],
          this.barrierMaze
        );
        // now check those surronding values
        for (let key of Object.keys(tempSurrondingValues)) {
          // Using stritctly equal is vital
          if (tempSurrondingValues[key].value === this.constraints.spaceChar) {
            // If it is a number
            const { coord } = tempSurrondingValues[key];
            this.barrierMaze[coord[0]][coord[1]][coord[2]] = distance;
            newQueue.push([...coord]);
          }
        }
      }
      if (newQueue.length === 0) {
        throw new RangeError(
          `solveMaze Error 4: newQueue length is zero: ${JSON.stringify(
            newQueue
          )} because the maze is not solveable.`
        );
      }
      // Set the currentQueue to the newQueue, and then reset the new one next round
      currentQueue = newQueue;
    }
    // We already know the start and end is on the path
    var currentPoint;
    let startToEnd = false;
    if (
      this.barrierMaze[end[0]][end[1]][end[2]] <= this.barrierMaze[start[0]][start[1]][start[2]]
    ) {
      currentPoint = [...start];
      startToEnd = true;
    } else {
      currentPoint = [...end];
    }
    let target = startToEnd ? JSON.stringify(end) : JSON.stringify(start);
    while (JSON.stringify(currentPoint) !== target) {
      this.path.push([...currentPoint]);
      let tempSurrondingPoints = this._findSurrondingValues(
        currentPoint[0],
        currentPoint[1],
        currentPoint[2],
        this.barrierMaze
      );
      // loop through and find the lowest value
      let lowestNumber;
      let lowestCoords;
      for (let key of Object.keys(tempSurrondingPoints)) {
        if (typeof tempSurrondingPoints[key].value === "number") {
          const { value, coord } = tempSurrondingPoints[key];
          if (lowestNumber === undefined || value < lowestNumber) {
            lowestCoords = [...coord];
            lowestNumber = value;
          }
        }
      }
      currentPoint = [...lowestCoords];
    }
    this.path.push([...start]);
    if (!startToEnd) {
      this.path = this.path.reverse();
    }
    this.mappedNumberMaze = this._deepCopy(this.barrierMaze);
    // Clean Up the Maze of any numbers
    this._mapMaze(this.barrierMaze, (cellValue) =>
      typeof cellValue === "number" ? this.constraints.spaceChar : cellValue
    );
  }
  /**
   * @public @function traceMazeWithPath - Traces the path of the maze on the 3D Matrix using the constraints path symbol. Stored in this.tracedBarrierMaze.
   * @returns
   */
  traceMazeWithPath() {
    if (this.path.length === 0) {
      throw new TypeError("Failed to Trace Maze: Path length is zero");
    }
    this.tracedBarrierMaze = this._deepCopy(this.barrierMaze);
    this._mapMaze(this.tracedBarrierMaze, (cellValue, d, h, w) => {
      for (let i = 0; i < this.path.length; i++) {
        if (this.path[i][0] === d && this.path[i][1] === h && this.path[i][2] === w) {
          return this.constraints.pathChar;
        }
      }
      return cellValue;
    });
  }
  /**
   * @public @function setDefaultModelOptions - Sets the value of _modelOptions to a default options that has color and opacity for void, map, path, space and barrier with three.BoxGeometry(1, 1, 1) instance meshing. However, void and map generate are set to false.
   * @returns void
   */
  setDefaultModelOptions() {
    this._modelOptions = {
      geometry: new three.BoxGeometry(1, 1, 1),
      instance: true,
      barrier: {
        generate: true,
        opacity: 1.0,
        color: 0x0000ff
      },
      space: {
        generate: false,
        opacity: 1.0,
        color: 0xff0000
      },
      path: {
        generate: true,
        opacity: 1.0,
        color: 0x00ff00
      },
      void: {
        generate: false,
        opacity: 1.0,
        color: 0x634f4f
      },
      map: {
        generate: false,
        opacity: 1.0,
        color: 0xf1f10f
      }
    };
  }
  /**
   * @public @function setDefaultAnimationOptions - Sets the value of _animationOptions to a default animation sequence that orders [["barrier", "space", "void"], ["map"], ["path"]]. Check documentation for more information.
   * @returns void
   */
  setDefaultAnimationOptions() {
    this._animationOptions = {
      animationMesh: {
        useCustom: true,
        custom: {
          geometry: new three.BoxGeometry(1, 1, 1),
          barrier: { color: 0x0000ff, opacity: 1.0 },
          space: { color: 0xff0000, opacity: 1.0 },
          path: { color: 0x00ff00, opacity: 1.0 },
          void: { color: 0x634f4f, opacity: 1.0 },
          map: { color: 0xf1f10f, opacity: 1.0 }
        }
      },
      groupOrder: [["barrier", "space", "void"], ["map"], ["path"]], // barrier, space, void, map, path
      groupDelay: 1,
      barrier: {
        animationSlice: "height-layer", // How to slice the maze | height-layer || width-layer || depth-layer || map-distance || solve-path
        animationSliceOffset: 0, // tick before animating the next slice
        animationSliceDuration: 0.5, // How long each slice lasts
        entrance: {
          type: "visible", // visible || slide
          distance: new three.Vector3(0, 100, 0)
        },
        exit: {
          type: "visible", // visible || invisible || slide
          order: "instant", // normal || reverse || instant
          exitDelay: 0,
          distance: new three.Vector3(0, -100, 0)
        }
      },
      space: {
        animationSlice: "height-layer", // How to slice the maze
        animationSliceOffset: 0, // tick before animating the next slice
        animationSliceDuration: 0.5, // How long each slice lasts
        entrance: {
          type: "visible", // visible || slide
          distance: new three.Vector3(0, 100, 0)
        },
        exit: {
          type: "invisible", // visible || invisible || slide
          order: "instant", // normal || reverse || instant
          exitDelay: 0,
          distance: new three.Vector3(0, -100, 0)
        }
      },
      void: {
        animationSlice: "height-layer", // How to slice the maze
        animationSliceOffset: 0, // tick before animating the next slice
        animationSliceDuration: 0.5, // How long each slice lasts
        entrance: {
          type: "visible", // visible || slide
          distance: new three.Vector3(0, 100, 0)
        },
        exit: {
          type: "invisible", // visible || invisible || slide
          order: "instant", // normal || reverse || instant
          exitDelay: 0,
          distance: new three.Vector3(0, -100, 0)
        }
      },
      map: {
        animationSlice: "map-distance", // How to slice the maze
        animationSliceOffset: 0, // tick before animating the next slice
        animationSliceDuration: 0.5, // How long each slice lasts
        entrance: {
          type: "visible", // visible || slide
          distance: new three.Vector3(0, 100, 0)
        },
        exit: {
          type: "invisible", // visible || invisible || slide
          order: "instant", // normal || reverse || instant
          exitDelay: 0,
          distance: new three.Vector3(0, -100, 0)
        }
      },
      path: {
        animationSlice: "solve-path", // How to slice the maze
        animationSliceOffset: 0, // tick before animating the next slice
        animationSliceDuration: 0.1, // How long each slice lasts
        entrance: {
          type: "visible", // visible || slide
          distance: new three.Vector3(0, 100, 0)
        },
        exit: {
          type: "invisible", // visible || invisible || slide
          order: "instant", // normal || reverse || instant
          exitDelay: 1,
          distance: new three.Vector3(0, -100, 0)
        }
      }
    };
  }
  /**
   * @private @function _calculateMazeInstanceDetails - Internal Function: Sets the _mazeInstanceDetails object with the coordinates and count of each maze component for instance meshes
   * @returns void
   */
  _calculateMazeInstanceDetails() {
    // This turns the 3D data matrixs that represnet the maze into lists of ZYX coordinates
    this._mazeInstanceDetails = {
      pathCount: this.path.length,
      pathDRC: [...this.path],
      voidCount: 0,
      voidDRC: [],
      spaceCount: 0,
      spaceDRC: [],
      barrierCount: 0,
      barrierDRC: [],
      mapCount: 0,
      mapDRC: []
    };
    this._mazeInstanceDetails.voidDRC = this.constraints.voidSpace.filter(coord => this._coordInConstraints(coord))
    this._mazeInstanceDetails.voidCount = this._mazeInstanceDetails.voidDRC.length
    this._mapMaze(this.barrierMaze, (cell, d, r, c) => {
      if (cell === this.constraints.barrierChar) {
        this._mazeInstanceDetails.barrierCount += 1;
        this._mazeInstanceDetails.barrierDRC.push([d, r, c]);
        // If the space is not occupied by a path, then save it's location also
      } else if (cell === this.constraints.spaceChar) {
        this._mazeInstanceDetails.spaceCount += 1;
        this._mazeInstanceDetails.spaceDRC.push([d, r, c]);
      }
      return cell;
    });
    this._mapMaze(this.mappedNumberMaze, (cell, d, r, c) => {
      if (typeof cell === "number") {
        this._mazeInstanceDetails.mapCount += 1;
        this._mazeInstanceDetails.mapDRC.push([d, r, c]);
      }
      return cell;
    });
  }
  /**
   * @private @function _mapPosition - Internal Function: Applies a position matrix to each index of a instance.
   * @param {InstanceMesh} instance - Pass by reference three.js InstanceMesh
   * @param {Number[][]} DRC - 2D Array of coordinates in depth, row, column (matrix index) order.
   * @param {String} name - Set the name value of the Object3D > InstanceMesh property
   * @param {String} customTypeParam - Creates a new instance.customType for the instance with a unique name
   * @returns void
   */
  _mapPosition(instance, DRC, name, customTypeParam) {
    // create a new basic Object3D because only the transformation three.Matrix4 is needed
    let calcObj = new three.Object3D();
    instance.name = name;
    customTypeParam === undefined
      ? (instance.customType = "MAZE3D_INSTANCE")
      : (instance.customType = customTypeParam);
    for (let i = 0; i < instance.count; i++) {
      // set the position vector3
      calcObj.position.set(DRC[i][2], DRC[i][1], DRC[i][0]);
      // update the transform matrix4 of the cube object
      calcObj.updateMatrix();
      // Create a new addation to the instnace mesh, with the size, scale and rotation of this instance,
      // being stored in the matrix4 of the object3.
      instance.setMatrixAt(i, calcObj.matrix);
    }
    instance.castShadow = true;
    instance.receiveShadow = true;
  }
  /**
   * @public @function generateThreeModel - Generates a 3D model according to the passed in object. See README.md.
   * @param {Object} options - Options for maze generation, stored in _modelOptions
   * @returns void
   */
  generateModel(options) {
    // This functionis straightforward and repetitive. It could be done in less lines of code,
    // but would make everything extremely non-readable.
    this._resetModel();
    if (typeof options === "object") {
      // Had issue with Object.assign stripping three geometry data from the modelOptions
      // This is because of circular data structures that may be preseant (?)
      for (let iKey of Object.keys(options)) {
        this._modelOptions[iKey] = options[iKey];
      }
    }
    this._mazeModelMeshComponents = {
      geometry: this._modelOptions.geometry
    };
    const { geometry } = this._mazeModelMeshComponents;
    // Generate the materials for each instance of the maze
    if (this._modelOptions.barrier.generate) {
      this._mazeModelMeshComponents.barrierMaterial = new three.MeshPhongMaterial({
        transparent: true,
        opacity: this._modelOptions.barrier.opacity,
        color: new three.Color(this._modelOptions.barrier.color)
      });
    }
    if (this._modelOptions.path.generate) {
      this._mazeModelMeshComponents.pathMaterial = new three.MeshPhongMaterial({
        transparent: true,
        opacity: this._modelOptions.path.opacity,
        color: new three.Color(this._modelOptions.path.color)
      });
    }
    if (this._modelOptions.space.generate) {
      this._mazeModelMeshComponents.spaceMaterial = new three.MeshPhongMaterial({
        transparent: true,
        opacity: this._modelOptions.space.opacity,
        color: new three.Color(this._modelOptions.space.color)
      });
    }
    if (this._modelOptions.void.generate) {
      this._mazeModelMeshComponents.voidMaterial = new three.MeshPhongMaterial({
        transparent: true,
        opacity: this._modelOptions.void.opacity,
        color: new three.Color(this._modelOptions.void.color)
      });
    }
    if (this._modelOptions.map.generate) {
      this._mazeModelMeshComponents.mapMaterial = new three.MeshPhongMaterial({
        transparent: true,
        opacity: this._modelOptions.map.opacity,
        color: new three.Color(this._modelOptions.map.color)
      });
    }
    // Instance mesh each component of the maze (harder to manuplate model, less preforamcne requirements)
    if (this._modelOptions.instance) {
      // Figure out the count of each maze component instance and the coordinates for each index.
      this._calculateMazeInstanceDetails();
      if (this._modelOptions.barrier.generate) {
        this.threeModel.barrier = new three.InstancedMesh(
          geometry,
          this._mazeModelMeshComponents.barrierMaterial,
          this._mazeInstanceDetails.barrierCount
        );
        this._mapPosition(
          this.threeModel.barrier,
          this._mazeInstanceDetails.barrierDRC,
          "MAZE3D_MODEL_BARRIER"
        );
      }
      if (this._modelOptions.path.generate) {
        this.threeModel.path = new three.InstancedMesh(
          geometry,
          this._mazeModelMeshComponents.pathMaterial,
          this._mazeInstanceDetails.pathCount
        );
        this._mapPosition(
          this.threeModel.path,
          this._mazeInstanceDetails.pathDRC,
          "MAZE3D_MODEL_PATH"
        );
      }
      if (this._modelOptions.space.generate) {
        this.threeModel.space = new three.InstancedMesh(
          geometry,
          this._mazeModelMeshComponents.spaceMaterial,
          this._mazeInstanceDetails.spaceCount
        );
        this._mapPosition(
          this.threeModel.space,
          this._mazeInstanceDetails.spaceDRC,
          "MAZE3D_MODEL_SPACE"
        );
      }
      if (this._modelOptions.void.generate) {
        this.threeModel.void = new three.InstancedMesh(
          geometry,
          this._mazeModelMeshComponents.voidMaterial,
          this._mazeInstanceDetails.voidCount
        );
        this._mapPosition(
          this.threeModel.void,
          this._mazeInstanceDetails.voidDRC,
          "MAZE3D_MODEL_VOID"
        );
      }
      if (this._modelOptions.map.generate) {
        this.threeModel.map = new three.InstancedMesh(
          geometry,
          this._mazeModelMeshComponents.mapMaterial,
          this._mazeInstanceDetails.mapCount
        );
        this._mapPosition(
          this.threeModel.map,
          this._mazeInstanceDetails.mapDRC,
          "MAZE3D_MODEL_MAP"
        );
      }
      // If the user does not want to instance
      // but rather use one box mesh for each maze box, this option is used.
      // Its easier to manuplate a part of the maze 3d model data, but less preformance effiecent.
    } else {
      if (this._modelOptions.barrier.generate) {
        this.threeModel.barrier = new three.Group();
        this.threeModel.barrier.name = "MAZE3D_BARRIER_GROUP";
      }
      if (this._modelOptions.path.generate) {
        this.threeModel.path = new three.Group();
        this.threeModel.path.name = "MAZE3D_PATH_GROUP";
      }
      if (this._modelOptions.space.generate) {
        this.threeModel.space = new three.Group();
        this.threeModel.space.name = "MAZE3D_SPACE_GROUP";
      }
      if (this._modelOptions.void.generate) {
        this.threeModel.void = new three.Group();
        this.threeModel.void.name = "MAZE3D_VOID_GROUP";
      }
      if (this._modelOptions.map.generate) {
        this.threeModel.map = new three.Group();
        this.threeModel.map.name = "MAZE3D_MAP_GROUP";
      }
      let mesh;
      this._calculateMazeInstanceDetails();
      if (this._modelOptions.barrier.generate) {
        for (let coord of this._mazeInstanceDetails.barrierDRC) {
          let cubePosition = [...coord].reverse();
          mesh = new three.Mesh(geometry, this._mazeModelMeshComponents.barrierMaterial);
          mesh.position.set(...cubePosition);
          mesh.name = "MAZE3D_NO_INSTANCE_MODEL_GROUP_BARRIER_MESH_ITEM" + JSON.stringify(coord);
          this.threeModel.barrier.add(mesh);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
        }
      }
      if (this._modelOptions.space.generate) {
        for (let coord of this._mazeInstanceDetails.spaceDRC) {
          let cubePosition = [...coord].reverse();
          mesh = new three.Mesh(geometry, this._mazeModelMeshComponents.spaceMaterial);
          mesh.position.set(...cubePosition);
          mesh.name = "MAZE3D_NO_INSTANCE_MODEL_GROUP_SPACE_MESH_ITEM_" + JSON.stringify(coord);
          this.threeModel.space.add(mesh);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
        }
      }
      if (this._modelOptions.void.generate) {
        for (let coord of this._mazeInstanceDetails.voidDRC) {
          let cubePosition = [...coord].reverse();
          mesh = new three.Mesh(geometry, this._mazeModelMeshComponents.voidMaterial);
          mesh.position.set(...cubePosition);
          mesh.name = "MAZE3D_NO_INSTANCE_MODEL_GROUP_VOID_MESH_ITEM" + JSON.stringify(coord);
          this.threeModel.void.add(mesh);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
        }
      }
      if (this._modelOptions.map.generate) {
        for (let coord of this._mazeInstanceDetails.mapDRC) {
          let cubePosition = [...coord].reverse();
          mesh = new three.Mesh(geometry, this._mazeModelMeshComponents.mapMaterial);
          mesh.position.set(...cubePosition);
          mesh.name = "MAZE3D_NO_INSTANCE_MODEL_GROUP_MAP_MESH_ITEM" + JSON.stringify(coord);
          this.threeModel.map.add(mesh);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
        }
      }
      if (this._modelOptions.path.generate) {
        for (let coord of this._mazeInstanceDetails.pathDRC) {
          let cubePosition = [...coord].reverse();
          mesh = new three.Mesh(geometry, this._mazeModelMeshComponents.pathMaterial);
          mesh.position.set(...cubePosition);
          mesh.name = "MAZE3D_NO_INSTANCE_MODEL_GROUP_PATH_MESH_ITEM" + JSON.stringify(coord);
          this.threeModel.path.add(mesh);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
        }
      }
    }
  }

  /**
   * @private @function _generateVisibleKeyTrack - Internal Function: Generates a visible property key track for a slice of the maze animation.
   * @param {Object} timeData - officialState, entranceStartTime, entranceEndTime, exitStartTime, exitEndTime, officialEndTime time data for the keytrack
   * @returns {three.BooleanKeyframeTrack} three.BooleanKeyframeTrack
   */
  _generateVisibleKeyTrack(timeData, exit) {
    return new three.BooleanKeyframeTrack(
      ".visible",
      [
        timeData.officialStart,
        timeData.entranceStartTime,
        timeData.entranceEndTime,
        timeData.exitStartTime,
        timeData.exitEndTime,
        timeData.officialEndTime
      ],
      [false, true, true, true, exit.type === "visible", exit.type === "visible"]
    );
  }
  /**
   * @private @function _generateSlideInKeyTrack - Internal Function: Generates a position property key track for a slice of the maze animation. Each Array<Number> should be XYZ coordinates.
   * @param {Object} timeData - officialState, entranceStartTime, entranceEndTime, exitStartTime, exitEndTime, officialEndTime time data for the keytrack for each slice.
   * @param {Array<Number>} entranceStart - Where the slice should enter from
   * @param {Array<Number>} entranceEnd - Where the slice should enter to. This is the position where it will be on the maze
   * @param {Array<Number>} exitStart - Same value as entranceEnd.
   * @param {Array<Number>} exitEnd - Where the slice should exit to
   * @param {Array<Number>} officialEnd - Where the slice should stay until the entire maze animation is over. Visibility is turned off via this._generateVisibleKeyTrack.
   * @returns {three.VectorKeyframeTrack} three.VectorKeyframeTrack
   */
  _generateSlideInKeyTrack(timeData, entranceStart, entranceEnd, exitStart, exitEnd, officialEnd) {
    return new three.VectorKeyframeTrack(
      ".position",
      [
        timeData.entranceStartTime,
        timeData.entranceEndTime,
        timeData.exitStartTime,
        timeData.exitEndTime,
        timeData.officialEndTime
      ],
      [...entranceStart, ...entranceEnd, ...exitStart, ...exitEnd, ...officialEnd]
    );
  }
  /**
   * @private @function _runGenerateSlideInKeyTrack - Internal Function: Takes the user settings and calcuates the coordinates for the _generateSlideInKeyTrack.
   * @param {Object} timeData - officialState, entranceStartTime, entranceEndTime, exitStartTime, exitEndTime, officialEndTime time data for the keytrack
   * @param {Object} doEnter - If the object will be sliding in. If the object is not, the animation will not use the distance entrance option but instead use the same value for entranceStart as entranceEnd
   * @param {Object} doEnter - If the object will be sliding out. If the object is not, the animation will not use the distance exit option but instead use the same value for exitStart as exitEnd
   * @returns {three.VectorKeyframeTrack} Value from _generateSlideInKeyTrack
   */
  _runGenerateSlideInKeyTrack(timeData, doEnter, doExit, slice, settings) {
    const mazePos = slice.position; //entranceEnd, exitStart
    const entranceStartVecInput = doEnter
      ? settings.entrance.distance
      : new three.Vector3(mazePos.x, mazePos.y, mazePos.z);
    const exitEndVecInput = doExit
      ? settings.exit.distance
      : new three.Vector3(mazePos.x, mazePos.y, mazePos.z);
    const entranceStartCoords = new three.Vector3(
      mazePos.x + entranceStartVecInput.x,
      mazePos.y + entranceStartVecInput.y,
      mazePos.z + entranceStartVecInput.z
    );
    const exitEndVec = new three.Vector3(
      mazePos.x + exitEndVecInput.x,
      mazePos.y + exitEndVecInput.y,
      mazePos.z + exitEndVecInput.z
    );
    const mazePosArr = [mazePos.x, mazePos.y, mazePos.z];
    const exitEndArr = [exitEndVec.x, exitEndVec.y, exitEndVec.z];
    return this._generateSlideInKeyTrack(
      timeData,
      [entranceStartCoords.x, entranceStartCoords.y, entranceStartCoords.z],
      mazePosArr,
      mazePosArr,
      exitEndArr,
      exitEndArr
    );
  }
  /**
   * @private @function _sliceMaze - Internal Function: Slices the barrierMaze into sections
   * according to user settings and stores within _animationInstances. Saves as three.InstancedMesh.
   * @param {String} groupItem - The animation sub-group to slice.
   * @return void
   */
  _sliceMaze(groupItem) {
    const { useCustom } = this._animationOptions.animationMesh;
    // Generate the material for this slice
    // what drc does the groupItem corispond to in _mazeInstanceDetails
    let targetDRC = `${groupItem}DRC`;
    this._animationSortedInstanceCoords[targetDRC] = [];
    // How are we going to slice this part of the maze
    const { animationSlice } = this._animationOptions[groupItem];
    // If the user does not provide a geometry, try and search for this._modelOptions as a backup option
    this._animationGeometry = this._animationOptions.animationMesh.useCustom
      ? this._animationOptions.animationMesh.custom.geometry
      : this._modelOptions.geometry;
    this._animationMaterials[groupItem] = {};
    this._animationInstances[groupItem] = {};
    if (
      animationSlice === "depth-layer" ||
      animationSlice === "height-layer" ||
      animationSlice === "width-layer"
    ) {
      // Since the this._mazeInstanceDetails works in ZYX order, the z axis is place zero in each coord.
      let targetCoord = undefined;
      switch (animationSlice) {
        case "depth-layer":
          targetCoord = 0;
          break;
        case "height-layer":
          targetCoord = 1;
          break;
        case "width-layer":
          targetCoord = 2;
          break;
        default:
          // So the IDE would stop bothering me even though this will never run
          return;
      }
      // Sort the coordinates by inputted targetCoord axis.
      // Grab a coord, _mazeInstanceDetails[targetDRC] is a array [[z,y,x],[z,y,x]]
      // this._animationSortedInstanceCoords is a 3d array [ [[z,y,x],[z,y,x]] , [[z,y,x],[z,y,x]] ]
      for (let instanceCoord of this._mazeInstanceDetails[targetDRC]) {
        let foundBank = false;
        let bankIndex;
        // Loop through all banks (arrays) in this group itme
        for (let i = 0; i < this._animationSortedInstanceCoords[targetDRC].length; i++) {
          // loop through each coord in this bank
          for (let bankCoord of this._animationSortedInstanceCoords[targetDRC][i]) {
            // If these two targetCoords from each coord are the same
            if (bankCoord[targetCoord] === instanceCoord[targetCoord]) {
              // Save the index of this bank
              foundBank = true;
              bankIndex = i;
              break;
            }
          }
        }
        // Add the current instance coord to this bank
        if (foundBank) {
          this._animationSortedInstanceCoords[targetDRC][bankIndex].push([...instanceCoord]);
        } else {
          // Or create a new bank
          // Find where this bank should be
          let wasPushed = false
          for (let i = 0; i < this._animationSortedInstanceCoords[targetDRC].length; i++) {
            if (this._animationSortedInstanceCoords[targetDRC][i][0][targetCoord] > instanceCoord[targetCoord]) {
              this._animationSortedInstanceCoords[targetDRC].splice(i,0,[[...instanceCoord]])
              wasPushed = true
              break;
            }
          }
          if (!wasPushed) {
          this._animationSortedInstanceCoords[targetDRC].push([[...instanceCoord]]);
          }
        }
      }
      // Generate a new instance for each bank, mapping the coordinates of each bank to the instance.
      for (let i = 0; i < this._animationSortedInstanceCoords[targetDRC].length; i++) {
        this._animationMaterials[groupItem][i] = new three.MeshPhongMaterial({
          transparent: true,
          opacity: useCustom
            ? this._animationOptions.animationMesh.custom[groupItem].opacity
            : this._modelOptions[groupItem].opacity,
          color: new three.Color(
            useCustom
              ? this._animationOptions.animationMesh.custom[groupItem].color
              : this._modelOptions[groupItem].color
          )
        });

        this._animationInstances[groupItem][i] = new three.InstancedMesh(
          this._animationGeometry,
          this._animationMaterials[groupItem][i],
          this._animationSortedInstanceCoords[targetDRC][i].length
        );
        this._mapPosition(
          this._animationInstances[groupItem][i],
          this._animationSortedInstanceCoords[targetDRC][i],
          groupItem,
          "ANIMATION_INSTANCE"
        );
      }
    } else if (animationSlice === "map-distance" && groupItem === "map") {
      // Within this code block, I still use groupItem instead of hardcoding "map", even though that is the only valid group item.
      // This is just encase I change the name of the item later on
      // F = far, like distance, but I couldn't use the letter D
      this._mappedNumberMazeDRCF = [];
      let largetDistance = 0;
      // First, calculate the largest distance of any cell
      this._mapMaze(this.mappedNumberMaze, (cell, d, r, c) => {
        if (typeof cell === "number") {
          // Collect the cell distance value
          this._mappedNumberMazeDRCF.push([d, r, c, cell]);
        }
        if (cell > largetDistance) {
          largetDistance = cell;
        }
        return cell;
      });
      // Create entries for the distances
      this._sortedMappedNumberMazeDRC = {};
      for (let i = 0; i <= largetDistance; i++) {
        this._sortedMappedNumberMazeDRC[i] = [];
      }
      // Sort them, with the target array being the distance (F)
      for (let coord of this._mappedNumberMazeDRCF) {
        this._sortedMappedNumberMazeDRC[coord[3]].push([coord[0], coord[1], coord[2]]);
      }
      // Create the instance meshes
      // Create materials, instances for each slice
      for (let i = 0; i < largetDistance; i++) {
        this._animationMaterials[groupItem][i] = new three.MeshPhongMaterial({
          transparent: true,
          opacity: useCustom
            ? this._animationOptions.animationMesh.custom[groupItem].opacity
            : this._modelOptions[groupItem].opacity,
          color: new three.Color(
            useCustom
              ? this._animationOptions.animationMesh.custom[groupItem].color
              : this._modelOptions[groupItem].color
          )
        });
        this._animationInstances[groupItem][i] = new three.InstancedMesh(
          this._animationGeometry,
          this._animationMaterials[groupItem][i],
          this._sortedMappedNumberMazeDRC[i].length
        );
        this._mapPosition(
          this._animationInstances[groupItem][i],
          this._sortedMappedNumberMazeDRC[i],
          groupItem,
          "ANIMATION_INSTANCE"
        );
      }
    } else if (animationSlice === "solve-path" && groupItem === "path") {
      // For path, it goes one box at a time, so each slice is a single box
      const { pathDRC, pathCount } = this._mazeInstanceDetails;
      for (let i = 0; i < pathCount; i++) {
        this._animationMaterials[groupItem][i] = new three.MeshPhongMaterial({
          transparent: true,
          opacity: useCustom
            ? this._animationOptions.animationMesh.custom[groupItem].opacity
            : this._modelOptions[groupItem].opacity,
          color: new three.Color(
            useCustom
              ? this._animationOptions.animationMesh.custom[groupItem].color
              : this._modelOptions[groupItem].color
          )
        });
        this._animationInstances[groupItem][i] = new three.Mesh(
          this._animationGeometry,
          this._animationMaterials[groupItem][i]
        );
        this._animationInstances[groupItem][i].name =
          "MAZE3D_ANIMATION_PATHBLOCK_" + JSON.stringify(pathDRC[i]);
        this._animationInstances[groupItem][i].position.z = pathDRC[i][0];
        this._animationInstances[groupItem][i].position.y = pathDRC[i][1];
        this._animationInstances[groupItem][i].position.x = pathDRC[i][2];
      }
    } else {
      throw new TypeError("Invalid Animation Slice");
    }
  }
  _animateSlices() {
    const { groupOrder } = this._animationOptions;
    this._animationSliceMixers = {};
    this._animationTimings = {};
    let currentTime = 0;
    const { groupDelay } = this._animationOptions;
    // Loop through each group
    for (let group of groupOrder) {
      // What is the current time for all items in this group to start at
      let groupItemTime = currentTime;
      // Store the end times for each group item within the group since they may be different.
      let entranceEndTimesArr = [];
      // Loop through each item
      for (let groupItem of group) {
        // Set the current working time for this groupItem to the current time,
        // So all group items in a group start at the same time.
        groupItemTime = currentTime;
        // Grab the settings for this groupitem
        const groupItemSettings = this._animationOptions[groupItem];
        // Time between slices and slice length
        const { animationSliceOffset, animationSliceDuration } = groupItemSettings;
        this._animationTimings[groupItem] = {};
        // Loop through all of the instance slices assioasted with this groupItem
        for (let i = 0; i < Object.keys(this._animationInstances[groupItem]).length; i++) {
          // All slices start at zero
          // Set the start time of the animation to the current groupItemTime
          // Set the end time for the entrance animation to the slice duration addation
          this._animationTimings[groupItem][i] = {
            officialStart: 0,
            entranceStartTime: groupItemTime,
            entranceEndTime: groupItemTime + animationSliceDuration
          };
          // Make sure to add the offset between slices
          groupItemTime += animationSliceDuration + animationSliceOffset;
        }
        // Save the end time for this groupItem's instance animation
        entranceEndTimesArr.push(groupItemTime);
      }
      // End of this group
      // Set the current time to the longest animation of the this group across all items
      currentTime = entranceEndTimesArr.sort((a, b) => b - a)[0]; // entrance end time
      // loop througha all of the groupitems in this group again
      let x = [];
      for (let groupItem of group) {
        // Can't write const {groupItem} = this._animationOptions, store reference.
        const groupItemSettings = this._animationOptions[groupItem];
        const {
          animationSliceOffset,
          animationSliceDuration,
          exit,
          exit: { exitDelay }
        } = groupItemSettings;
        // Delay between this groupItem exiting.
        groupItemTime = currentTime + exitDelay;
        let keysLen = Object.keys(this._animationInstances[groupItem]).length;
        if (exit.order === "instant") {
          // Instant exits have no time elapse
          for (let i = 0; i < keysLen; i++) {
            this._animationTimings[groupItem][i].exitStartTime = groupItemTime;
            this._animationTimings[groupItem][i].exitEndTime = groupItemTime;
          }
        } else if (exit.order === "normal") {
          // Normal start in FIFO order for instances.
          for (let i = 0; i < keysLen; i++) {
            this._animationTimings[groupItem][i].exitStartTime = groupItemTime;
            this._animationTimings[groupItem][i].exitEndTime =
              groupItemTime + animationSliceDuration;
            groupItemTime += animationSliceDuration + animationSliceOffset;
          }
        } else if (exit.order === "reverse") {
          // FILO order for instances
          for (let i = keysLen - 1; i >= 0; i--) {
            this._animationTimings[groupItem][i].exitStartTime = groupItemTime;
            this._animationTimings[groupItem][i].exitEndTime =
              groupItemTime + animationSliceDuration;
            groupItemTime += animationSliceDuration + animationSliceOffset;
          }
        } else {
          throw new TypeError(
            `Invalid this._animationOptions.${groupItem}.exit.order ${exit.order}`
          );
        }
        // Move onto the next group Item
        groupItemTime += groupDelay;
        x.push(groupItemTime);
      }
      currentTime = x.sort((a, b) => b - a)[0];
    }
    // Find out officialEndTime by finding out the longest slice
    let longestEndTime = 0;
    for (let group of groupOrder) {
      for (let groupItem of group) {
        for (let i = 0; i < Object.keys(this._animationInstances[groupItem]).length; i++) {
          const { exitEndTime } = this._animationTimings[groupItem][i];
          if (longestEndTime < exitEndTime) {
            longestEndTime = exitEndTime;
          }
        }
      }
    }
    // implemenet officialEndTime
    for (let group of groupOrder) {
      for (let groupItem of group) {
        for (let i = 0; i < Object.keys(this._animationInstances[groupItem]).length; i++) {
          this._animationTimings[groupItem][i].officialEndTime = longestEndTime;
        }
      }
    }
    for (let group of groupOrder) {
      // a single group
      for (let groupItem of group) {
        // a single group item
        this._animationSliceMixers[groupItem] = {};
        let currentGroupItemSettings = this._animationOptions[groupItem];
        // Grab the entrance and exit times for this group item
        const { entrance, exit } = currentGroupItemSettings;
        // Loop through all of the instances for a groupItem.
        for (let i = 0; i < Object.keys(this._animationInstances[groupItem]).length; i++) {
          // Create a new mixer assioated with thisinstance
          this._animationSliceMixers[groupItem][i] = new three.AnimationMixer(
            this._animationInstances[groupItem][i]
          );
          // Grab the generated timings for this instance.
          let timeData = this._animationTimings[groupItem][i];
          // Generate a boolean keytrack that will decide with the slice is visible.
          let clipTrackArr = [
            this._generateVisibleKeyTrack(timeData, currentGroupItemSettings.exit)
          ];
          // If the entrance or exit type is a slide, then create a slide animation.
          if (entrance.type === "slide" || exit.type === "slide") {
            // If the entrance is slide but the exit type is visible,
            // It will make it so both slices will slide,
            // but the exit will just slide from its current position to its current positon (doesn't move)
            // However, the entrance will slide according to the settings.
            clipTrackArr.push(
              this._runGenerateSlideInKeyTrack(
                timeData,
                entrance.type === "slide",
                exit.type === "slide",
                this._animationInstances[groupItem][i],
                currentGroupItemSettings
              )
            );
          }
          this._animationSliceMixers[groupItem][i].clipAction(
            new three.AnimationClip(JSON.stringify(timeData), -1, clipTrackArr)
          );
        }
      } // groupItem of group
    }
  }

  /**
   * @public @function generateThreeModelAnimation - Generates a aniamted 3D model for the maze using the inputted options. See README.md.
   * @param {Object} options - Options for maze animation generation, stored in _animationOptions
   * @returns void
   */
  generateAnimation(options) {
    // Sorted coordinates based on either grouping by coords that share the same z, y or x axis (in the video, its z)
    this._animationSortedInstanceCoords = {};
    // Tale _threeModelAnimationSortedInstanceCoords and use it to create instance meshes
    this._animationInstances = {};
    // Storage of the materials. Seperate from the generate three model function above.
    this._animationMaterials = {};
    // Slices the maze for _threeModelAnimationSortedInstanceCoords, generates materials, creates the instances'
    if (typeof options === "object") {
      Object.assign(this._animationOptions, options);
    }
    // Slices the maze based on the request for each group item
    if (Object.keys(this._mazeInstanceDetails).length === 0) {
      // FIgure out the count of each instnace mesh to be created and the coordiantes for each instnace
      this._calculateMazeInstanceDetails();
    }
    const { groupOrder } = this._animationOptions;
    for (let group of groupOrder) {
      for (let groupItem of group) {
        this._sliceMaze(groupItem); // produces this._animationInstances
      }
    }
    this._animateSlices();
  }
  getMidpointSpotLightData() {
    let { width, height, depth } = this.constraints;
    width -= 1;
    height -= 1;
    depth -= 1;
    return {
      lightXYZ: [
        [width / 2, 0, depth / 2],
        [width, height / 2, depth / 2],
        [0, height / 2, depth / 2],
        [width / 2, height / 2, 0],
        [width / 2, height / 2, depth],
        [width / 2, height, depth / 2]
      ],
      lightNormalXYZ: [
        [0, -1, 0],
        [1, 0, 0],
        [-1, 0, 0],
        [0, 0, -1],
        [0, 0, 1],
        [0, 1, 0]
      ]
    };
  }
  getCornerSpotLightData() {
    let { width, height, depth } = this.constraints;
    width -= 1;
    height -= 1;
    depth -= 1;
    return {
      lightXYZ: [
        [0, 0, 0],
        [width, 0, 0],
        [0, height, 0],
        [width, height, 0],
        [0, 0, depth],
        [width, 0, depth],
        [0, height, depth],
        [width, height, depth]
      ],
      lightNormalXYZ: [
        [-1, -1, -1],
        [1, -1, -1],
        [-1, 1, -1],
        [1, 1, -1],
        [-1, -1, 1],
        [1, -1, 1],
        [-1, 1, 1],
        [1, 1, 1]
      ]
    };
  }
  setDefaultSpotLightOptions() {
    this._lightOptions = {
      intensity: 0.3,
      colorHex: 0xffaaaa,
      distanceMultXYZ: [this.constraints.depth, this.constraints.height, this.constraints.width],
      showTargetObj: false,
      shadow: {
        enabled: false,
        type: three.PCFSoftShadowMap,
        mapWidth: 2056,
        mapHeight: 2056,
        near: 0.5,
        far: 500,
        bias: -0.00001,
        penumbra: 0.5
      }
    };
    Object.assign(this._lightOptions, this.getCornerSpotLightData());
  }
  generateSpotLights(renderer, options) {
    if (options !== undefined) {
      Object.assign(this._lightOptions, options);
    }
    this._sceneLights = {};
    Object.assign(this._sceneLights, this._lightOptions);
    const { distanceMultXYZ } = this._lightOptions;
    // let key = ["x", "y", "z"];
    // for (let i = 0; i < distanceMultXYZ.length; i++) {
    //   if (distanceMultXYZ[i] === 0) {
    //     console.warn(
    //       `Warning: this._lightOptions.distanceMultXYZ index ${i} for axis ${key[i]} is set to ${distanceMultXYZ[i]}. This will cause the light to shine at ${distanceMultXYZ[i]} on this axis.`
    //     );
    //   }
    // }
    const { shadow } = this._lightOptions;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = shadow.type;
    this._sceneLights.shadowHelpers = {};
    this._sceneLights.lightHelpers = {};
    const { lightXYZ } = this._sceneLights;
    const { lightNormalXYZ } = this._sceneLights;
    this._sceneLights.targetObj = {};
    for (let i = 0; i < this._sceneLights.lightXYZ.length; i++) {
      // They are set to 1.1 size on XYZ beacuse z-index fighting will make (0,0,0) position invisible if the user shows the maze at the same time as a targetObj
      this._sceneLights.targetObj[i] = new three.Mesh(
        new three.BoxGeometry(1.1, 1.1, 1.1),
        new three.MeshStandardMaterial({
          color: 0xffffff
        })
      );
      this._sceneLights.targetObj[i].name = "SPOT_LIGHT_TARGET_OBJ_" + i;
      this._sceneLights.targetObj[i].visible = this._lightOptions.showTargetObj;
      this._sceneLights.targetObj[i].position.x = lightXYZ[i][0];
      this._sceneLights.targetObj[i].position.y = lightXYZ[i][1];
      this._sceneLights.targetObj[i].position.z = lightXYZ[i][2];
    }
    this._sceneLights.lights = {};
    const { lights } = this._sceneLights;
    for (let i = 0; i < lightXYZ.length; i++) {
      lights[i] = new three.SpotLight(
        this._lightOptions.colorHex,
        this._lightOptions.intensity,
        0,
        Math.PI / 3,
        this._lightOptions.shadow.penumbra
      );
      lights[i].shadow.mapSize.width = shadow.mapWidth;
      lights[i].shadow.mapSize.height = shadow.mapHeight;
      lights[i].shadow.camera.near = shadow.near;
      lights[i].shadow.camera.far = shadow.far;
      lights[i].shadow.bias = shadow.bias;
      lights[i].castShadow = shadow.enabled;
      this._sceneLights.shadowHelpers[i] = new three.CameraHelper(lights[i].shadow.camera);
      // light [x,y,z] = light[x,y,z] + (normal[x,y,z] * mult[x,y,z])
      lights[i].position.x = lightXYZ[i][0] + lightNormalXYZ[i][0] * distanceMultXYZ[0];
      lights[i].position.y = lightXYZ[i][1] + lightNormalXYZ[i][1] * distanceMultXYZ[1];
      lights[i].position.z = lightXYZ[i][2] + lightNormalXYZ[i][2] * distanceMultXYZ[2];
      lights[i].shadow.camera.updateProjectionMatrix();
      lights[i].name = "SPOT_LIGHT_" + i;
    }
  }

  /**
   * @public @function modelAPI - Acts as a interface to the threeModel objects and lights
   * @param {String} action - The string action that will be applied to each this.threeModel groups. See READ.md.
   * @param {Object} payload - Depending on the action, a payload needs to be passed. This includes a pass by reference of the three scene for adding and removing the objects.
   * @returns {Array} Returns a array of data depending on the action.
   */
  modelAPI(action, payload) {
    let exitLoad = [];
    if (action === "lookAtCenter") {
      payload.target = new three.Vector3(
        (this.constraints.width - 1) / 2,
        (this.constraints.height - 1) / 2,
        (this.constraints.depth - 1) / 2
      );
      payload.update();
      return exitLoad;
    }
    if (action === "updateTargetObj") {
      for (let t of Object.keys(this._sceneLights.targetObj)) {
        this._sceneLights.targetObj[t].visible = payload;
      }
      return exitLoad;
    }
    if (
      (action === "removeLights" ||
        action === "addLights" ||
        action === "getLightsUUID" ||
        action === "updateLightIntensity" ||
        action === "updateLightPos" ||
        action === "toggleShadow") &&
      this._sceneLights.hasOwnProperty("lights")
    ) {
      exitLoad = [[], []];
      let i = 0;
      // Since the this._sceneLights is being updated, add the new option values
      Object.assign(this._sceneLights, this._lightOptions);
      const { lights } = this._sceneLights;
      const { lightXYZ } = this._sceneLights;
      const { lightNormalXYZ } = this._sceneLights;
      const { distanceMultXYZ } = this._sceneLights;
      for (let light of Object.keys(lights)) {
        if (action === "addLights") {
          // Since target uses the targetObj's matrix world (scene), this can only be computed after both have been added to screen
          payload.add(this._sceneLights.targetObj[light]);
          payload.add(lights[light]);
          lights[light].target = this._sceneLights.targetObj[light];
          this._sceneLights.lightHelpers[i] = new three.SpotLightHelper(lights[light], 0xffffff);
          lights[light].shadow.camera.updateProjectionMatrix();
        } else if (action === "getLightsUUID") {
          exitLoad[0].push(lights[light].uuid);
          exitLoad[1].push(this._sceneLights.targetObj[light].uuid);
        } else if (action === "removeLights") {
          payload.remove(this._sceneLights.targetObj[light]);
          this._sceneLights.targetObj[light].material.dispose();
          this._sceneLights.targetObj[light].geometry.dispose();
          payload.remove(lights[light]);
          // lights[light].dispose()
        } else if (action === "updateLightIntensity") {
          this._sceneLights.intensity = payload;
          lights[light].intensity = payload;
          this._lightOptions.intensity = payload;
        } else if (action === "updateLightPos") {
          lights[i].position.x = lightXYZ[i][0] + lightNormalXYZ[i][0] * distanceMultXYZ[0];
          lights[i].position.y = lightXYZ[i][1] + lightNormalXYZ[i][1] * distanceMultXYZ[1];
          lights[i].position.z = lightXYZ[i][2] + lightNormalXYZ[i][2] * distanceMultXYZ[2];
          this._sceneLights.targetObj[i].position.x = lightXYZ[i][0];
          this._sceneLights.targetObj[i].position.y = lightXYZ[i][1];
          this._sceneLights.targetObj[i].position.z = lightXYZ[i][2];
        } else if (action === "toggleShadow") {
          lights[light].castShadow = payload;
        }
        i += 1;
      }
      return exitLoad;
    } else if (
      (action === "addShadowHelpers" ||
        action === "removeShadowHelpers" ||
        action === "updateShadowHelpers") & this._sceneLights.hasOwnProperty("shadowHelpers")
    ) {
      for (let helper of Object.keys(this._sceneLights.shadowHelpers)) {
        switch (action) {
          case "addShadowHelpers":
            payload.add(this._sceneLights.shadowHelpers[helper]);
            break;
          case "removeShadowHelpers":
            payload.remove(this._sceneLights.shadowHelpers[helper]);
            this._sceneLights.shadowHelpers[helper].dispose();
            break;
          case "updateShadowHelpers":
            this._sceneLights.shadowHelpers[helper].update();
            break;
          default:
            return;
        }
      }
      return exitLoad;
    } else if (
      (action === "addLightHelpers" ||
        action === "removeLightHelpers" ||
        action === "updateLightHelpers") &&
      this._sceneLights.hasOwnProperty("lightHelpers")
    ) {
      for (let helper of Object.keys(this._sceneLights.lightHelpers)) {
        switch (action) {
          case "addLightHelpers":
            payload.add(this._sceneLights.lightHelpers[helper]);
            break;
          case "removeLightHelpers":
            payload.remove(this._sceneLights.lightHelpers[helper]);
            this._sceneLights.lightHelpers[helper].dispose();
            break;
          case "updateLightHelpers":
            this._sceneLights.lightHelpers[helper].update();
            break;
          default:
            return;
        }
      }
      return exitLoad;
    }
    for (let key of Object.keys(this.threeModel)) {
      let obj = this.threeModel[key];
      switch (action) {
        case "addModel":
          payload.add(obj);
          break;
        case "removeModel":
          payload.remove(obj);
          if (obj.isInstancedMesh) {
            obj.dispose();
          } else {
            for (let i of Object.keys(obj.children)) {
              obj.children[i].material.dispose();
              obj.children[i].geometry.dispose();
            }
          }
          break;
        case "getUUID":
          exitLoad.add(obj.uuid);
          break;
        case "visible":
          exitLoad.visible = payload;
          break;
        default:
          throw new TypeError(`modelAPI error: action ${action} is not recongized`);
      }
    }
    return exitLoad;
  }
  /**
   * @public @function animationMixersAPI - Acts as a interface to the _animationSliceMixers and _animationInstances
   * @param {String} action - The string action that will be applied to each _animationSliceMixers and _animationInstances. See READ.md.
   * @param {Object} payload - Depending on the action, a payload needs to be passed. This includes a pass by reference of the three scene for adding and removing the mixer roots, settings time scales, or updating mixers.
   * @returns {Array} Returns a array of data depending on the action.
   */
  animationMixersAPI(action, payload) {
    // Error Checking for payloads
    if (action === "update") {
      if (payload === undefined) {
        // None fatal error
        console.warn(
          `Warning: animationMixersAPI action update does not have payload - ${payload}. Payload will be assumed as <Number> 0.016 to align with 60 FPS displays. Animation will appear twice as fast as expected on 30 FPS displays.`
        );
      } else if (typeof payload !== "number") {
        throw new TypeError(
          `animationMixersAPI action update has incorrect payload type of ${typeof payload}. Action update payload should be type <Number>`
        );
      }
    }
    if (action === "setTime" || action === "changeTimeScale") {
      if (payload === undefined) {
        // None fatal error
        throw new TypeError(
          `animationMixersAPI action ${action} does not have payload - ${payload}.`
        );
      } else if (typeof payload !== "number") {
        throw new TypeError(
          `animationMixersAPI action ${action} has incorrect payload type of ${typeof payload}. Action ${action} payload should be type <Number>`
        );
      }
    }
    // Depending on action, a exitLoad will be returned
    let exitLoad = [];
    for (let groupItem of Object.keys(this._animationSliceMixers)) {
      for (let slice of Object.keys(this._animationSliceMixers[groupItem])) {
        switch (action) {
          case "addModel":
            this._animationSliceMixers[groupItem][slice].visible = false;
            payload.add(this._animationSliceMixers[groupItem][slice].getRoot());
            break;
          case "play":
            this._animationSliceMixers[groupItem][slice]
              .clipAction(this._animationSliceMixers[groupItem][slice]._actions[0]._clip)
              .play();
            break;
          case "update":
            this._animationSliceMixers[groupItem][slice].update(payload || 0.016);
            break;
          case "removeModel":
            this._animationSliceMixers[groupItem][slice].stopAllAction();
            payload.remove(this._animationSliceMixers[groupItem][slice].getRoot());
            this._animationSliceMixers[groupItem][slice].getRoot().material.dispose();
            this._animationSliceMixers[groupItem][slice].getRoot().geometry.dispose();
            break;
          case "getRoot":
            exitLoad.push(this._animationSliceMixers[groupItem][slice].getRoot());
            break;
          case "stopAllAction":
            this._animationSliceMixers[groupItem][slice].stopAllAction();
            break;
          case "setTime":
            this._animationSliceMixers[groupItem][slice].setTime(payload);
            break;
          case "changeTimeScale":
            this._animationSliceMixers[groupItem][slice].timeScale = payload;
            break;
          default:
            throw new TypeError(`Unrecognized animationMixersAPI action ${action}`);
        }
      }
    }
    return exitLoad;
  }
}
