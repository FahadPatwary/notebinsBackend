import cors from "cors";
import * as dotenv from "dotenv";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

dotenv.config();

// In-memory store for notes
interface Note {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const notes: Map<string, Note> = new Map();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST", "PUT"],
  },
});

app.use(cors());
app.use(express.json());

// Root endpoint
app.get("/", (req, res) => {
  res.json({ message: "Welcome to NoteShare API" });
});

// Test endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Server is running" });
});

// Notes endpoints
app.post("/api/notes", (req, res) => {
  try {
    const noteId = Math.random().toString(36).substring(7);
    const note: Note = {
      id: noteId,
      content: req.body.content || "",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    notes.set(noteId, note);
    console.log(`Created note: ${noteId}`);
    res.status(201).json(note);
  } catch (error) {
    console.error("Error creating note:", error);
    res.status(500).json({ error: "Failed to create note" });
  }
});

app.get("/api/notes/:id", (req, res) => {
  try {
    const { id } = req.params;
    const note = notes.get(id);

    if (!note) {
      return res.status(404).json({ error: "Note not found" });
    }

    res.json(note);
  } catch (error) {
    console.error("Error getting note:", error);
    res.status(500).json({ error: "Failed to get note" });
  }
});

app.put("/api/notes/:id", (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: "Content is required" });
    }

    const note = notes.get(id);
    if (!note) {
      return res.status(404).json({ error: "Note not found" });
    }

    const updatedNote = {
      ...note,
      content,
      updatedAt: new Date(),
    };

    notes.set(id, updatedNote);
    console.log(`Updated note: ${id}`);

    // Broadcast the update to all connected clients in the room
    io.to(id).emit("note:update", { noteId: id, content });

    res.json(updatedNote);
  } catch (error) {
    console.error("Error updating note:", error);
    res.status(500).json({ error: "Failed to update note" });
  }
});

// Socket.io connection handling
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("note:join", (noteId: string) => {
    socket.join(noteId);
    console.log(`User ${socket.id} joined note: ${noteId}`);

    // Send current note content to the newly joined user
    const note = notes.get(noteId);
    if (note) {
      socket.emit("note:update", { noteId, content: note.content });
    }
  });

  socket.on("note:leave", (noteId: string) => {
    socket.leave(noteId);
    console.log(`User ${socket.id} left note: ${noteId}`);
  });

  socket.on("note:update", (update: { noteId: string; content: string }) => {
    // Update the note in memory
    const note = notes.get(update.noteId);
    if (note) {
      notes.set(update.noteId, {
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

const PORT = 8080;

// Add error handling for the server
httpServer.on("error", (error: Error) => {
  console.error("Server error:", error);
  process.exit(1);
});

try {
  httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log("Press Ctrl+C to stop");
  });
} catch (error) {
  console.error("Failed to start server:", error);
  process.exit(1);
}
