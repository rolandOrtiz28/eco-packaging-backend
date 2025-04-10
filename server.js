// index.js
require("dotenv").config();

const express = require("express");
const app = express();
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { body, validationResult } = require('express-validator');
const mongoSanitize = require('mongo-sanitize');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const passport = require('passport');
const { Server } = require('socket.io');
const isProduction = process.env.NODE_ENV === "production";
const secret = process.env.SESSION_SECRET;

// CORS Configuration
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      "http://localhost:8080",
      "https://your-production-url.com",
    ];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));

app.use((req, res, next) => {
  res.on('finish', () => {
    const headers = res.getHeaders();
    console.log(`[${req.method}] ${req.originalUrl} =>`, {
      'Set-Cookie': headers['set-cookie'],
      'Access-Control-Allow-Origin': headers['access-control-allow-origin'],
    });
  });
  next();
});

// Security Headers (Helmet)
const frameSrcUrls = [
  "https://js.stripe.com/",
  "https://www.sandbox.paypal.com/",
];

const scriptSrcUrls = [
  "https://js.stripe.com/",
  "https://cdn.jsdelivr.net/",
  "https://cdnjs.cloudflare.com/",
];

const styleSrcUrls = [
  "https://cdn.jsdelivr.net/",
  "https://fonts.googleapis.com/",
  "https://cdnjs.cloudflare.com/",
];

const connectSrcUrls = [
  "https://api.stripe.com/",
  "https://fonts.gstatic.com/",
];

const imgSrcUrls = [
  "https://images.unsplash.com/",
  "https://cdn.jsdelivr.net/",
  "https://res.cloudinary.com/",
];

const fontSrcUrls = [
  "https://fonts.gstatic.com/",
  "https://cdn.jsdelivr.net/",
];

const mediaSrcUrls = [
  "'self'",
  "blob:",
];

app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'", "blob:"],
      formAction: ["'self'"],
      frameSrc: ["'self'", ...frameSrcUrls],
      connectSrc: ["'self'", ...connectSrcUrls],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", ...scriptSrcUrls],
      scriptSrcElem: ["'self'", "'unsafe-inline'", "'unsafe-eval'", ...scriptSrcUrls],
      styleSrc: ["'self'", "'unsafe-inline'", ...styleSrcUrls],
      styleSrcElem: ["'self'", "'unsafe-inline'", ...styleSrcUrls],
      workerSrc: ["'self'", "blob:"],
      objectSrc: [],
      imgSrc: ["'self'", "blob:", "data:", ...imgSrcUrls],
      fontSrc: ["'self'", ...fontSrcUrls, "data:"],
      mediaSrc: [...mediaSrcUrls],
      "script-src-attr": ["'unsafe-inline'"],
    },
  })
);

// Rate Limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 500 : 1000,
  message: "Too many requests, please try again later.",
  keyGenerator: (req) => req.ip,
});

app.use(generalLimiter);

// Security Middleware
app.use((req, res, next) => {
  req.query = mongoSanitize(req.query);
  req.body = mongoSanitize(req.body);
  req.params = mongoSanitize(req.params);
  next();
});

// Database Connection
const dbUrl = process.env.NODE_ENV === "production" ? process.env.DB_URL : process.env.DB_URL_DEV;
mongoose.connect(dbUrl, {
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
}).then(() => console.log("✅ Database Connected"))
  .catch((err) => {
    console.error("❌ MongoDB Connection Error:", err);
    process.exit(1);
  });

const db = mongoose.connection;
db.on("error", (err) => {
  console.error("❌ MongoDB Connection Error:", err);
});
db.once("open", () => {
  console.log("✅ MongoDB Connection Established");
});

const store = new MongoDBStore({
  uri: dbUrl,
  collection: "sessions",
});
store.on("connected", () => {
  console.log("✅ MongoDB session store connected");
});

store.on("error", (error) => {
  console.error("❌ Session store error:", error);
});

// Session Configuration
app.use(
  session({
    secret: secret,
    name: "_editEdge",
    resave: false,
    saveUninitialized: false,
    store: store,
    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    },
  })
);

// Initialize Passport
require('./config/passport');
app.use(passport.initialize());
app.use(passport.session());

// Middleware
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));
app.use(express.json({ limit: "10mb" }));
app.set("trust proxy", 1);

// Request Logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${req.ip}`);
  next();
});

// API Routes
app.use("/api", require("./routes/auth"));
app.use("/api", require("./routes/products"));
app.use("/api", require("./routes/blogPosts"));
app.use("/api", require("./routes/users"));
app.use("/api", require("./routes/analytics"));
app.use("/api", require("./routes/leads"));
app.use("/api", require("./routes/chat"));
app.use("/api/order", require("./routes/orders"));
app.use('/api/promo', require('./routes/promo'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api', require('./routes/subscribers'));

if (process.env.NODE_ENV === 'production') {
  const path = require('path');
  app.use(express.static(path.join(__dirname, 'client', 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'));
  });
}

app.use((req, res) => {
  const message = `404 Not Found: ${req.method} ${req.originalUrl}`;
  console.error(message);
  res.status(404).json({ error: "Not Found" });
});

// Error Handling
app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("🔥 Unhandled Rejection at:", promise, "reason:", reason);
});

// Start Server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT} in ${process.env.NODE_ENV || "development"} mode`);
});

// Socket.IO setup
const io = require('socket.io')(server, {
  cors: {
    origin: "http://localhost:8080",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.set('io', io);

const Chat = require('./models/Chat');
const sendEmail = require('./utils/sendEmail');

// Track active chats and last message timestamps for inactivity timeout
const activeChats = new Map(); // userId -> { socketId, timeout }

io.on('connection', (socket) => {
  console.log('Server: A client connected:', socket.id);

  socket.on('admin-login', () => {
    console.log('Server: Admin logged in:', socket.id);
    socket.join('admins');
    console.log('Server: Admin joined admins room');
  });

  socket.on('join-room', (userId) => {
    console.log('Server: Client joined room:', { userId, socketId: socket.id });
    socket.join(userId);
  });

  socket.on('leave-room', (userId) => {
    console.log('Server: Client leaving room:', { userId, socketId: socket.id });
    socket.leave(userId);
  });

  socket.on('request-human', async (data) => {
    console.log('Server: Request human received:', data);
    const chat = await Chat.findOne({ userId: data.userId });
    if (chat) {
      const hasPendingRequest = chat.messages.some(msg => 
        msg.text.includes('Your request has been sent to a human agent') && 
        !chat.messages.some(m => m.text === 'A human agent has joined the chat!')
      );

      const adminRoom = io.sockets.adapter.rooms.get('admins');
      const adminCount = adminRoom ? adminRoom.size : 0;
      console.log('Server: Number of admins in room:', adminCount);

      if (adminCount === 0) {
        console.log('Server: No admins available, notifying user:', data.userId);
        io.to(data.userId).emit('no-admins', {
          message: 'Sorry, it looks like our team is currently unavailable. Please provide your email, and we’ll follow up with you soon!',
        });
        return;
      }

      console.log('Server: Emitting chat-notification to admins');
      io.to('admins').emit('chat-notification', {
        userId: data.userId,
        name: data.name,
        email: data.email,
        message: 'User has requested to talk to a human.',
      });

      if (!hasPendingRequest) {
        console.log('Server: Emitting chat-request to admins');
        io.to('admins').emit('chat-request', {
          userId: data.userId,
          socketId: socket.id,
          name: data.name,
          email: data.email,
          message: data.message,
        });
      }
    }
  });

  socket.on('accept-chat', (data) => {
    console.log('Server: Admin accepted chat:', data);
    if (activeChats.has(data.userId)) {
      const existingChat = activeChats.get(data.userId);
      clearTimeout(existingChat.timeout);
    }

    console.log('Server: Emitting human-connected to userId room:', data.userId);
    io.to(data.userId).emit('human-connected', {
      message: 'A human agent has joined the chat!',
    });

    const timeout = setTimeout(() => {
      console.log('Server: Inactivity timeout triggered for userId:', data.userId);
      io.to(data.userId).emit('inactivity-disconnect', {
        message: "You’ve been disconnected due to inactivity. Type 'talk to human' to reconnect.",
      });
      activeChats.delete(data.userId);
    }, 300000); // 5 minutes

    activeChats.set(data.userId, { socketId: socket.id, timeout });
  });

  socket.on('user-message', async (data) => {
    console.log('Server: User message received:', data);
    console.log('Server: Broadcasting message to room:', data.userId);
    io.to(data.userId).emit('message', {
      text: data.message,
      sender: 'user',
      timestamp: data.timestamp || new Date(),
      userId: data.userId,
      name: data.name,
    });

    if (activeChats.has(data.userId)) {
      const chatData = activeChats.get(data.userId);
      clearTimeout(chatData.timeout);
      chatData.timeout = setTimeout(() => {
        console.log('Server: Inactivity timeout triggered for userId:', data.userId);
        io.to(data.userId).emit('inactivity-disconnect', {
          message: "You’ve been disconnected due to inactivity. Type 'talk to human' to reconnect.",
        });
        activeChats.delete(data.userId);
      }, 300000);
      activeChats.set(data.userId, chatData);
    }

    try {
      const chat = await Chat.findOne({ userId: data.userId });
      if (chat) {
        chat.messages.push({
          text: data.message,
          sender: 'user',
          timestamp: new Date(data.timestamp),
        });
        await chat.save();
        console.log('Server: User message saved to database:', data.message);
      } else {
        console.log('Server: No chat session found for userId:', data.userId);
      }
    } catch (error) {
      console.error('Server: Error saving user message:', error);
    }
  });

  socket.on('admin-message', async (data) => {
    console.log('Server: Admin message received:', data);
    console.log('Server: Broadcasting admin message to room:', data.userId);
    io.to(data.userId).emit('message', {
      text: data.message,
      sender: data.sender || 'admin',
      timestamp: data.timestamp || new Date(),
      userId: data.userId,
      name: data.name,
    });

    if (activeChats.has(data.userId)) {
      const chatData = activeChats.get(data.userId);
      clearTimeout(chatData.timeout);
      chatData.timeout = setTimeout(() => {
        console.log('Server: Inactivity timeout triggered for userId:', data.userId);
        io.to(data.userId).emit('inactivity-disconnect', {
          message: "You’ve been disconnected due to inactivity. Type 'talk to human' to reconnect.",
        });
        activeChats.delete(data.userId);
      }, 300000);
      activeChats.set(data.userId, chatData);
    }

    try {
      const chat = await Chat.findOne({ userId: data.userId });
      if (chat) {
        chat.messages.push({
          text: data.message,
          sender: 'admin',
          timestamp: new Date(data.timestamp),
        });
        await chat.save();
        console.log('Server: Admin message saved to database:', data.message);
      }
    } catch (error) {
      console.error('Server: Error saving admin message:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('Server: A client disconnected:', socket.id);
    if (socket.rooms.has('admins')) {
      io.to('waiting-users').emit('no-admins', {
        message: 'Sorry, it looks like our team is currently unavailable. Please provide your email, and we’ll follow up with you soon!',
      });
    }
  });
});

// Export activeChats for use in routes
app.set('activeChats', activeChats);

// Graceful Shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received: closing server");
  server.close(() => {
    mongoose.connection.close();
    console.log("Server closed");
    process.exit(0);
  });
});



// base