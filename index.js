import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import orderRoutes from './routes/orderRoutes.js';
import stockRoutes from './routes/stockRoutes.js';
import socketHandler from './sockets/socketHandler.js';

dotenv.config();
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.use(cors());
app.use(express.json());

// REST API Routes
app.use('/api', orderRoutes);
app.use('/api', stockRoutes);

// Socket Handler
socketHandler(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, async () => {
  console.log(`Server running at http://localhost:${PORT}`);
});