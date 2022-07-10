// LEGACY VERSION 2.0.2
export default class Maze3D {
    /**
      * @constructor
      * @param {Object} constriants - Contains the constructor data for the maze: barrierCharacter, spaceCharacter, depth, height, width, xChance, yChance, zChance, diagChance, voidSpace, voidSpaceCharacter.
    */
    constructor(constraints) {
      /**
       * @public {Object} contraints - Contains the Maze3D data for the maze: barrierCharacter, spaceCharacter, depth, height, width, xChance, yChance, zChance, diagChance, voidSpace, voidSpaceCharacter.
       */ 
      // Below is the default constraints for the maze
      this.constraints = {
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
      if (typeof constraints === "object") {
        for (let key of Object.keys(constraints)) {
          if (this.constraints.hasOwnProperty(key)) {
            this.constraints[key] = constraints[key]
          }
        }
      }
      let Characters = [this.constraints.barrierCharacter, this.constraints.spaceCharacter, this.constraints.pathCharacter, this.constraints.voidSpaceCharacter];
      for (let i = 0; i < Characters.length; i++) {
        for (let j = 0; j < Characters.length; j++) {
          if (Characters[i] === Characters[j] && i !== j) {
            throw new TypeError("Error in Maze Constraints: " + Characters[i] + " maze Character is duplicated across multiple properties " + JSON.stringify(Characters) +".")
          }
        }
      }
      /**
       * @public {Array} mazeTemplate - 3D Matrix containing template (barrier space barrier pattern) the maze is generated from.
      */
      this.mazeTemplate = []
      /**
       * @public {Array} barrierMaze - 3D Matrix containing maze barriers randomly generated using the mazeTemplate
      */
      this.barrierMaze = []
      /**
       * @public {Array} tracedBarrierMaze - 3D Matrix containing the traced maze using the path coordinate values
      */
      this.tracedBarrierMaze = []
      /** 
      * @public {Array} mappedNumberMaze - Artifact of the solveMaze method. This 3D matrix is barrierMaze but all space cells are replaced with numbers representing the breadth first search distance from the start cell. This process terminates when one of the cells is the end path cell.
      */
      this.mappedNumberMaze = []
      /**
       * @public {Array} path - 2D Matrix containing the ZYX coordinates for the solved maze path
      */
      this.path = []
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
      return !(arr[0] < 0 || arr[1] < 0 || arr[2] < 0 || arr[0] >= this.constraints.depth || arr[1] >= this.constraints.height || arr[2] >= this.constraints.width)
    }
    /** 
      * @private @function _deepCopy - Internal Function: Returns deep copy of a given object (uses JSON - No circular logic)
      * @param {Object} obj - Object to be deep copied
      * @returns {Object}
    */
    _deepCopy(obj) { return JSON.parse(JSON.stringify(obj)) }
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
            arr3DRef[d][r][c] = callback(arr3DRef[d][r][c], d, r, c)
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
      return max > 1 ? Math.floor(Math.random() * max) : max === 0 ? 0 : (Math.random() < 0.5 ? 0 : 1)
    }
    /** 
     * @private @function _arr2dContainsArr1d - Checks if a 1D Matrix is inside of a 2D Matrix
     * @param {Array} arr2d - 2D Array
     * @param {Array} arr1d - 1D Array
     * @returns boolean
     */
    _arr2dContainsArr1d(arr2d, arr1d) {
      let strArr1d = JSON.stringify(arr1d)
      for (let coord of arr2d) {
        if (JSON.stringify(coord) === strArr1d) {
          return true
        }
      }
      return false
    }
    /** 
     * @private @function _isCharBlockade - Internal Function: Checks if the given chacacter is a barrier or void
     * @returns boolean
     */
    _isCharBlockade(char) {
      return char === this.constraints.barrierCharacter || char === this.constraints.voidChacater
    }
    /** 
     * @public @function generateMazeTemplate - Generates a maze building template stored within a 3D matrix. Uses a barrer space barrier pattern in all 3 demensions. Fills specified void areas with void chacacters. Stores in this.mazeTemplate.
     * @returns void
     */
    generateMazeTemplate() {
      this.barrierMaze = []
      this.mazeTemplate = []
      this.path = []
      this.tracedBarrierMaze = []
      this.mappedNumberMaze = []
      for (let d = 0; d < this.constraints.depth; d++) {
        let layer = []
        // Depth Layer with Barriers
        if (d % 2 === 0) {
          for (let h = 0; h < this.constraints.height; h++) {
            let column = []
            // Barrier Space Barrier Row
            if (h % 2 === 0) {
              for (let w = 0; w < this.constraints.width; w++) {
                w % 2 === 0 ? column.push(this.constraints.barrierCharacter) : column.push(this.constraints.spaceCharacter)
              }
              // All Space Row
            } else {
              for (let w = 0; w < this.constraints.width; w++) {
                column.push(this.constraints.spaceCharacter)
              }
            }
            layer.push(column)
          }
          // All Space Depth Layer
        } else {
          for (let h = 0; h < this.constraints.height; h++) {
            let column = []
            for (let w = 0; w < this.constraints.width; w++) {
              column.push(this.constraints.spaceCharacter)
            }
            layer.push(column)
          }
        }
        this.mazeTemplate.push(layer)
      }
      for (let coord of this.constraints.voidSpace) {
        if (!this._coordInConstraints(coord)) {
          throw new TypeError("Failed to place void coordinate: " + JSON.stringify(coord) + " is out of bounds. All coordinates should be ZYX order.")
        }
        this.mazeTemplate[coord[0]][coord[1]][coord[2]] = this.constraints.voidSpaceCharacter
      }
      this.barrierMaze = this._deepCopy(this.mazeTemplate)
    }
    /** 
    * @public @function generateMazeTemplate - Randomly generates barriers within the maze using constraints chance. Stores in this.barrierMaze.
    * @returns void
    */
    generateMazeBarriers() {
      this.path = []
      this.mappedNumberMaze = []
      this.barrierMaze = this._deepCopy(this.mazeTemplate)
      this.tracedBarrierMaze = []
      // Checks barriers and adds barrers randomly
      const checkBarriers = (cellValue, d, h, w) => {
        let tempSurrondingValues = this._findSurrondingValues(d, h, w, this.barrierMaze)
        if (cellValue === this.constraints.spaceCharacter) {
          if (this._isCharBlockade(tempSurrondingValues.top.value) && this._isCharBlockade(tempSurrondingValues.bottom.value)) {
            return this._randomInt(this.constraints.yChance) === 0 ? this.constraints.barrierCharacter : this.constraints.spaceCharacter
          }
          else if (this._isCharBlockade(tempSurrondingValues.right.value) && this._isCharBlockade(tempSurrondingValues.left.value)) {
            return this._randomInt(this.constraints.xChance) === 0 ? this.constraints.barrierCharacter : this.constraints.spaceCharacter
          }
          else if (this._isCharBlockade(tempSurrondingValues.back.value) && this._isCharBlockade(tempSurrondingValues.front.value)) {
            return this._randomInt(this.constraints.zChance) === 0 ? this.constraints.barrierCharacter : this.constraints.spaceCharacter
            // The if statements above produce through holes every other block on all three demsinions. 
            // This statement should remove those holes mathmatically
          } else if (d % 2 === 1 || (h % 2 === 1 && w % 2 === 1)) {
            // If its a space layer (vertical hole) or a xy horizntoal hole, then use a diagChance
            return this._randomInt(this.constraints.diagChance) === 0 ? this.constraints.barrierCharacter : this.constraints.spaceCharacter
          }
        }
        return cellValue
      }
      this._mapMaze(this.barrierMaze, checkBarriers)
      // Cleans barriers not touching anything else
      const cleanBarriers = (cellValue, d, h, w) => {
        let tempSurrondingValues = this._findSurrondingValues(d, h, w, this.barrierMaze)
        if (cellValue === this.constraints.barrierCharacter) {
          let flag = false
          for (let key of Object.keys(tempSurrondingValues)) {
            if (tempSurrondingValues[key].value === this.constraints.barrierCharacter) {
              flag = true
            }
          }
          return flag ? cellValue : ' '
        }
        return cellValue
      }
      this._mapMaze(this.barrierMaze, cleanBarriers)
    }
    /** 
    * @public @function solveMaze - Solves the maze given a start and end coordinate. Stores results in this.path DRC (ZYX) order.
    * @param {Array} start - 1D Array in DRC (ZYX) order for where the path should start
    * @param {Array} end - 1D Array in DRC (ZYX) order for where the path should end
    * @returns void
    */
    solveMaze(start, end, type) {
      this.solveResponse = 0;
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
        this._isCharBlockade(this.barrierMaze[start[0]][start[1]][start[2]]) ||
        this._isCharBlockade(this.barrierMaze[end[0]][end[1]][end[2]])
      ) {
        throw new TypeError(
          "solveMaze Error 3: Start and/or End Occupied with barrier or void"
        );
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
            if (
              tempSurrondingValues[key].value === this.constraints.spaceCharacter
            ) {
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
        this.barrierMaze[end[0]][end[1]][end[2]] <=
        this.barrierMaze[start[0]][start[1]][start[2]]
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
        typeof cellValue === "number" ? this.constraints.spaceCharacter : cellValue
      );
    }
    /** 
      * @public @function traceMazeWithPath - Traces the path of the maze on the 3D Matrix using the constraints path symbol. Stored in this.tracedBarrierMaze.
      * @returns void
      */
    traceMazeWithPath() {
      if (this.path.length === 0) {
        throw new TypeError("Failed to Trace Maze: Path length is zero")
      }
      this.tracedBarrierMaze = this._deepCopy(this.barrierMaze)
      this._mapMaze(this.tracedBarrierMaze, (cellValue, d, h, w) => {
        for (let i = 0; i < this.path.length; i++) {
          if (this.path[i][0] === d && this.path[i][1] === h && this.path[i][2] === w) {
            return this.constraints.pathCharacter
          }
        }
        return cellValue
      })
    }
  }