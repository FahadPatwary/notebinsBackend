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
    const savedNotes = await SavedNote.find().sort({ createdAt: -1 });

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
    if (error instanceof Error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to fetch saved notes",
        details: error.message,
      });
    } else {
      res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to fetch saved notes",
      });
    }
  }
});

// GET a specific note with password check
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { password } = req.query;

    // Include password field in query to check protection
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
          message: "Password required to access this note",
          isPasswordProtected: true,
        });
      }

      if (!verifyPassword(password as string, note.password)) {
        return res.status(401).json({
          error: "Unauthorized",
          message: "Incorrect password",
          isPasswordProtected: true,
        });
      }
    }

    // Decompress content if needed
    const content = await decompressContent(note.content, note.isCompressed);

    res.json({
      ...note.toObject(),
      content,
      password: undefined,
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
    const { title, content, noteId, url } = req.body;

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
      console.log(`Note with noteId ${noteId} exists, updating...`);
      // If note exists, update it
      const { compressedContent, isCompressed } = await compressContent(
        content
      );

      const updatedNote = await SavedNote.findByIdAndUpdate(
        existingNote._id,
        {
          title,
          content: compressedContent,
          isCompressed,
          contentLength: content.length,
          url, // Update URL in case it changed
          $set: { expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) }, // Reset expiration
        },
        { new: true }
      );

      if (!updatedNote) {
        throw new Error("Failed to update existing note");
      }

      // Return decompressed content in response
      const decompressedContent = await decompressContent(
        updatedNote.content,
        updatedNote.isCompressed
      );

      return res.status(200).json({
        ...updatedNote.toObject(),
        content: decompressedContent,
        isNew: false,
      });
    }

    console.log(`Creating new note with noteId ${noteId}`);
    // If note doesn't exist, create new one
    const { compressedContent, isCompressed } = await compressContent(content);

    const savedNote = new SavedNote({
      title,
      content: compressedContent,
      noteId,
      url,
      isCompressed,
      contentLength: content.length,
    });

    const saved = await savedNote.save();
    console.log("Note saved successfully:", saved._id);

    // Return decompressed content in response
    const decompressedContent = await decompressContent(
      saved.content,
      saved.isCompressed
    );

    res.status(201).json({
      ...saved.toObject(),
      content: decompressedContent,
      isNew: true,
    });
  } catch (error) {
    console.error("Error saving note:", error);
    if (error instanceof Error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to save note",
        details: error.message,
      });
    } else {
      res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to save note",
      });
    }
  }
});

// DELETE saved note with password check
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    // Include password field in query to check protection
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
    if (error instanceof Error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to delete note",
        details: error.message,
      });
    } else {
      res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to delete note",
      });
    }
  }
});

// Add route to check if note exists for a noteId
router.get("/check/:noteId", async (req: Request, res: Response) => {
  try {
    const { noteId } = req.params;
    const note = await SavedNote.findOne({ noteId });

    if (!note) {
      return res.status(404).json({
        error: "Not Found",
        message: "Note not found",
      });
    }

    // Return the note without content to save bandwidth
    const { content, ...noteWithoutContent } = note.toObject();
    res.json(noteWithoutContent);
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
