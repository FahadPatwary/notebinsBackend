import cors from "cors";
import * as dotenv from "dotenv";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { storage } from "./storage";

dotenv.config();

// Interface for Note type
interface Note {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

// CORS Configuration
const allowedOrigins = [
  "https://www.notebins.me",
  "https://notebins.me",
  "http://localhost:5173",
  "http://localhost:3000",
];

const corsOptions = {
  origin: function (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (
      allowedOrigins.indexOf(origin) !== -1 ||
      process.env.NODE_ENV !== "production"
    ) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Accept", "Authorization"],
  maxAge: 600, // Cache preflight requests for 10 minutes
};

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Accept"],
  },
});

// Add debug middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log("Origin:", req.headers.origin);
  console.log("Headers:", req.headers);
  next();
});

// Configure CORS for Express
app.use(cors(corsOptions));

app.use(express.json());

// Root endpoint
app.get("/", (req, res) => {
  res.json({ message: "Welcome to NoteShare API" });
});

// Test endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Server is running",
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// Notes endpoints
app.post("/api/notes", (req, res) => {
  try {
    if (!req.body.content && req.body.content !== "") {
      return res.status(400).json({
        error: "Content field is required",
        message: "Please provide content for the note",
      });
    }

    const noteId = Math.random().toString(36).substring(7);
    const note: Note = {
      id: noteId,
      content: req.body.content,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    storage.set(noteId, note);
    console.log(`Created note: ${noteId}`);
    res.status(201).json(note);
  } catch (error) {
    console.error("Error creating note:", error);
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to create note. Please try again.",
    });
  }
});

app.get("/api/notes/:id", (req, res) => {
  try {
    const { id } = req.params;
    const note = storage.get(id);

    if (!note) {
      return res.status(404).json({
        error: "Not Found",
        message: "Note not found",
      });
    }

    res.json(note);
  } catch (error) {
    console.error("Error getting note:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to get note",
    });
  }
});

app.put("/api/notes/:id", (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content && content !== "") {
      return res.status(400).json({
        error: "Bad Request",
        message: "Content is required",
      });
    }

    const note = storage.get(id);
    if (!note) {
      return res.status(404).json({
        error: "Not Found",
        message: "Note not found",
      });
    }

    const updatedNote = {
      ...note,
      content,
      updatedAt: new Date(),
    };

    storage.set(id, updatedNote);
    console.log(`Updated note: ${id}`);

    // Broadcast the update to all connected clients in the room
    io.to(id).emit("note:update", { noteId: id, content });

    res.json(updatedNote);
  } catch (error) {
    console.error("Error updating note:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to update note",
    });
  }
});

// Socket.io connection handling
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("note:join", (noteId: string) => {
    socket.join(noteId);
    console.log(`User ${socket.id} joined note: ${noteId}`);

    // Send current note content to the newly joined user
    const note = storage.get(noteId);
    if (note) {
      socket.emit("note:update", { noteId, content: note.content });
    }
  });

  socket.on("note:leave", (noteId: string) => {
    socket.leave(noteId);
    console.log(`User ${socket.id} left note: ${noteId}`);
  });

  socket.on("note:update", (update: { noteId: string; content: string }) => {
    // Update the note in storage
    const note = storage.get(update.noteId);
    if (note) {
      storage.set(update.noteId, {
        ...note,
        content: update.content,
        updatedAt: new Date(),
      });
    }

    // Broadcast the update to all other clients in the room
    socket.to(update.noteId).emit("note:update", update);
    console.log(`Note ${update.noteId} updated by ${socket.id}`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 8080;

// Add error handling for the server
httpServer.on("error", (error: Error) => {
  console.error("Server error:", error);
  process.exit(1);
});

try {
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
    console.log(
      `Allowed origins: ${process.env.CLIENT_URL || "http://localhost:5173"}`
    );
  });
} catch (error) {
  console.error("Failed to start server:", error);
  process.exit(1);
}
