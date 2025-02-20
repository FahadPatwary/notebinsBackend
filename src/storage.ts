import fs from 'fs';
import path from 'path';

interface Note {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

class Storage {
  private storageFile: string;
  private notes: Map<string, Note>;

  constructor() {
    this.storageFile = path.join(__dirname, '../data/notes.json');
    this.notes = new Map();
    this.loadNotes();
  }

  private loadNotes() {
    try {
      if (!fs.existsSync(path.dirname(this.storageFile))) {
        fs.mkdirSync(path.dirname(this.storageFile), { recursive: true });
      }
      
      if (fs.existsSync(this.storageFile)) {
        const data = fs.readFileSync(this.storageFile, 'utf-8');
        const notesArray = JSON.parse(data);
        this.notes = new Map(notesArray.map((note: Note) => [note.id, {
          ...note,
          createdAt: new Date(note.createdAt),
          updatedAt: new Date(note.updatedAt)
        }]));
      }
    } catch (error) {
      console.error('Error loading notes:', error);
    }
  }

  private saveNotes() {
    try {
      const notesArray = Array.from(this.notes.values());
      fs.writeFileSync(this.storageFile, JSON.stringify(notesArray, null, 2));
    } catch (error) {
      console.error('Error saving notes:', error);
    }
  }

  public get(id: string): Note | undefined {
    return this.notes.get(id);
  }

  public set(id: string, note: Note): void {
    this.notes.set(id, note);
    this.saveNotes();
  }

  public delete(id: string): boolean {
    const deleted = this.notes.delete(id);
    if (deleted) {
      this.saveNotes();
    }
    return deleted;
  }

  public has(id: string): boolean {
    return this.notes.has(id);
  }
}

export const storage = new Storage(); 