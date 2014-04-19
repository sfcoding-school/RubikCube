// element: a jQuery object containing the DOM element to use
// dimensions: the number of cubes per row/column (default 3)
// background: the scene background colour
function Rubik(element, dimensions) {

  dimensions = dimensions || 3;
  background = 0x000000;

  var width = element.innerWidth(),
      height = element.innerHeight();

  var debug = false;
	  
	
               

  /*** three.js boilerplate ***/
  var scene = new THREE.Scene(),
      camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000),
      renderer = new THREE.WebGLRenderer({ antialias: true });
		
renderer.setClearColor(background, 20.0);
  renderer.setSize(width, height);
  renderer.shadowMapEnabled = true;
  element.append(renderer.domElement);
	
  camera.position = new THREE.Vector3(-5, 5, 14);
  camera.lookAt(scene.position);
  THREE.Object3D._threexDomEvent.camera(camera);
	
  /*** Lights ***/
  scene.add(new THREE.AmbientLight(0xffffff));
  //TODO: add a spotlight that takes the orbitcontrols into account to stay "static"

  /*** Camera controls ***/

  var orbitControl = new THREE.OrbitControls(camera, renderer.domElement);

  function enableCameraControl() {
    orbitControl.noRotate = false;
  }

  function disableCameraControl() {
    orbitControl.noRotate = true;
  }

  /*** Debug aids ***/  
 /* if(debug) {
    scene.add(new THREE.AxisHelper( 20 ));
  }*/

  /*** Click handling ***/

  //Do the given coordinates intersect with any cubes?
  var SCREEN_HEIGHT = window.innerHeight;
  var SCREEN_WIDTH = window.innerWidth;

  var raycaster = new THREE.Raycaster(),
      projector = new THREE.Projector();

  function isMouseOverCube(mouseX, mouseY) {
    var directionVector = new THREE.Vector3();

    //Normalise mouse x and y
    var x = ( mouseX / SCREEN_WIDTH ) * 2 - 1;
    var y = -( mouseY / SCREEN_HEIGHT ) * 2 + 1;

    directionVector.set(x, y, 1);

    projector.unprojectVector(directionVector, camera);
    directionVector.sub(camera.position);
    directionVector.normalize();
    raycaster.set(camera.position, directionVector);

    return raycaster.intersectObjects(allCubes, true).length > 0;
  }

  //Return the axis which has the greatest maginitude for the vector v
  function principalComponent(v) {
    var maxAxis = 'x',
        max = Math.abs(v.x);
    if(Math.abs(v.y) > max) {
      maxAxis = 'y';
      max = Math.abs(v.y);
    }
    if(Math.abs(v.z) > max) {
      maxAxis = 'z';
      max = Math.abs(v.z);
    }
    return maxAxis;
  }

  //For each mouse down, track the position of the cube that
  // we clicked (clickVector) and the face object that we clicked on 
  // (clickFace)
  var clickVector, clickFace;

  //Keep track of the last cube that the user's drag exited, so we can make
  // valid movements that end outside of the Rubik's cube
  var lastCube;

  var onCubeMouseDown = function(e, cube) {
    disableCameraControl();

    //Maybe add move check in here
    if(true || !isMoving) {
      clickVector = cube.rubikPosition.clone();
      
      var centroid = e.targetFace.centroid.clone();
      centroid.applyMatrix4(cube.matrixWorld);

      //Which face (of the overall cube) did we click on?
      if(nearlyEqual(Math.abs(centroid.x), maxExtent))
        clickFace = 'x';
      else if(nearlyEqual(Math.abs(centroid.y), maxExtent))
        clickFace = 'y';
      else if(nearlyEqual(Math.abs(centroid.z), maxExtent))
        clickFace = 'z';    
    }  
	console.log(clickFace);
  };

  //Matrix of the axis that we should rotate for 
  // each face-drag action
  //    F a c e
  // D    X Y Z
  // r  X - Z Y
  // a  Y Z - X
  // g  Z Y X -
  var transitions = {
    'x': {'y': 'z', 'z': 'y'},
    'y': {'x': 'z', 'z': 'x'},
    'z': {'x': 'y', 'y': 'x'}
  }

	
  var onCubeMouseUp = function(e, cube) {

    if(clickVector) {
      //TODO: use the actual mouse end coordinates for finer drag control
      var dragVector = cube.rubikPosition.clone();
      dragVector.sub(clickVector);
		console.log(dragVector.length());
      //Don't move if the "drag" was too small, to allow for 
      // click-and-change-mind.
      if(dragVector.length() > cubeSize	) {

        //Rotate with the most significant component of the drag vector
        // (excluding the current axis, because we can't rotate that way)
        var dragVectorOtherAxes = dragVector.clone();
        dragVectorOtherAxes[clickFace] = 0;

        var maxAxis = principalComponent(dragVectorOtherAxes);

        var rotateAxis = transitions[clickFace][maxAxis],
            direction = dragVector[maxAxis] >= 0 ? 1 : -1;
        
        //Reverse direction of some rotations for intuitive control
        //TODO: find a general solution!
        if(clickFace == 'z' && rotateAxis == 'x' || 
           clickFace == 'x' && rotateAxis == 'z' ||
           clickFace == 'y' && rotateAxis == 'z')
          direction *= -1;

        if(clickFace == 'x' && clickVector.x > 0 ||
           clickFace == 'y' && clickVector.y < 0 ||
           clickFace == 'z' && clickVector.z < 0)
          direction *= -1;

        pushMove(cube, clickVector.clone(), rotateAxis, direction);
        startNextMove();
        enableCameraControl();
      } else {
        console.log("Non sono entrato nel ciclo ");
      }
    }
  };

  //If the mouse was released outside of the Rubik's cube, use the cube that the mouse 
  // was last over to determine which move to make
  var onCubeMouseOut = function(e, cube) {
    //TODO: there is a possibility that, at some rotations, we may catch unintentional
    // cubes on the way out. We should check that the selected cube is on the current
    // drag vector.
    lastCube = cube;
	
  }

  element.on('mouseup', function(e) {
    if(!isMouseOverCube(e.clientX, e.clientY)) {
      if(lastCube)
        onCubeMouseUp(e, lastCube);
    }
  });
  /*** skybox ***/

		var geometry = new THREE.SphereGeometry(100, 60, 40);

		var skyBoxMaterial = new THREE.MeshBasicMaterial({ side: THREE.BackSide, map: THREE.ImageUtils.loadTexture('0005.jpg') });

		skyBox = new THREE.Mesh(geometry, skyBoxMaterial);

		scene.add(skyBox);	   
  

	
  /*** Build 27 cubes ***/
  //TODO: colour the insides of all of the faces black
  // (probably colour all faces black to begin with, then "whitelist" exterior faces)


  var cubeSize = 0.5;
    

  var maxExtent = (cubeSize * dimensions ) , 
      allCubes = [];

		loader = new THREE.JSONLoader();

		loader.load( "cubo.js", function( geometry,material ) {
		
		
		var positionOffset = (dimensions  - 1) / 2;
		  for(var i = 0; i < dimensions ; i ++) {
			for(var j = 0; j < dimensions ; j ++) {
			  for(var k = 0; k < dimensions ; k ++) {
				
				var x = (i - positionOffset) ,
					y = (j - positionOffset) ,
					z = (k - positionOffset) ;

				var cube = new THREE.Mesh( geometry, new THREE.MeshFaceMaterial(material) );
				cube.scale.set(cubeSize,cubeSize,cubeSize);
				cube.position = new THREE.Vector3(x, y, z);
					
				cube.rubikPosition = cube.position.clone();
				
				
				cube.on('mousedown', function(e) {
					
				  onCubeMouseDown(e, e.target);
				  
				});

				cube.on('mouseup', function(e) {
					
				  onCubeMouseUp(e, e.target);
				});

				cube.on('mouseout', function(e) {
				   
				  onCubeMouseOut(e, e.target);
				});
				
				scene.add(cube);
				allCubes.push(cube);
			  }
			}
		  }
	
		} );

  /*** Manage transition states ***/

  //TODO: encapsulate each transition into a "Move" object, and keep a stack of moves
  // - that will allow us to easily generalise to other states like a "hello" state which
  // could animate the cube, or a "complete" state which could do an animation to celebrate
  // solving.
  var moveEvents = $({});

  //Maintain a queue of moves so we can perform compound actions like shuffle and solve
  var moveQueue = [],
      completedMoveStack = [],
      currentMove;

  //Are we in the middle of a transition?
  var isMoving = false,
      moveAxis, moveN, moveDirection,
      rotationSpeed = 0.2	;

  //http://stackoverflow.com/questions/20089098/three-js-adding-and-removing-children-of-rotated-objects
  var pivot = new THREE.Object3D(),
      activeGroup = [];

  function nearlyEqual(a, b, d) {
    d = d || 0.30;
    return Math.abs(a - b) <= d;
  }

  //Select the plane of cubes that aligns with clickVector
  // on the given axis
  function setActiveGroup(axis) {
    if(clickVector) {
      activeGroup = [];

      allCubes.forEach(function(cube) {
        if(nearlyEqual(cube.rubikPosition[axis], clickVector[axis])) { 
          activeGroup.push(cube);
        }
      });
    } else {
      console.log("Nothing to move!");
    }
  }

  var pushMove = function(cube, clickVector, axis, direction) {
    moveQueue.push({ cube: cube, vector: clickVector, axis: axis, direction: direction });
  }

  var startNextMove = function() {
	
    var nextMove = moveQueue.pop();
	
    if(nextMove) {
      clickVector = nextMove.vector;
      
      var direction = nextMove.direction || 1,
          axis = nextMove.axis;

      if(clickVector) {

        if(!isMoving) {
          isMoving = true;
          moveAxis = axis;
          moveDirection = direction;

          setActiveGroup(axis);

          pivot.rotation.set(0,0,0);
          pivot.updateMatrixWorld();
          scene.add(pivot);

          activeGroup.forEach(function(e) {
            THREE.SceneUtils.attach(e, scene, pivot);
          });

          currentMove = nextMove;
		  /***  apply sound ***/
		  audio = document.createElement('audio');
		  source = document.createElement('source');
			source.src = 'sound/cube1.mp3';
			audio.appendChild(source);
			audio.play();
        } else {
          console.log("Already moving!");
        }
      } else {
        console.log("Nothing to move!");
      }
    } else {
      moveEvents.trigger('deplete');
    }
  }

  function doMove() {
    //Move a quarter turn then stop
    if(pivot.rotation[moveAxis] >= Math.PI / 2) {
      //Compensate for overshoot. TODO: use a tweening library
      pivot.rotation[moveAxis] = Math.PI / 2;
      moveComplete();
    } else if(pivot.rotation[moveAxis] <= Math.PI / -2) {
      pivot.rotation[moveAxis] = Math.PI / -2;
      moveComplete()
    } else {
      pivot.rotation[moveAxis] += (moveDirection * rotationSpeed);
    }
  }

  var moveComplete = function() {
    isMoving = false;
    moveAxis, moveN, moveDirection = undefined;
    clickVector = undefined;

    pivot.updateMatrixWorld();
    scene.remove(pivot);
    activeGroup.forEach(function(cube) {
      cube.updateMatrixWorld();

      cube.rubikPosition = cube.position.clone();
      cube.rubikPosition.applyMatrix4(pivot.matrixWorld);

      THREE.SceneUtils.detach(cube, pivot, scene);
    });

    completedMoveStack.push(currentMove);

    moveEvents.trigger('complete');

    //Are there any more queued moves?
    startNextMove();
  }


  function render() {

    //States
    //TODO: generalise to something like "activeState.tick()" - see comments 
    // on encapsulation above
    if(isMoving) {
      doMove();
    } 

    renderer.render(scene, camera);
    requestAnimationFrame(render);
  }

  /*** Util ***/
  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  //Go!
  render();

  //Public API
  return {
    shuffle: function() {
      function randomAxis() {
        return ['x', 'y', 'z'][randomInt(0,2)];
      }

      function randomDirection() {
        var x = randomInt(0,1);
        if(x == 0) x = -1;
        return x;
      }

      function randomCube() {
        var i = randomInt(0, allCubes.length - 1);
        //TODO: don't return a centre cube
        return allCubes[i];
      }

      var nMoves = randomInt(10, 40);
      for(var i = 0; i < nMoves; i ++) {
        //TODO: don't reselect the same axis?
        var cube = randomCube();
        pushMove(cube, cube.position.clone(), randomAxis(), randomDirection());
      }

      startNextMove();
    },

    //A naive solver - step backwards through all completed steps
    solve: function() {
      if(!isMoving) {
        completedMoveStack.forEach(function(move) {
          pushMove(move.cube, move.vector, move.axis, move.direction * -1);
        });

        //Don't remember the moves we're making whilst solving
        completedMoveStack = [];

        moveEvents.one('deplete', function() {
          completedMoveStack = [];
        });

        startNextMove();
      }
    },

    //Rewind the last move
    undo: function() {
      if(!isMoving) {
        var lastMove = completedMoveStack.pop();
        if(lastMove) {
          //clone
          var stackToRestore = completedMoveStack.slice(0);
          pushMove(lastMove.cube, lastMove.vector, lastMove.axis, lastMove.direction * -1);

          moveEvents.one('complete', function() {
            completedMoveStack = stackToRestore;
          });

          startNextMove();
        }
      }
    }
  }
}

