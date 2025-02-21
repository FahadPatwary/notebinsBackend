import mongoose from "mongoose";

const THREE_DAYS_IN_SECONDS = 3 * 24 * 60 * 60; // 3 days in seconds

const savedNoteSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  noteId: {
    type: String,
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + THREE_DAYS_IN_SECONDS * 1000),
    index: { expires: 0 }, // Use TTL index on expiresAt field
  },
  // For efficient storage
  contentLength: {
    type: Number,
    required: true,
    default: function () {
      return this.content.length;
    },
  },
  isCompressed: {
    type: Boolean,
    default: false,
  },
  // Add password protection fields
  password: {
    type: String,
    select: false, // Don't include in default queries
  },
  isPasswordProtected: {
    type: Boolean,
    default: false,
  },
});

// Update timestamps and extend expiration on save
savedNoteSchema.pre("save", function (next) {
  const now = new Date();
  this.updatedAt = now;

  // Extend expiration time by 3 days from the current update time
  this.expiresAt = new Date(now.getTime() + THREE_DAYS_IN_SECONDS * 1000);

  // Set isPasswordProtected based on password presence
  this.isPasswordProtected = !!this.password;

  next();
});

// Index for efficient querying
savedNoteSchema.index({ updatedAt: 1 });
savedNoteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const SavedNote = mongoose.model("SavedNote", savedNoteSchema);
