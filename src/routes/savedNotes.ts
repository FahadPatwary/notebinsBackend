import express, { Request, Response } from "express";
import { SavedNote } from "../models/SavedNote";
import {
  compressContent,
  decompressContent,
  verifyPassword,
} from "../utils/noteUtils";

const router = express.Router();

// GET all saved notes
router.get("/", async (req: Request, res: Response) => {
  try {
    console.log("Fetching saved notes...");
    const savedNotes = await SavedNote.find({})
      .select("-password") // Exclude password field
      .sort({ updatedAt: -1 });

    // Decompress content if needed
    const decompressedNotes = await Promise.all(
      savedNotes.map(async (note) => {
        const content = await decompressContent(
          note.content,
          note.isCompressed
        );
        return {
          ...note.toObject(),
          content,
          isPasswordProtected: !!note.password,
        };
      })
    );

    console.log(`Found ${savedNotes.length} saved notes`);
    res.json(decompressedNotes);
  } catch (error) {
    console.error("Error fetching saved notes:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch saved notes",
    });
  }
});

// GET a specific note
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let password = req.query.password;

    // Find note without password field
    const note = await SavedNote.findById(id);

    if (!note) {
      return res.status(404).json({
        error: "Not Found",
        message: "Note not found",
      });
    }

    // Check if password is an array and extract the first element
    if (Array.isArray(password)) {
      password = password[0]; // Get the first element if it's an array
    }

    // Ensure password is a string
    if (typeof password !== 'string') {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid password format",
      });
    }

    // Decompress content if needed
    const content = await decompressContent(note.content, note.isCompressed);

    res.json({
      ...note.toObject(),
      content,
    });
  } catch (error) {
    console.error("Error fetching note:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch note",
    });
  }
});

// POST new saved note
router.post("/", async (req: Request, res: Response) => {
  try {
    console.log("Received save note request");
    const { title, content, noteId, url, password } = req.body;

    if (!title || !content || !noteId || !url) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Missing required fields",
        required: ["title", "content", "noteId", "url"],
        received: req.body,
      });
    }

    // Check if note already exists with this noteId
    const existingNote = await SavedNote.findOne({ noteId });
    if (existingNote) {
      return res.status(409).json({
        error: "Conflict",
        message: "Note with this ID already exists",
      });
    }

    // Compress content if needed
    const { compressedContent, isCompressed } = await compressContent(content);

    const newNote = new SavedNote({
      title,
      content: compressedContent,
      noteId,
      url,
      password,
      isCompressed,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await newNote.save();
    console.log("Saved new note:", newNote);
    res.status(201).json(newNote);
  } catch (error) {
    console.error("Error saving note:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to save note",
    });
  }
});

// DELETE a saved note
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { password } = req.query;

    const note = await SavedNote.findById(id).select("+password");

    if (!note) {
      return res.status(404).json({
        error: "Not Found",
        message: "Note not found",
      });
    }

    // Check password if note is protected
    if (note.isPasswordProtected && note.password) {
      if (!password) {
        return res.status(401).json({
          error: "Unauthorized",
          message: "Password required to delete this note",
          isPasswordProtected: true,
        });
      }

      if (!verifyPassword(password, note.password)) {
        return res.status(401).json({
          error: "Unauthorized",
          message: "Incorrect password",
          isPasswordProtected: true,
        });
      }
    }

    await SavedNote.findByIdAndDelete(id);
    console.log("Note deleted successfully:", id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting saved note:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to delete note",
    });
  }
});

// Add route to check if note exists for a noteId
router.get("/check/:noteId", async (req: Request, res: Response) => {
  try {
    const { noteId } = req.params;
    const note = await SavedNote.findOne({ noteId }).select(
      "-password -content"
    );

    if (!note) {
      return res.status(404).json({
        error: "Not Found",
        message: "Note not found",
      });
    }

    res.json({
      ...note.toObject(),
      isPasswordProtected: !!note.password,
    });
  } catch (error) {
    console.error("Error checking note existence:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to check note existence",
    });
  }
});

// Update existing note
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, content, noteId } = req.body;

    if (!title || !content || !noteId) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Missing required fields",
      });
    }

    // Compress content if needed
    const { compressedContent, isCompressed } = await compressContent(content);

    const updatedNote = await SavedNote.findByIdAndUpdate(
      id,
      {
        title,
        content: compressedContent,
        isCompressed,
        contentLength: content.length,
        $set: { expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) }, // Reset expiration
      },
      { new: true }
    );

    if (!updatedNote) {
      return res.status(404).json({
        error: "Not Found",
        message: "Note not found",
      });
    }

    // Return decompressed content in response
    const decompressedContent = await decompressContent(
      updatedNote.content,
      updatedNote.isCompressed
    );

    res.json({
      ...updatedNote.toObject(),
      content: decompressedContent,
    });
  } catch (error) {
    console.error("Error updating note:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to update note",
    });
  }
});

export default router;
