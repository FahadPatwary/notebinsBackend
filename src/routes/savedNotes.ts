import express from "express";
import { SavedNote } from "../models/SavedNote";

const router = express.Router();

// GET all saved notes
router.get("/", async (req, res) => {
  try {
    console.log("Fetching saved notes...");
    const savedNotes = await SavedNote.find().sort({ createdAt: -1 });
    console.log(`Found ${savedNotes.length} saved notes`);
    res.json(savedNotes);
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

// POST new saved note
router.post("/", async (req, res) => {
  try {
    console.log("Received save note request:", req.body);
    const { title, content, noteId, url } = req.body;

    if (!title || !content || !noteId || !url) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Missing required fields",
        required: ["title", "content", "noteId", "url"],
        received: req.body,
      });
    }

    const savedNote = new SavedNote({
      title,
      content,
      noteId,
      url,
    });

    const saved = await savedNote.save();
    console.log("Note saved successfully:", saved._id);
    res.status(201).json(saved);
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

// DELETE saved note
router.delete("/:id", async (req, res) => {
  try {
    console.log("Deleting note:", req.params.id);
    const result = await SavedNote.findByIdAndDelete(req.params.id);

    if (!result) {
      return res.status(404).json({
        error: "Not Found",
        message: "Note not found",
      });
    }

    console.log("Note deleted successfully:", req.params.id);
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

export default router;
