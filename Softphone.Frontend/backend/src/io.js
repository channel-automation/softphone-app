// Socket.IO module for real-time communication

let io;

// Initialize Socket.IO instance
function init(socketIo) {
  io = socketIo;
  return io;
}

// Get the Socket.IO instance
function getIO() {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
}

module.exports = {
  init,
  getIO
};
