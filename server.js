var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var path = require('path');
var cors = require('cors');
var _ = require('lodash');

app.use(cors());

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});


/* 
@rooms: array contains all the room, and users inside that room

rooms = [
  {
    name: "asdsad"
    num_user: 10, 
    userId: ["123213213", "1232132132131", "asdsadsadsa"] 
  }
]
*/

var rooms = [],
  num_client = 0;

io.on('connection', function (socket) {

  var currRoom;

  ++num_client;

  console.log(socket.id + " has joined");

  function createRoom(newRoom) {
    socket.join(newRoom);
    updateRoom('create', newRoom);
  }

  function joinRoom(room) {
    console.log(socket.id + " gonna join " + room);
    socket.join(room);
    updateRoom('join', room);
  }

  function leaveRoom(oldRoom) {
    var
      leaver = {
        id: socket.id,
        username: socket.id
      },
      room = getRoomByName(oldRoom);

    if (room) {
      socket.leave(oldRoom);
      socket.to(oldRoom).emit('leaveRoom', leaver);

      var userIndex = room.userId.indexOf(socket.id);

      if (userIndex >= 0) room.userId.splice(userIndex, 1);

      if (room.num_user > 0) {
        --room.num_user;
        console.log("gonna leave room " + oldRoom, rooms);
      }

      if (room.num_user === 0) {
        console.log("no user in room " + oldRoom + " left");
        var i = _.indexOf(rooms, room);
        rooms.splice(i, 1);
        console.log(rooms);
      }
    } else {
      return;
    }
  }

  function updateRoom(method, room) {

    if (method === 'create') {
      var createdRoom = {
        name: room,
        num_user: 1,
        userId: []
      }
      createdRoom.userId[0] = socket.id;
      rooms.push(createdRoom);
    }

    if (method === 'join') {
      var room_to_update = getRoomByName(room);
      room_to_update.num_user++;
      room_to_update.userId.push(socket.id);
    }

    currRoom = room;
    socket.emit('success', room);
  }

  function getRoomByName(roomName) {
    var room = _.find(rooms, { name: roomName })
    if (!room) return;

    return room;
  }

  function getRoomBySocketId(id) {
    return _.filter(rooms, function (room) {
      return room.userId.indexOf(id) === 0;
    })
  }

  function getRoomNumUser(room) {
    var room = getRoomByName(room);
    if (!room) return;

    return {
      length: room.userId.length,
      index: rooms.indexOf(room)
    }
  }

  socket.on('createRoom', function (room) {

    if (currRoom && room !== currRoom) {
      leaveRoom(currRoom);
    }

    if (getRoomByName(room)) {
      socket.to(socket.id).emit('message', 'Room already exist. Try creating a new one');
      return;
    }

    createRoom(room);
  })

  socket.on('joinRoom', function (room) {

    if (!getRoomByName(room)) {
      socket.emit('message', 'Room not exist. Better create a new one');
      return;
    }

    if (currRoom) {
      if (room !== currRoom) {
        leaveRoom(currRoom);
        console.log(rooms);
      }
      else {
        socket.to(socket.id).emit('message', 'You are already in this room');
        return;
      }
    }

    joinRoom(room);
    // console.log(socket.id + " is now in " + currRoom);
    console.log(rooms);
  })

  socket.on('disconnect', function () {
    leaveRoom(currRoom);
    --num_client;
    currRoom = undefined;

    // clear all room if no user present
    if (num_client === 0) {
      rooms = [];
    }
  });

  socket.on('mouseMove', function (data) {
    socket.in(data.room).emit('onMouseMove', {
      id: socket.id,
      mouseMoveData: data
    });
  });

  socket.on('mouseClick', function (data) {
    socket.in(data.room).emit('onMouseClick', {
      id: socket.id,
      mouseClickData: data
    });
  });

  socket.on('mouseScroll', function (data) {
    socket.in(data.room).emit('onMouseScroll', {
      id: socket.id,
      mouseScrollData: data
    });
  });

  socket.on('inputChanged', function (data) {
    socket.in(data.room).emit('onInputChanged', {
      id: socket.id,
      inputData: data
    })
  });

});

const port = process.env.PORT || 9999;
server.listen(port, function () {
  console.log('Example app listening on port ' + port);
});