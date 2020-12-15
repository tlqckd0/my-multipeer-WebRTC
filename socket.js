module.exports = (io)=>{
    io.on('connection', function(socket){
        //console.log(socket.id);
        io.sockets.emit("user-joined", socket.id, io.engine.clientsCount, Object.keys(io.sockets.clients().sockets));
    
        socket.on('signal', (toId, message) => {
            io.to(toId).emit('signal', socket.id, message);
          });
    
        socket.on("message", function(data){
            io.sockets.emit("broadcast-message", socket.id, data);
        })
    
        socket.on('disconnect', function() {
            io.sockets.emit("user-left", socket.id);
        })
    });
}